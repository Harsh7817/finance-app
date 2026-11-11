/**
 * recurringService.js
 * Phase 9 — Recurring Expenditure Management
 *
 * Handles:
 *  9.1 Recurring commitment CRUD
 *  9.2 Automatic pattern detection from transaction history
 *  9.3 Monitoring — upcoming expenses, monthly total, forgotten subscriptions
 */

const prisma = require('../config/prisma');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map CommitmentFrequency enum to approximate number of days between payments.
 */
const FREQUENCY_DAYS = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 91,
  YEARLY: 365,
};

/**
 * Map CommitmentFrequency to monthly multiplier
 * (how many times per month on average).
 */
const FREQUENCY_MONTHLY_FACTOR = {
  DAILY: 30,
  WEEKLY: 4.33,
  MONTHLY: 1,
  QUARTERLY: 0.333,
  YEARLY: 0.0833,
};

/**
 * Classify an average interval (in days) into a CommitmentFrequency.
 * Returns null if it doesn't fit any recognised pattern.
 */
function classifyInterval(avgDays) {
  if (avgDays >= 0.5 && avgDays <= 1.5) return 'DAILY';
  if (avgDays >= 5 && avgDays <= 9) return 'WEEKLY';
  if (avgDays >= 25 && avgDays <= 35) return 'MONTHLY';
  if (avgDays >= 80 && avgDays <= 100) return 'QUARTERLY';
  if (avgDays >= 335 && avgDays <= 395) return 'YEARLY';
  return null;
}

/**
 * Compute a confidence score (0–1) for a detected pattern.
 * Higher score when interval variance is low and amounts are consistent.
 */
function computeConfidence(intervals, amounts) {
  if (intervals.length === 0) return 0;

  // Interval consistency (coefficient of variation)
  const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const intervalVariance =
    intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) /
    intervals.length;
  const intervalCV = avgInterval > 0 ? Math.sqrt(intervalVariance) / avgInterval : 1;

  // Amount consistency (coefficient of variation)
  const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const amountVariance =
    amounts.reduce((s, v) => s + Math.pow(v - avgAmount, 2), 0) / amounts.length;
  const amountCV = avgAmount > 0 ? Math.sqrt(amountVariance) / avgAmount : 1;

  // Confidence: penalise high variance in both dimensions
  const intervalScore = Math.max(0, 1 - intervalCV);
  const amountScore = Math.max(0, 1 - amountCV);
  const raw = (intervalScore * 0.6 + amountScore * 0.4);

  // Bonus for more data points (up to 0.1 extra)
  const dataBonus = Math.min(0.1, (amounts.length - 2) * 0.025);

  return Math.min(1, parseFloat((raw + dataBonus).toFixed(4)));
}

/**
 * Advance a date by one frequency period.
 */
function advanceByFrequency(date, frequency) {
  const d = new Date(date);
  switch (frequency) {
    case 'DAILY':
      d.setDate(d.getDate() + 1);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

// ---------------------------------------------------------------------------
// 9.1 — Recurring Commitment CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new recurring commitment manually.
 */
async function createCommitment(userId, data) {
  const {
    categoryId,
    accountId,
    merchantName,
    expectedAmount,
    frequency,
    nextExpectedDate,
  } = data;

  // Verify category exists
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error('Category not found');

  // Verify account belongs to user (if provided)
  if (accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId, deletedAt: null },
    });
    if (!account) throw new Error('Account not found or does not belong to user');
  }

  const commitment = await prisma.recurringCommitment.create({
    data: {
      userId,
      categoryId,
      accountId: accountId || null,
      merchantName: merchantName.trim(),
      expectedAmount,
      frequency: frequency || 'MONTHLY',
      nextExpectedDate: new Date(nextExpectedDate),
      isUserConfirmed: true, // Manually created → user-confirmed by default
      detectionConfidence: null,
      status: 'ACTIVE',
    },
    include: {
      category: { select: { id: true, name: true, categoryType: true } },
      account: { select: { id: true, accountName: true, institutionName: true } },
    },
  });

  return commitment;
}

/**
 * List recurring commitments for a user with optional filters.
 */
