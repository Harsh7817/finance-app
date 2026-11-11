const prisma = require('../config/prisma');

/**
 * Service to manage Budgets, Tracking, Alert Triggers, and Historical Budget Analytics.
 * Calculations are strictly deterministic.
 */

/**
 * Helper to compute period start and end dates based on periodType
 */
const computeBudgetPeriodDates = (periodType, customStart, customEnd) => {
  const now = new Date();

  if (periodType === 'CUSTOM') {
    if (!customStart || !customEnd) {
      const error = new Error('periodStart and periodEnd are required for CUSTOM budgets');
      error.statusCode = 400;
      throw error;
    }
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      const error = new Error('Invalid custom date range');
      error.statusCode = 400;
      throw error;
    }
    return { periodStart: start, periodEnd: end };
  }

  if (periodType === 'WEEKLY') {
    const curDay = now.getUTCDay();
    const diff = now.getUTCDate() - curDay + (curDay === 0 ? -6 : 1); // Monday
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff + 6, 23, 59, 59, 999));
    return { periodStart: start, periodEnd: end };
  }

  // MONTHLY (Default)
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { periodStart: start, periodEnd: end };
};

/**
 * 7.1 Budget Creation:
 * Create monthly, weekly, category-specific, or overall spending limit budgets.
 */
const createBudget = async (userId, data) => {
  const {
    name,
    categoryId, // null indicates overall spending limit budget
    limitAmount,
    periodType = 'MONTHLY',
    periodStart,
    periodEnd,
    warningThresholdPct = 80,
  } = data;

  // Validate category if provided
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: null }, { userId }],
        isActive: true,
      },
    });
    if (!category) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const { periodStart: start, periodEnd: end } = computeBudgetPeriodDates(
    periodType.toUpperCase(),
    periodStart,
    periodEnd
  );

  const budget = await prisma.budget.create({
    data: {
      userId,
      name: name.trim(),
      categoryId: categoryId || null,
      limitAmount: Number(limitAmount),
      periodType: periodType.toUpperCase(),
      periodStart: start,
      periodEnd: end,
      warningThresholdPct: Math.min(100, Math.max(1, parseInt(warningThresholdPct, 10) || 80)),
      status: 'ACTIVE',
    },
    include: {
      category: {
        select: { id: true, name: true, colorHex: true, icon: true },
      },
    },
  });

  return budget;
};

/**
 * Helper to calculate actual expenditure for a budget and period
 */
const calculateBudgetSpending = async (userId, budget) => {
  const where = {
    userId,
    deletedAt: null,
    status: { in: ['POSTED', 'RECONCILED'] },
    type: { in: ['DEBIT', 'FEE'] },
    transactionAt: {
      gte: budget.periodStart,
      lte: budget.periodEnd,
    },
  };

  // If category-specific budget, filter by category
  if (budget.categoryId) {
    where.categoryId = budget.categoryId;
  }

  const result = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const actualExpenditure = Number(result._sum.amount || 0);
  const limit = Number(budget.limitAmount);
  const remainingBudget = Number((limit - actualExpenditure).toFixed(2));
  const utilizationPct = limit > 0 ? Number(((actualExpenditure / limit) * 100).toFixed(2)) : 0;

  // Alert State Evaluation
  let alertStatus = 'NORMAL';
  if (utilizationPct >= 100) {
    alertStatus = utilizationPct > 100 ? 'EXCEEDED' : 'REACHED';
  } else if (utilizationPct >= budget.warningThresholdPct) {
    alertStatus = 'APPROACHING_LIMIT';
  }

  return {
    actualExpenditure: Number(actualExpenditure.toFixed(2)),
    remainingBudget,
    utilizationPercentage: utilizationPct,
    transactionCount: result._count.id,
    alertStatus,
    isOverspent: actualExpenditure > limit,
    overspentAmount: actualExpenditure > limit ? Number((actualExpenditure - limit).toFixed(2)) : 0,
  };
};

/**
 * 7.2 Budget Tracking:
 * Track spending, calculate actual expenditure, remaining budget, and utilization for active budgets.
 */
