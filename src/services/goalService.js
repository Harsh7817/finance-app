const prisma = require('../config/prisma');

/**
 * Service to manage Financial Goals, Contributions, Progress Monitoring, and Goal Analytics.
 * Calculations are strictly deterministic.
 */

/**
 * Helper to calculate months remaining between two dates
 */
const getMonthsRemaining = (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() > from.getUTCDate()) {
    months += 1;
  }
  return Math.max(1, months);
};

/**
 * 8.1 Goal Creation:
 * Create a savings goal with target amount, target date, priority, and optional account linkage.
 */
const createFinancialGoal = async (userId, data) => {
  const {
    name,
    targetAmount,
    targetDate,
    accountId,
    priority = 1,
    notes,
    initialContribution = 0,
  } = data;

  const targetAmt = Number(targetAmount);
  const targetD = new Date(targetDate);
  const now = new Date();

  if (isNaN(targetD.getTime()) || targetD <= now) {
    const error = new Error('targetDate must be a valid future date');
    error.statusCode = 400;
    throw error;
  }

  // Calculate suggested monthly contribution
  const monthsRemaining = getMonthsRemaining(now, targetD);
  const remainingTarget = Math.max(0, targetAmt - Number(initialContribution));
  const suggestedMonthlyContribution = Number((remainingTarget / monthsRemaining).toFixed(2));

  return await prisma.$transaction(async (tx) => {
    // Validate account if specified
    if (accountId) {
      const acc = await tx.financialAccount.findFirst({
        where: { id: accountId, userId, deletedAt: null },
      });
      if (!acc) {
        const error = new Error('Associated financial account not found');
        error.statusCode = 404;
        throw error;
      }
    }

    const goal = await tx.financialGoal.create({
      data: {
        userId,
        accountId: accountId || null,
        name: name.trim(),
        targetAmount: targetAmt,
        cachedCurrentAmount: Number(initialContribution),
        targetDate: targetD,
        monthlyTargetContribution: suggestedMonthlyContribution,
        priority: parseInt(priority, 10) || 1,
        status: Number(initialContribution) >= targetAmt ? 'ACHIEVED' : 'IN_PROGRESS',
        notes: notes || null,
      },
      include: {
        account: {
          select: { id: true, accountName: true, currency: true },
        },
      },
    });

    // Record initial contribution if provided
    if (Number(initialContribution) > 0) {
      await tx.goalContribution.create({
        data: {
          goalId: goal.id,
          userId,
          accountId: accountId || null,
          amount: Number(initialContribution),
          contributionType: 'ALLOCATION',
          contributionDate: new Date(),
          notes: 'Initial starting contribution',
        },
      });
    }

    return goal;
  });
};

/**
 * 8.2 Contributions:
 * Record a deposit/allocation towards a financial goal and update cachedCurrentAmount.
 * Can be linked to an account or transaction.
 */
const recordGoalContribution = async (userId, goalId, data) => {
  const {
    amount,
    contributionType = 'ALLOCATION',
    accountId,
    transactionId,
    contributionDate = new Date(),
    notes,
  } = data;

  const contribAmt = Number(amount);
  if (isNaN(contribAmt) || contribAmt <= 0) {
    const error = new Error('Contribution amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const goal = await tx.financialGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      const error = new Error('Financial goal not found');
      error.statusCode = 404;
      throw error;
    }

    if (goal.status === 'ACHIEVED' || goal.status === 'CANCELLED') {
      const error = new Error(`Cannot add contribution to a goal with status: ${goal.status}`);
      error.statusCode = 400;
      throw error;
    }

    // Record contribution
    const contribution = await tx.goalContribution.create({
      data: {
        goalId: goal.id,
        userId,
        accountId: accountId || goal.accountId || null,
        transactionId: transactionId || null,
        amount: contribAmt,
        contributionType: contributionType.toUpperCase(),
        contributionDate: new Date(contributionDate),
        notes: notes || null,
      },
    });

    // Update Goal accumulated savings
    const newCurrentAmount = Number(goal.cachedCurrentAmount) + contribAmt;
    const isAchieved = newCurrentAmount >= Number(goal.targetAmount);

    const updatedGoal = await tx.financialGoal.update({
      where: { id: goalId },
      data: {
        cachedCurrentAmount: newCurrentAmount,
        status: isAchieved ? 'ACHIEVED' : goal.status,
      },
      include: {
        account: {
          select: { id: true, accountName: true },
        },
      },
    });

    return {
      contribution,
      goal: updatedGoal,
    };
  });
};