async function listCommitments(userId, filters = {}) {
  const { status, frequency, isUserConfirmed, page = 1, limit = 20 } = filters;

  const where = { userId };
  if (status) where.status = status;
  if (frequency) where.frequency = frequency;
  if (isUserConfirmed !== undefined) where.isUserConfirmed = isUserConfirmed === 'true' || isUserConfirmed === true;

  const skip = (page - 1) * limit;
  const [commitments, total] = await Promise.all([
    prisma.recurringCommitment.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ nextExpectedDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true, categoryType: true, icon: true, colorHex: true } },
        account: { select: { id: true, accountName: true, institutionName: true } },
      },
    }),
    prisma.recurringCommitment.count({ where }),
  ]);

  return {
    commitments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single commitment by ID (must belong to user).
 */
async function getCommitmentById(userId, commitmentId) {
  const commitment = await prisma.recurringCommitment.findFirst({
    where: { id: commitmentId, userId },
    include: {
      category: { select: { id: true, name: true, categoryType: true, icon: true, colorHex: true } },
      account: { select: { id: true, accountName: true, institutionName: true } },
    },
  });
  if (!commitment) throw new Error('Recurring commitment not found');
  return commitment;
}

/**
 * Update a recurring commitment.
 */
async function updateCommitment(userId, commitmentId, updates) {
  const existing = await prisma.recurringCommitment.findFirst({
    where: { id: commitmentId, userId },
  });
  if (!existing) throw new Error('Recurring commitment not found');

  const {
    categoryId,
    accountId,
    merchantName,
    expectedAmount,
    frequency,
    nextExpectedDate,
    status,
    isUserConfirmed,
  } = updates;

  // Validate category if changing
  if (categoryId && categoryId !== existing.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new Error('Category not found');
  }

  // Validate account if changing
  if (accountId !== undefined && accountId !== null && accountId !== existing.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId, deletedAt: null },
    });
    if (!account) throw new Error('Account not found or does not belong to user');
  }

  const updateData = {};
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (accountId !== undefined) updateData.accountId = accountId || null;
  if (merchantName !== undefined) updateData.merchantName = merchantName.trim();
  if (expectedAmount !== undefined) updateData.expectedAmount = expectedAmount;
  if (frequency !== undefined) updateData.frequency = frequency;
  if (nextExpectedDate !== undefined) updateData.nextExpectedDate = new Date(nextExpectedDate);
  if (status !== undefined) updateData.status = status;
  if (isUserConfirmed !== undefined) updateData.isUserConfirmed = isUserConfirmed;

  const updated = await prisma.recurringCommitment.update({
    where: { id: commitmentId },
    data: updateData,
    include: {
      category: { select: { id: true, name: true, categoryType: true, icon: true, colorHex: true } },
      account: { select: { id: true, accountName: true, institutionName: true } },
    },
  });

  return updated;
}

/**
 * Delete (cancel) a recurring commitment.
 */
async function deleteCommitment(userId, commitmentId) {
  const existing = await prisma.recurringCommitment.findFirst({
    where: { id: commitmentId, userId },
  });
  if (!existing) throw new Error('Recurring commitment not found');

  await prisma.recurringCommitment.delete({ where: { id: commitmentId } });
  return { deleted: true, id: commitmentId };
}

/**
 * Confirm a detected (auto-detected) commitment — sets isUserConfirmed=true.
 */
async function confirmCommitment(userId, commitmentId) {
  const existing = await prisma.recurringCommitment.findFirst({
    where: { id: commitmentId, userId },
  });
  if (!existing) throw new Error('Recurring commitment not found');

  const updated = await prisma.recurringCommitment.update({
    where: { id: commitmentId },
    data: { isUserConfirmed: true },
    include: {
      category: { select: { id: true, name: true, categoryType: true } },
      account: { select: { id: true, accountName: true, institutionName: true } },
    },
  });
  return updated;
}

// ---------------------------------------------------------------------------
// 9.2 — Recurring Expense Detection
// ---------------------------------------------------------------------------

/**
 * Analyse the past `lookbackDays` days of DEBIT/FEE transactions for
 * recurring patterns. Creates RecurringCommitment records with
 * isUserConfirmed=false for detected patterns not already tracked.
 *
 * @param {string} userId
 * @param {number} lookbackDays - Default 90
 * @returns {{ detected: number, patterns: Array }}
 */