const getBudgetTracking = async (userId, options = {}) => {
  const { status = 'ACTIVE' } = options;

  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      ...(status && { status: status.toUpperCase() }),
    },
    include: {
      category: {
        select: { id: true, name: true, colorHex: true, icon: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const trackedBudgets = await Promise.all(
    budgets.map(async (b) => {
      const stats = await calculateBudgetSpending(userId, b);
      return {
        id: b.id,
        name: b.name,
        periodType: b.periodType,
        periodStart: b.periodStart.toISOString().split('T')[0],
        periodEnd: b.periodEnd.toISOString().split('T')[0],
        limitAmount: Number(b.limitAmount),
        warningThresholdPct: b.warningThresholdPct,
        status: b.status,
        category: b.category,
        isOverallBudget: !b.categoryId,
        tracking: stats,
      };
    })
  );

  return trackedBudgets;
};

/**
 * 7.3 Budget Alerts Check & Notification Dispatch:
 * Evaluates active budgets, identifies approaching/breached/exceeded budgets,
 * and creates in-app notification records for warnings or breaches.
 */
const checkBudgetAlerts = async (userId) => {
  const tracked = await getBudgetTracking(userId, { status: 'ACTIVE' });
  const alerts = [];

  for (const b of tracked) {
    const { alertStatus, utilizationPercentage, actualExpenditure, remainingBudget, overspentAmount } = b.tracking;

    if (alertStatus !== 'NORMAL') {
      const isBreached = alertStatus === 'EXCEEDED' || alertStatus === 'REACHED';
      const notificationType = isBreached ? 'BUDGET_BREACH' : 'BUDGET_WARNING';
      const targetLabel = b.category ? `category "${b.category.name}"` : 'overall spending';

      const title = isBreached
        ? `Budget Breached: ${b.name}`
        : `Budget Warning: ${b.name}`;

      const message = isBreached
        ? `You have reached ${utilizationPercentage}% of your budget for ${targetLabel} (Spent: ₹${actualExpenditure} / Limit: ₹${b.limitAmount}).`
        : `You have used ${utilizationPercentage}% of your budget for ${targetLabel}. Remaining: ₹${remainingBudget}.`;

      // Check if alert already generated today to prevent spamming notifications
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId,
          notificationType,
          title,
          createdAt: { gte: todayStart },
        },
      });

      if (!existingNotif) {
        await prisma.notification.create({
          data: {
            userId,
            notificationType,
            title,
            message,
            payload: {
              budgetId: b.id,
              budgetName: b.name,
              limitAmount: b.limitAmount,
              actualExpenditure,
              utilizationPercentage,
              overspentAmount,
            },
          },
        });
      }

      alerts.push({
        budgetId: b.id,
        budgetName: b.name,
        category: b.category?.name || 'Overall',
        alertStatus,
        utilizationPercentage,
        actualExpenditure,
        limitAmount: b.limitAmount,
        message,
      });
    }
  }

  return alerts;
};

/**
 * 7.4 Budget Analytics:
 *  - Planned vs. Actual spending comparison
 *  - Historical budget performance
 *  - Identifies frequently exceeded categories
 */
const getBudgetAnalytics = async (userId) => {
  const allBudgets = await prisma.budget.findMany({
    where: { userId },
    include: {
      category: {
        select: { id: true, name: true, colorHex: true },
      },
    },
    orderBy: { periodStart: 'desc' },
  });

  const performances = await Promise.all(
    allBudgets.map(async (b) => {
      const stats = await calculateBudgetSpending(userId, b);
      return {
        budgetId: b.id,
        name: b.name,
        categoryName: b.category?.name || 'Overall',
        periodType: b.periodType,
        period: `${b.periodStart.toISOString().split('T')[0]} to ${b.periodEnd.toISOString().split('T')[0]}`,
        plannedLimit: Number(b.limitAmount),
        actualSpent: stats.actualExpenditure,
        difference: Number((stats.actualExpenditure - Number(b.limitAmount)).toFixed(2)),
        utilizationPercentage: stats.utilizationPercentage,
        status: b.status,
        isOverspent: stats.isOverspent,
      };
    })
  );

  // Identify frequently exceeded categories
  const categoryBreachMap = new Map();
  for (const p of performances) {
    if (p.isOverspent && p.categoryName !== 'Overall') {
      const count = categoryBreachMap.get(p.categoryName) || 0;
      categoryBreachMap.set(p.categoryName, count + 1);
    }
  }

  const frequentlyExceededCategories = Array.from(categoryBreachMap.entries())
    .map(([categoryName, breachCount]) => ({
      categoryName,
      breachCount,
    }))
    .sort((a, b) => b.breachCount - a.breachCount);

  return {
    budgetPerformances: performances,
    frequentlyExceededCategories,
  };
};

/**
 * Update budget limit, name, or status (PAUSED / ARCHIVED / ACTIVE)
 */
const updateBudget = async (userId, budgetId, updateData) => {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });

  if (!budget) {
    const error = new Error('Budget not found');
    error.statusCode = 404;
    throw error;
  }

  const dataToUpdate = {};
  if (updateData.name !== undefined) dataToUpdate.name = updateData.name.trim();
  if (updateData.limitAmount !== undefined) dataToUpdate.limitAmount = Number(updateData.limitAmount);
  if (updateData.warningThresholdPct !== undefined) {
    dataToUpdate.warningThresholdPct = Math.min(100, Math.max(1, parseInt(updateData.warningThresholdPct, 10)));
  }
  if (updateData.status !== undefined) {
    const valid = ['ACTIVE', 'PAUSED', 'ARCHIVED'];
    if (!valid.includes(updateData.status.toUpperCase())) {
      const error = new Error(`Invalid status. Must be one of: ${valid.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    dataToUpdate.status = updateData.status.toUpperCase();
  }

  return await prisma.budget.update({
    where: { id: budgetId },
    data: dataToUpdate,
    include: {
      category: { select: { id: true, name: true } },
    },
  });
};

/**
 * Delete budget
 */
const deleteBudget = async (userId, budgetId) => {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
  });

  if (!budget) {
    const error = new Error('Budget not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.budget.delete({
    where: { id: budgetId },
  });

  return { id: budgetId, deleted: true };
};

module.exports = {
  createBudget,
  getBudgetTracking,
  checkBudgetAlerts,
  getBudgetAnalytics,
  updateBudget,
  deleteBudget,
};