/**
 * 8.3 Progress Monitoring:
 * Computes:
 *  - Goal completion percentage
 *  - Remaining amount
 *  - Estimated required periodic (monthly) savings
 *  - Identifies delayed goals (target date passed without reaching target, or pace behind schedule)
 */
const getGoalProgress = (goal) => {
  const target = Number(goal.targetAmount);
  const current = Number(goal.cachedCurrentAmount);
  const remainingAmount = Math.max(0, Number((target - current).toFixed(2)));
  const completionPercentage = target > 0 ? Number(((current / target) * 100).toFixed(2)) : 0;

  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const isPastTargetDate = targetDate < now;

  const monthsRemaining = getMonthsRemaining(now, targetDate);
  const requiredMonthlySavings = !isPastTargetDate && remainingAmount > 0
    ? Number((remainingAmount / monthsRemaining).toFixed(2))
    : remainingAmount;

  // Expected progress benchmark based on elapsed time vs total timeframe
  const createdDate = new Date(goal.createdAt);
  const totalDurationDays = Math.max(1, (targetDate - createdDate) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (now - createdDate) / (1000 * 60 * 60 * 24));
  const expectedPacePct = Math.min(100, (elapsedDays / totalDurationDays) * 100);

  // A goal is delayed if past target date without completion, or completion % is significantly behind elapsed time (> 20% gap)
  const isDelayed = goal.status !== 'ACHIEVED' && (isPastTargetDate || (expectedPacePct - completionPercentage > 20));

  let healthStatus = 'ON_TRACK';
  if (goal.status === 'ACHIEVED') {
    healthStatus = 'COMPLETED';
  } else if (isPastTargetDate) {
    healthStatus = 'OVERDUE';
  } else if (isDelayed) {
    healthStatus = 'BEHIND_PACE';
  }

  return {
    completionPercentage: Math.min(100, completionPercentage),
    remainingAmount,
    requiredMonthlySavings,
    monthsRemaining: isPastTargetDate ? 0 : monthsRemaining,
    isDelayed,
    healthStatus,
  };
};

/**
 * List all user goals with detailed real-time progress monitoring
 */
const listUserGoals = async (userId, options = {}) => {
  const { status } = options;

  const where = { userId };
  if (status) {
    where.status = status.toUpperCase();
  }

  const goals = await prisma.financialGoal.findMany({
    where,
    include: {
      account: {
        select: { id: true, accountName: true, currency: true },
      },
      _count: {
        select: { contributions: true },
      },
    },
    orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }],
  });

  return goals.map((g) => {
    const progress = getGoalProgress(g);
    return {
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.cachedCurrentAmount),
      targetDate: g.targetDate.toISOString().split('T')[0],
      monthlyTargetContribution: Number(g.monthlyTargetContribution),
      priority: g.priority,
      status: g.status,
      account: g.account,
      notes: g.notes,
      contributionCount: g._count.contributions,
      progress,
    };
  });
};

/**
 * Get single goal details and contribution history
 */
const getGoalDetails = async (userId, goalId) => {
  const goal = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
    include: {
      account: {
        select: { id: true, accountName: true, currency: true },
      },
      contributions: {
        orderBy: { contributionDate: 'desc' },
        include: {
          account: { select: { id: true, accountName: true } },
          transaction: { select: { id: true, merchantName: true, amount: true } },
        },
      },
    },
  });

  if (!goal) {
    const error = new Error('Financial goal not found');
    error.statusCode = 404;
    throw error;
  }

  const progress = getGoalProgress(goal);

  return {
    ...goal,
    targetAmount: Number(goal.targetAmount),
    cachedCurrentAmount: Number(goal.cachedCurrentAmount),
    monthlyTargetContribution: Number(goal.monthlyTargetContribution),
    progress,
  };
};