async function detectRecurringPatterns(userId, lookbackDays = 90) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  // Fetch DEBIT and FEE transactions within the lookback window
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ['DEBIT', 'FEE'] },
      status: { notIn: ['EXCLUDED'] },
      deletedAt: null,
      transactionAt: { gte: since },
    },
    orderBy: { transactionAt: 'asc' },
    select: {
      id: true,
      cleanMerchantName: true,
      merchantName: true,
      amount: true,
      transactionAt: true,
      categoryId: true,
    },
  });

  if (transactions.length === 0) {
    return { detected: 0, patterns: [] };
  }

  // Group by cleanMerchantName
  const groups = {};
  for (const tx of transactions) {
    const key = tx.cleanMerchantName.toLowerCase().trim();
    if (!groups[key]) {
      groups[key] = {
        cleanMerchantName: tx.cleanMerchantName,
        merchantName: tx.merchantName,
        categoryId: tx.categoryId,
        transactions: [],
      };
    }
    groups[key].transactions.push({
      date: new Date(tx.transactionAt),
      amount: parseFloat(tx.amount),
    });
  }

  // Fetch existing commitments to avoid duplicates
  const existingCommitments = await prisma.recurringCommitment.findMany({
    where: { userId },
    select: { merchantName: true },
  });
  const existingMerchants = new Set(
    existingCommitments.map((c) => c.merchantName.toLowerCase().trim())
  );

  const detectedPatterns = [];

  for (const [key, group] of Object.entries(groups)) {
    const txs = group.transactions;

    // Need at least 2 occurrences to detect a pattern
    if (txs.length < 2) continue;

    // Sort by date
    txs.sort((a, b) => a.date - b.date);

    // Compute intervals in days between consecutive transactions
    const intervals = [];
    for (let i = 1; i < txs.length; i++) {
      const diffMs = txs[i].date - txs[i - 1].date;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const frequency = classifyInterval(avgInterval);

    // Skip unrecognised patterns
    if (!frequency) continue;

    const amounts = txs.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const confidence = computeConfidence(intervals, amounts);

    // Skip very low-confidence patterns
    if (confidence < 0.3) continue;

    // Skip if already tracked
    if (existingMerchants.has(key)) continue;

    // Compute next expected date by advancing from the last transaction
    const lastDate = txs[txs.length - 1].date;
    const nextExpectedDate = advanceByFrequency(lastDate, frequency);

    // Create the commitment record (isUserConfirmed=false)
    try {
      const commitment = await prisma.recurringCommitment.create({
        data: {
          userId,
          categoryId: group.categoryId,
          merchantName: group.merchantName,
          expectedAmount: parseFloat(avgAmount.toFixed(2)),
          frequency,
          nextExpectedDate,
          detectionConfidence: confidence,
          isUserConfirmed: false,
          status: 'ACTIVE',
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      detectedPatterns.push({
        id: commitment.id,
        merchantName: commitment.merchantName,
        frequency: commitment.frequency,
        expectedAmount: commitment.expectedAmount,
        nextExpectedDate: commitment.nextExpectedDate,
        detectionConfidence: commitment.detectionConfidence,
        occurrenceCount: txs.length,
        avgIntervalDays: parseFloat(avgInterval.toFixed(1)),
        category: commitment.category,
      });

      // Add to existing set to avoid double-detection in same run
      existingMerchants.add(key);
    } catch {
      // Skip if creation fails (e.g., race condition)
    }
  }

  return {
    detected: detectedPatterns.length,
    patterns: detectedPatterns,
  };
}

// ---------------------------------------------------------------------------
// 9.3 — Monitoring
// ---------------------------------------------------------------------------

/**
 * Get upcoming recurring expenses due within the next `days` days.
 * Default: 30 days.
 */
async function getUpcomingExpenses(userId, days = 30) {
  const now = new Date();
  const until = new Date();
  until.setDate(until.getDate() + days);

  const commitments = await prisma.recurringCommitment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      nextExpectedDate: { gte: now, lte: until },
    },
    orderBy: { nextExpectedDate: 'asc' },
    include: {
      category: { select: { id: true, name: true, icon: true, colorHex: true } },
      account: { select: { id: true, accountName: true, institutionName: true } },
    },
  });

  const totalExpected = commitments.reduce(
    (sum, c) => sum + parseFloat(c.expectedAmount),
    0
  );

  return {
    upcomingDays: days,
    count: commitments.length,
    totalExpectedAmount: parseFloat(totalExpected.toFixed(2)),
    commitments,
  };
}

/**
 * Calculate total monthly recurring expenditure.
 * Normalises all active commitments to a monthly equivalent.
 */
async function getMonthlyRecurringTotal(userId) {
  const commitments = await prisma.recurringCommitment.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      category: { select: { id: true, name: true, icon: true, colorHex: true } },
    },
  });

  let monthlyTotal = 0;
  const breakdown = [];

  for (const c of commitments) {
    const factor = FREQUENCY_MONTHLY_FACTOR[c.frequency] || 1;
    const monthlyAmount = parseFloat(c.expectedAmount) * factor;
    monthlyTotal += monthlyAmount;

    breakdown.push({
      id: c.id,
      merchantName: c.merchantName,
      frequency: c.frequency,
      expectedAmount: parseFloat(c.expectedAmount),
      monthlyEquivalent: parseFloat(monthlyAmount.toFixed(2)),
      isUserConfirmed: c.isUserConfirmed,
      category: c.category,
    });
  }

  // Sort breakdown by monthly equivalent descending
  breakdown.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);

  return {
    totalMonthlyRecurring: parseFloat(monthlyTotal.toFixed(2)),
    totalCommitments: commitments.length,
    breakdown,
  };
}

/**
 * Get potentially forgotten subscriptions:
 *   - Auto-detected (isUserConfirmed=false)
 *   - High detection confidence (>= 0.6)
 *   - Status ACTIVE
 *
 * Also highlights commitments with significantly changed amounts
 * by comparing expected amount with the most recent transaction amount.
 */
async function getSubscriptionAlerts(userId) {
  // 1. Unconfirmed high-confidence subscriptions
  const unconfirmed = await prisma.recurringCommitment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      isUserConfirmed: false,
      detectionConfidence: { gte: 0.6 },
    },
    orderBy: { detectionConfidence: 'desc' },
    include: {
      category: { select: { id: true, name: true, icon: true, colorHex: true } },
      account: { select: { id: true, accountName: true, institutionName: true } },
    },
  });

  // 2. Amount-changed commitments:
  //    Get recent transactions for each ACTIVE commitment and compare amount
  const activeCommitments = await prisma.recurringCommitment.findMany({
    where: { userId, status: 'ACTIVE', isUserConfirmed: true },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  const amountChanges = [];
  for (const c of activeCommitments) {
    const recentTx = await prisma.transaction.findFirst({
      where: {
        userId,
        cleanMerchantName: { equals: c.merchantName, mode: 'insensitive' },
        type: { in: ['DEBIT', 'FEE'] },
        deletedAt: null,
      },
      orderBy: { transactionAt: 'desc' },
      select: { amount: true, transactionAt: true },
    });

    if (!recentTx) continue;

    const expected = parseFloat(c.expectedAmount);
    const actual = parseFloat(recentTx.amount);
    const pctChange = expected > 0 ? Math.abs((actual - expected) / expected) * 100 : 0;

    // Flag if amount changed by more than 15%
    if (pctChange > 15) {
      amountChanges.push({
        id: c.id,
        merchantName: c.merchantName,
        frequency: c.frequency,
        expectedAmount: expected,
        recentActualAmount: actual,
        percentageChange: parseFloat(pctChange.toFixed(1)),
        lastSeenAt: recentTx.transactionAt,
        category: c.category,
      });
    }
  }

  return {
    potentiallyForgottenSubscriptions: {
      count: unconfirmed.length,
      items: unconfirmed,
    },
    amountChangedCommitments: {
      count: amountChanges.length,
      items: amountChanges,
    },
  };
}

module.exports = {
  createCommitment,
  listCommitments,
  getCommitmentById,
  updateCommitment,
  deleteCommitment,
  confirmCommitment,
  detectRecurringPatterns,
  getUpcomingExpenses,
  getMonthlyRecurringTotal,
  getSubscriptionAlerts,
};