/**
 * 8.4 Goal Analytics:
 * Computes:
 *  - Completed vs. Active goals breakdown
 *  - Total accumulated savings across goals
 *  - Overall goal savings performance & progress rate
 *  - Delayed / overdue goal alerts
 */
const getGoalAnalytics = async (userId) => {
  const allGoals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: { priority: 'asc' },
  });

  let totalTarget = 0;
  let totalSaved = 0;
  let completedCount = 0;
  let activeCount = 0;
  const delayedGoals = [];
  const activeGoalsSummary = [];

  for (const g of allGoals) {
    const target = Number(g.targetAmount);
    const saved = Number(g.cachedCurrentAmount);
    totalTarget += target;
    totalSaved += saved;

    const progress = getGoalProgress(g);

    if (g.status === 'ACHIEVED') {
      completedCount++;
    } else if (g.status === 'IN_PROGRESS') {
      activeCount++;
      activeGoalsSummary.push({
        id: g.id,
        name: g.name,
        targetAmount: target,
        currentAmount: saved,
        completionPercentage: progress.completionPercentage,
        requiredMonthlySavings: progress.requiredMonthlySavings,
        healthStatus: progress.healthStatus,
      });

      if (progress.isDelayed) {
        delayedGoals.push({
          id: g.id,
          name: g.name,
          targetDate: g.targetDate.toISOString().split('T')[0],
          targetAmount: target,
          currentAmount: saved,
          completionPercentage: progress.completionPercentage,
          healthStatus: progress.healthStatus,
        });
      }
    }
  }

  const overallProgressPct = totalTarget > 0 ? Number(((totalSaved / totalTarget) * 100).toFixed(2)) : 0;

  return {
    summary: {
      totalGoals: allGoals.length,
      activeGoals: activeCount,
      completedGoals: completedCount,
      totalTargetAmount: Number(totalTarget.toFixed(2)),
      totalAccumulatedSavings: Number(totalSaved.toFixed(2)),
      overallProgressPercentage: overallProgressPct,
    },
    delayedGoals,
    activeGoalsSummary,
  };
};

/**
 * Update Goal details or status
 */
const updateGoal = async (userId, goalId, updateData) => {
  const goal = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });

  if (!goal) {
    const error = new Error('Financial goal not found');
    error.statusCode = 404;
    throw error;
  }

  const dataToUpdate = {};
  if (updateData.name !== undefined) dataToUpdate.name = updateData.name.trim();
  if (updateData.targetAmount !== undefined) dataToUpdate.targetAmount = Number(updateData.targetAmount);
  if (updateData.targetDate !== undefined) dataToUpdate.targetDate = new Date(updateData.targetDate);
  if (updateData.priority !== undefined) dataToUpdate.priority = parseInt(updateData.priority, 10);
  if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
  if (updateData.status !== undefined) {
    const valid = ['IN_PROGRESS', 'ACHIEVED', 'PAUSED', 'CANCELLED'];
    if (!valid.includes(updateData.status.toUpperCase())) {
      const error = new Error(`Invalid status. Must be one of: ${valid.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    dataToUpdate.status = updateData.status.toUpperCase();
  }

  return await prisma.financialGoal.update({
    where: { id: goalId },
    data: dataToUpdate,
  });
};

/**
 * Delete a Goal
 */
const deleteGoal = async (userId, goalId) => {
  const goal = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });

  if (!goal) {
    const error = new Error('Financial goal not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.financialGoal.delete({
    where: { id: goalId },
  });

  return { id: goalId, deleted: true };
};

module.exports = {
  createFinancialGoal,
  recordGoalContribution,
  listUserGoals,
  getGoalDetails,
  getGoalAnalytics,
  updateGoal,
  deleteGoal,
};

