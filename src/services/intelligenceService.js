/**
 * intelligenceService.js
 * Phase 10 — Financial Intelligence and Prediction Engine
 *
 * Implements deterministic financial intelligence:
 *  10.1 Spending Analysis: patterns, velocity, category rankings, surges, frequent merchants
 *  10.2 Financial Forecasting: month-end projection, run-rate burn extrapolation, future balance
 *  10.3 Financial Health Analysis: 0-100 composite index across 5 distinct financial pillars
 *  10.4 Anomaly Detection: statistical outliers (Z-score / IQR), daily surges, unexpected high tickets
 *  10.5 Prediction Evaluation: persistence in `Prediction` model, MAPE calculation, accuracy metrics
 */

const prisma = require('../config/prisma');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates Mean and Standard Deviation for an array of numbers
 */
function calculateStats(values) {
  if (!values || values.length === 0) return { mean: 0, stdDev: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;

  const variance =
    sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return { mean, stdDev, median };
}

/**
 * Get date boundaries for lookback periods
 */
function getLookbackDates(days = 30) {
  const now = new Date();
  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);

  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days);

  return { currentStart, currentEnd, previousStart, previousEnd, days };
}

// ---------------------------------------------------------------------------
// 10.1 Spending Analysis
// ---------------------------------------------------------------------------

/**
 * Analyzes spending patterns, burn rates, category rankings, and merchant frequencies.
 */
async function getSpendingPatterns(userId, options = {}) {
  const days = parseInt(options.lookbackDays, 10) || 30;
  const { currentStart, currentEnd, previousStart, previousEnd } = getLookbackDates(days);

  // Fetch current period debit transactions
  const currentTxns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: { gte: currentStart, lte: currentEnd },
    },
    include: {
      category: { select: { id: true, name: true, colorHex: true, icon: true } },
    },
    orderBy: { transactionAt: 'desc' },
  });

  // Fetch previous period debit transactions for trend comparison
  const previousTxns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: { gte: previousStart, lte: previousEnd },
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  const currentTotal = currentTxns.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const previousTotal = previousTxns.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const spendingChangePct =
    previousTotal > 0
      ? Number((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(2))
      : 0;

  // Velocity metrics
  const avgDailySpend = Number((currentTotal / days).toFixed(2));
  const avgWeeklySpend = Number((avgDailySpend * 7).toFixed(2));
  const avgTicketSize =
    currentTxns.length > 0 ? Number((currentTotal / currentTxns.length).toFixed(2)) : 0;

  // Group by category for current period
  const categoryMap = new Map();
  for (const tx of currentTxns) {
    const catId = tx.category.id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        categoryId: catId,
        categoryName: tx.category.name,
        colorHex: tx.category.colorHex,
        icon: tx.category.icon,
        totalAmount: 0,
        transactionCount: 0,
      });
    }
    const cat = categoryMap.get(catId);
    cat.totalAmount += Number(tx.amount);
    cat.transactionCount += 1;
  }

  // Group by category for previous period
  const prevCategoryMap = new Map();
  for (const tx of previousTxns) {
    const catId = tx.category.id;
    prevCategoryMap.set(catId, (prevCategoryMap.get(catId) || 0) + Number(tx.amount));
  }

  // Build ranked categories with changes
  const categoryBreakdown = Array.from(categoryMap.values())
    .map((cat) => {
      const prevAmount = prevCategoryMap.get(cat.categoryId) || 0;
      const changePct =
        prevAmount > 0
          ? Number((((cat.totalAmount - prevAmount) / prevAmount) * 100).toFixed(2))
          : null;
      const shareOfTotal =
        currentTotal > 0 ? Number(((cat.totalAmount / currentTotal) * 100).toFixed(2)) : 0;

      return {
        ...cat,
        totalAmount: Number(cat.totalAmount.toFixed(2)),
        previousPeriodAmount: Number(prevAmount.toFixed(2)),
        shareOfTotalPct: shareOfTotal,
        changePercentage: changePct,
        unusualIncrease: changePct !== null && changePct > 25 && cat.totalAmount > 500,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Group by merchant
  const merchantMap = new Map();
  for (const tx of currentTxns) {
    const name = tx.cleanMerchantName || tx.merchantName || 'Unknown Merchant';
    if (!merchantMap.has(name)) {
      merchantMap.set(name, {
        merchantName: name,
        totalSpent: 0,
        visitCount: 0,
        lastTransactionAt: tx.transactionAt,
      });
    }
    const m = merchantMap.get(name);
    m.totalSpent += Number(tx.amount);
    m.visitCount += 1;
    if (new Date(tx.transactionAt) > new Date(m.lastTransactionAt)) {
      m.lastTransactionAt = tx.transactionAt;
    }
  }

  const frequentMerchants = Array.from(merchantMap.values())
    .map((m) => ({
      ...m,
      totalSpent: Number(m.totalSpent.toFixed(2)),
      averageSpend: Number((m.totalSpent / m.visitCount).toFixed(2)),
    }))
    .sort((a, b) => b.visitCount - a.visitCount || b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // Day of week distribution (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayDistribution = dayNames.map((name) => ({ day: name, totalSpent: 0, txCount: 0 }));
  for (const tx of currentTxns) {
    const dayIndex = new Date(tx.transactionAt).getUTCDay();
    dayDistribution[dayIndex].totalSpent += Number(tx.amount);
    dayDistribution[dayIndex].txCount += 1;
  }
  dayDistribution.forEach((d) => {
    d.totalSpent = Number(d.totalSpent.toFixed(2));
  });

  return {
    lookbackDays: days,
    period: {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    },
    summary: {
      totalExpenditure: Number(currentTotal.toFixed(2)),
      previousTotalExpenditure: Number(previousTotal.toFixed(2)),
      spendingChangePercentage: spendingChangePct,
      transactionCount: currentTxns.length,
      averageDailySpend: avgDailySpend,
      averageWeeklySpend: avgWeeklySpend,
      averageTicketSize: avgTicketSize,
    },
    highExpenditureCategories: categoryBreakdown,
    frequentMerchants,
    dayOfWeekDistribution: dayDistribution,
  };
}

// ---------------------------------------------------------------------------
// 10.2 Financial Forecasting
// ---------------------------------------------------------------------------

/**
 * Deterministic month-end expense forecasting and balance projection.
 */
async function getFinancialForecast(userId, options = {}) {
  const now = new Date();
  const year = options.year ? parseInt(options.year, 10) : now.getUTCFullYear();
  const month = options.month ? parseInt(options.month, 10) - 1 : now.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const totalDaysInMonth = monthEnd.getUTCDate();

  // Determine current day relative to evaluated month
  let daysElapsed;
  if (now > monthEnd) {
    daysElapsed = totalDaysInMonth;
  } else if (now < monthStart) {
    daysElapsed = 0;
  } else {
    daysElapsed = Math.max(1, now.getUTCDate());
  }
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

  // 1. Fetch Month-to-Date (MTD) settled expenditures
  const mtdTxns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: { gte: monthStart, lte: now > monthEnd ? monthEnd : now },
    },
    include: {
      category: { select: { id: true, name: true, colorHex: true } },
    },
  });

  const mtdExpenditure = mtdTxns.reduce((sum, tx) => sum + Number(tx.amount), 0);

  // 2. Fetch Historical 60-day baseline for weighted burn rate
  const baselineStart = new Date(monthStart);
  baselineStart.setDate(baselineStart.getDate() - 60);

  const baselineTxns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: { gte: baselineStart, lt: monthStart },
    },
  });

  const baselineTotal = baselineTxns.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const baselineDailyRate = baselineTotal > 0 ? baselineTotal / 60 : 0;

  // 3. Compute Blended Daily Burn Rate
  const mtdDailyRate = daysElapsed > 0 ? mtdExpenditure / daysElapsed : baselineDailyRate;
  const weightMtd = Math.min(0.85, 0.4 + (daysElapsed / totalDaysInMonth) * 0.45);
  const weightBaseline = 1 - weightMtd;
  const blendedDailyBurnRate =
    baselineDailyRate > 0 ? mtdDailyRate * weightMtd + baselineDailyRate * weightBaseline : mtdDailyRate;

  // 4. Committed upcoming recurring obligations before month end
  const upcomingRecurring = await prisma.recurringCommitment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      nextExpectedDate: {
        gte: now,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      merchantName: true,
      expectedAmount: true,
      nextExpectedDate: true,
    },
  });

  const committedUpcoming = upcomingRecurring.reduce(
    (sum, r) => sum + Number(r.expectedAmount),
    0
  );

  // 5. Total Project Month-End Spend
  const projectedVariableRemaining = blendedDailyBurnRate * daysRemaining;
  const projectedMonthEndTotal = Number(
    (mtdExpenditure + committedUpcoming + projectedVariableRemaining).toFixed(2)
  );

  // 6. Category-level forecasting
  const catMtdMap = new Map();
  for (const tx of mtdTxns) {
    const catId = tx.category.id;
    if (!catMtdMap.has(catId)) {
      catMtdMap.set(catId, {
        categoryId: catId,
        categoryName: tx.category.name,
        colorHex: tx.category.colorHex,
        mtdAmount: 0,
      });
    }
    catMtdMap.get(catId).mtdAmount += Number(tx.amount);
  }

  const categoryForecasts = Array.from(catMtdMap.values()).map((c) => {
    const catMtd = c.mtdAmount;
    const catDaily = daysElapsed > 0 ? catMtd / daysElapsed : 0;
    const catProjected = daysRemaining > 0 ? catMtd + catDaily * daysRemaining : catMtd;
    return {
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      colorHex: c.colorHex,
      mtdAmount: Number(catMtd.toFixed(2)),
      projectedMonthEndAmount: Number(catProjected.toFixed(2)),
    };
  });

  // 7. Balance and Income projections
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, deletedAt: null },
    select: { cachedBalance: true },
  });
  const currentTotalBalance = accounts.reduce((sum, a) => sum + Number(a.cachedBalance), 0);

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { monthlyStatedIncome: true },
  });
  const statedIncome = userProfile ? Number(userProfile.monthlyStatedIncome) : 0;

  // MTD Income received
  const mtdIncomeTxns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['CREDIT', 'REFUND'] },
      transactionAt: { gte: monthStart, lte: monthEnd },
    },
  });
  const mtdIncome = mtdIncomeTxns.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const remainingExpectedIncome = Math.max(0, statedIncome - mtdIncome);

  const projectedRemainingExpenditure = committedUpcoming + projectedVariableRemaining;
  const projectedMonthEndBalance = Number(
    (currentTotalBalance + remainingExpectedIncome - projectedRemainingExpenditure).toFixed(2)
  );

  // Confidence Score: more days elapsed and baseline history = higher confidence (0.4 - 0.95)
  const confidenceScore = Number(
    Math.min(0.95, 0.45 + (daysElapsed / totalDaysInMonth) * 0.4 + (baselineTxns.length > 5 ? 0.1 : 0)).toFixed(4)
  );

  // Budget Deviation Risk Assessment
  const activeBudgets = await prisma.budget.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      periodStart: { lte: monthEnd },
      periodEnd: { gte: monthStart },
    },
  });

  let budgetDeviationRisk = false;
  let overallBudgetLimit = 0;
  for (const b of activeBudgets) {
    if (!b.categoryId) {
      overallBudgetLimit = Number(b.limitAmount);
      if (projectedMonthEndTotal > overallBudgetLimit) {
        budgetDeviationRisk = true;
      }
    }
  }

  const riskProbability = budgetDeviationRisk
    ? Number(Math.min(0.95, (projectedMonthEndTotal - overallBudgetLimit) / (overallBudgetLimit || 1) + 0.5).toFixed(4))
    : 0.15;

  return {
    forecastMonth: `${year}-${String(month + 1).padStart(2, '0')}`,
    period: {
      start: monthStart,
      end: monthEnd,
      totalDays: totalDaysInMonth,
      daysElapsed,
      daysRemaining,
    },
    actualToDate: {
      mtdExpenditure: Number(mtdExpenditure.toFixed(2)),
      mtdIncome: Number(mtdIncome.toFixed(2)),
      currentTotalBalance: Number(currentTotalBalance.toFixed(2)),
      averageDailyBurnRate: Number(mtdDailyRate.toFixed(2)),
    },
    projection: {
      blendedDailyBurnRate: Number(blendedDailyBurnRate.toFixed(2)),
      upcomingCommittedExpenditure: Number(committedUpcoming.toFixed(2)),
      projectedVariableRemaining: Number(projectedVariableRemaining.toFixed(2)),
      projectedMonthEndExpenditure: projectedMonthEndTotal,
      projectedMonthEndBalance,
      projectedNetSavings: Number((statedIncome > 0 ? statedIncome - projectedMonthEndTotal : mtdIncome - projectedMonthEndTotal).toFixed(2)),
      confidenceScore,
      riskProbability,
      budgetDeviationRisk,
    },
    categoryForecasts,
    upcomingCommitmentsCount: upcomingRecurring.length,
  };
}

// ---------------------------------------------------------------------------
// 10.3 Financial Health Analysis
// ---------------------------------------------------------------------------

/**
 * Computes comprehensive Financial Health Index (0-100) across 5 core financial pillars.
 */
async function getFinancialHealth(userId) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. User profile for stated income & target savings %
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  const statedIncome = profile ? Number(profile.monthlyStatedIncome) : 0;
  const targetSavingsPct = profile ? Number(profile.savingsTargetPercentage) : 20.0;

  // 2. Fetch past 30 days transactions
  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      transactionAt: { gte: thirtyDaysAgo, lte: now },
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of txns) {
    const amt = Number(tx.amount);
    if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
      totalIncome += amt;
    } else if (tx.type === 'DEBIT' || tx.type === 'FEE') {
      totalExpense += amt;
    }
  }

  const effectiveIncome = Math.max(totalIncome, statedIncome);
  const netSavings = effectiveIncome - totalExpense;
  const actualSavingsRatePct =
    effectiveIncome > 0 ? Number(((netSavings / effectiveIncome) * 100).toFixed(2)) : 0;

  // --- PILLAR 1: Savings Rate (0–20 pts) ---
  let savingsRateScore = 0;
  if (actualSavingsRatePct >= targetSavingsPct) {
    savingsRateScore = 20;
  } else if (actualSavingsRatePct > 0) {
    savingsRateScore = Number(((actualSavingsRatePct / targetSavingsPct) * 20).toFixed(1));
  } else {
    savingsRateScore = 0; // Negative net savings
  }

  // --- PILLAR 2: Income-to-Expense Ratio (0–20 pts) ---
  const incomeExpenseRatio =
    totalExpense > 0 ? Number((effectiveIncome / totalExpense).toFixed(2)) : effectiveIncome > 0 ? 3.0 : 1.0;

  let ratioScore = 0;
  if (incomeExpenseRatio >= 1.5) ratioScore = 20;
  else if (incomeExpenseRatio >= 1.25) ratioScore = 17;
  else if (incomeExpenseRatio >= 1.1) ratioScore = 14;
  else if (incomeExpenseRatio >= 1.0) ratioScore = 10;
  else if (incomeExpenseRatio >= 0.8) ratioScore = 5;
  else ratioScore = 0;

  // --- PILLAR 3: Budget Adherence (0–20 pts) ---
  const activeBudgets = await prisma.budget.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
    include: { category: true },
  });

  let budgetScore = 20;
  let budgetsTracked = activeBudgets.length;
  let breachedBudgets = 0;

  if (budgetsTracked > 0) {
    for (const b of activeBudgets) {
      const budgetStart = new Date(b.periodStart);
      const budgetEnd = new Date(b.periodEnd);
      const whereTx = {
        userId,
        deletedAt: null,
        status: { in: ['POSTED', 'RECONCILED'] },
        type: { in: ['DEBIT', 'FEE'] },
        transactionAt: { gte: budgetStart, lte: budgetEnd },
      };
      if (b.categoryId) whereTx.categoryId = b.categoryId;

      const spentSum = await prisma.transaction.aggregate({
        where: whereTx,
        _sum: { amount: true },
      });
      const spent = Number(spentSum._sum.amount || 0);
      const limit = Number(b.limitAmount);

      if (spent > limit) {
        breachedBudgets += 1;
      }
    }
    budgetScore = Math.max(0, 20 - breachedBudgets * 6);
  } else {
    budgetScore = 15; // Neutral baseline when no budgets configured
  }

  // --- PILLAR 4: Recurring Obligation Burden (0–20 pts) ---
  const recurringCommitments = await prisma.recurringCommitment.findMany({
    where: { userId, status: 'ACTIVE' },
  });

  const monthlyRecurringTotal = recurringCommitments.reduce((sum, r) => {
    const amt = Number(r.expectedAmount);
    switch (r.frequency) {
      case 'DAILY': return sum + amt * 30;
      case 'WEEKLY': return sum + amt * 4.33;
      case 'QUARTERLY': return sum + amt / 3;
      case 'YEARLY': return sum + amt / 12;
      case 'MONTHLY':
      default: return sum + amt;
    }
  }, 0);

  const recurringBurdenPct =
    effectiveIncome > 0 ? Number(((monthlyRecurringTotal / effectiveIncome) * 100).toFixed(2)) : 0;

  let recurringScore = 20;
  if (recurringBurdenPct <= 30) recurringScore = 20;
  else if (recurringBurdenPct <= 45) recurringScore = 15;
  else if (recurringBurdenPct <= 60) recurringScore = 10;
  else recurringScore = 5;

  // --- PILLAR 5: Financial Goal Progress (0–20 pts) ---
  const activeGoals = await prisma.financialGoal.findMany({
    where: { userId, status: 'IN_PROGRESS' },
  });

  let goalScore = 20;
  if (activeGoals.length > 0) {
    let totalProgressPct = 0;
    for (const g of activeGoals) {
      const target = Number(g.targetAmount);
      const current = Number(g.cachedCurrentAmount);
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      totalProgressPct += pct;
    }
    const avgGoalProgress = totalProgressPct / activeGoals.length;
    goalScore = Number(Math.min(20, Math.max(5, (avgGoalProgress / 100) * 20)).toFixed(1));
  } else {
    goalScore = 14; // Neutral baseline
  }

  // Calculate Overall Composite Score (0-100)
  const overallScore = Math.min(
    100,
    Math.max(0, Math.round(savingsRateScore + ratioScore + budgetScore + recurringScore + goalScore))
  );

  let rating = 'FAIR';
  if (overallScore >= 80) rating = 'EXCELLENT';
  else if (overallScore >= 65) rating = 'GOOD';
  else if (overallScore >= 50) rating = 'FAIR';
  else rating = 'NEEDS_ATTENTION';

  // Build Diagnostic Insights
  const recommendations = [];
  if (savingsRateScore < 14) {
    recommendations.push(
      `Your current savings rate is ${actualSavingsRatePct}%, below your target of ${targetSavingsPct}%. Focus on reducing non-essential expenditures.`
    );
  }
  if (ratioScore < 12) {
    recommendations.push(
      `Your spending represents ${(100 / (incomeExpenseRatio || 1)).toFixed(0)}% of your income. Aim to maintain an income-to-expense ratio above 1.25.`
    );
  }
  if (breachedBudgets > 0) {
    recommendations.push(
      `${breachedBudgets} active budget(s) have exceeded their planned limits this period.`
    );
  }
  if (recurringBurdenPct > 45) {
    recommendations.push(
      `Fixed recurring commitments account for ${recurringBurdenPct}% of your monthly income. Audit forgotten subscriptions to free up liquidity.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Strong financial posture across all pillars. Continue maintaining disciplined savings.');
  }

  return {
    score: overallScore,
    rating,
    evaluatedAt: now,
    metrics: {
      effectiveMonthlyIncome: Number(effectiveIncome.toFixed(2)),
      past30DaysExpense: Number(totalExpense.toFixed(2)),
      actualSavingsRatePct,
      targetSavingsRatePct: targetSavingsPct,
      incomeToExpenseRatio: incomeExpenseRatio,
      monthlyRecurringObligations: Number(monthlyRecurringTotal.toFixed(2)),
      recurringBurdenPct,
      activeBudgetsCount: budgetsTracked,
      breachedBudgetsCount: breachedBudgets,
      activeGoalsCount: activeGoals.length,
    },
    pillarScores: {
      savingsRate: { score: savingsRateScore, max: 20 },
      incomeExpenseRatio: { score: ratioScore, max: 20 },
      budgetAdherence: { score: budgetScore, max: 20 },
      recurringBurden: { score: recurringScore, max: 20 },
      goalProgress: { score: goalScore, max: 20 },
    },
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// 10.4 Anomaly Detection
// ---------------------------------------------------------------------------

/**
 * Identifies statistically unusual transactions, sudden daily surges, and outlier amounts.
 */
async function detectAnomalies(userId, options = {}) {
  const days = parseInt(options.lookbackDays, 10) || 60;
  const { currentStart, currentEnd } = getLookbackDates(days);

  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: { gte: currentStart, lte: currentEnd },
    },
    include: {
      category: { select: { id: true, name: true } },
      account: { select: { id: true, accountName: true } },
    },
    orderBy: { transactionAt: 'desc' },
  });

  if (txns.length === 0) {
    return {
      evaluatedTransactionsCount: 0,
      anomalies: [],
      dailySurges: [],
    };
  }

  // 1. Category Statistics (Mean & Standard Deviation)
  const categoryTxns = new Map();
  for (const tx of txns) {
    const catName = tx.category.name;
    if (!categoryTxns.has(catName)) categoryTxns.set(catName, []);
    categoryTxns.get(catName).push(Number(tx.amount));
  }

  const categoryStats = new Map();
  for (const [catName, amounts] of categoryTxns.entries()) {
    categoryStats.set(catName, calculateStats(amounts));
  }

  // Overall Statistics across all transactions
  const allAmounts = txns.map((t) => Number(t.amount));
  const overallStats = calculateStats(allAmounts);

  const flaggedAnomalies = [];

  for (const tx of txns) {
    const amt = Number(tx.amount);
    const catName = tx.category.name;
    const stats = categoryStats.get(catName) || overallStats;

    // Condition A: High Z-Score outlier (> 2.0 std deviations from category mean)
    const zScore = stats.stdDev > 0 ? (amt - stats.mean) / stats.stdDev : 0;

    // Condition B: Multiplier of median (> 2.5x category median & at least ₹1000)
    const isMedianSpike = stats.median > 0 && amt > stats.median * 2.5 && amt > 1000;

    if (zScore >= 2.0 || isMedianSpike) {
      let severity = 'LOW';
      if (zScore >= 3.0 || amt > stats.median * 4.0) severity = 'HIGH';
      else if (zScore >= 2.2 || amt > stats.median * 3.0) severity = 'MEDIUM';

      flaggedAnomalies.push({
        transactionId: tx.id,
        merchantName: tx.cleanMerchantName || tx.merchantName,
        amount: amt,
        transactionAt: tx.transactionAt,
        categoryName: catName,
        accountName: tx.account.accountName,
        severity,
        metrics: {
          categoryMean: Number(stats.mean.toFixed(2)),
          categoryMedian: Number(stats.median.toFixed(2)),
          zScore: Number(zScore.toFixed(2)),
          deviationPct: stats.mean > 0 ? Number((((amt - stats.mean) / stats.mean) * 100).toFixed(1)) : 0,
        },
        reason:
          zScore >= 3.0
            ? `Amount ₹${amt} is significantly higher than usual for ${catName} (Z-Score: ${zScore.toFixed(1)}).`
            : `Amount ₹${amt} is ${((amt / (stats.median || 1))).toFixed(1)}x your typical spend in ${catName}.`,
        suggestedAction: 'VERIFY_TRANSACTION',
      });
    }
  }

  // 2. Daily Surge Detection (> 2.5x 30-day average daily burn)
  const dailyTotals = new Map();
  for (const tx of txns) {
    const dayStr = tx.transactionAt.toISOString().slice(0, 10);
    dailyTotals.set(dayStr, (dailyTotals.get(dayStr) || 0) + Number(tx.amount));
  }

  const dailyValues = Array.from(dailyTotals.values());
  const dailyStats = calculateStats(dailyValues);
  const dailySurges = [];

  for (const [dateStr, total] of dailyTotals.entries()) {
    if (total > dailyStats.mean * 2.5 && total > 2000) {
      dailySurges.push({
        date: dateStr,
        dailyTotal: Number(total.toFixed(2)),
        averageDailyTotal: Number(dailyStats.mean.toFixed(2)),
        surgeMultiplier: Number((total / (dailyStats.mean || 1)).toFixed(1)),
        reason: `Spending on ${dateStr} was ${(total / (dailyStats.mean || 1)).toFixed(1)}x higher than your daily average.`,
      });
    }
  }

  return {
    lookbackDays: days,
    evaluatedTransactionsCount: txns.length,
    anomalyCount: flaggedAnomalies.length,
    anomalies: flaggedAnomalies.slice(0, 15),
    dailySurges: dailySurges.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// 10.5 Prediction Evaluation & Storage
// ---------------------------------------------------------------------------

/**
 * Stores a deterministic forecast record in the database `Prediction` model.
 */
async function recordForecast(userId, data) {
  const {
    categoryId,
    forecastType = 'TOTAL_EXPENDITURE',
    targetPeriodStart,
    targetPeriodEnd,
    predictedAmount,
    confidenceScore,
    riskProbability,
    modelVersion = 'deterministic_engine_v1.0',
    inputWindowStart,
    inputWindowEnd,
    metadata = {},
  } = data;

  const prediction = await prisma.prediction.create({
    data: {
      userId,
      categoryId: categoryId || null,
      forecastType,
      targetPeriodStart: new Date(targetPeriodStart),
      targetPeriodEnd: new Date(targetPeriodEnd),
      predictedAmount: Number(predictedAmount),
      confidenceScore: confidenceScore !== undefined ? Number(confidenceScore) : null,
      riskProbability: riskProbability !== undefined ? Number(riskProbability) : null,
      modelVersion,
      inputWindowStart: new Date(inputWindowStart),
      inputWindowEnd: new Date(inputWindowEnd),
      metadata,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return prediction;
}

/**
 * Compares stored past predictions with actual settled expenditures and computes error metrics (MAPE / MAE).
 */
async function getForecastEvaluations(userId) {
  const now = new Date();

  // Fetch predictions where target period has concluded
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      targetPeriodEnd: { lte: now },
    },
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { targetPeriodEnd: 'desc' },
    take: 20,
  });

  if (predictions.length === 0) {
    return {
      evaluatedCount: 0,
      overallMAPE: 0,
      overallAccuracy: 100,
      evaluations: [],
    };
  }

  const evaluations = [];
  let totalPctError = 0;

  for (const pred of predictions) {
    const whereTx = {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: {
        gte: pred.targetPeriodStart,
        lte: pred.targetPeriodEnd,
      },
    };

    if (pred.categoryId) {
      whereTx.categoryId = pred.categoryId;
    }

    const actualSum = await prisma.transaction.aggregate({
      where: whereTx,
      _sum: { amount: true },
    });

    const actualAmount = Number(actualSum._sum.amount || 0);
    const predictedAmount = Number(pred.predictedAmount);
    const absoluteError = Math.abs(predictedAmount - actualAmount);

    const percentageError =
      actualAmount > 0
        ? Number(((absoluteError / actualAmount) * 100).toFixed(2))
        : predictedAmount === 0
        ? 0
        : 100;

    const accuracyPct = Math.max(0, Number((100 - percentageError).toFixed(2)));
    totalPctError += Math.min(100, percentageError);

    evaluations.push({
      predictionId: pred.id,
      forecastType: pred.forecastType,
      categoryName: pred.category ? pred.category.name : 'Total Expenditure',
      targetPeriod: {
        start: pred.targetPeriodStart,
        end: pred.targetPeriodEnd,
      },
      predictedAmount,
      actualAmount,
      absoluteError: Number(absoluteError.toFixed(2)),
      percentageError,
      accuracyPercentage: accuracyPct,
      deviationDirection:
        predictedAmount > actualAmount
          ? 'OVERESTIMATED'
          : predictedAmount < actualAmount
          ? 'UNDERESTIMATED'
          : 'EXACT',
    });
  }

  const overallMAPE = Number((totalPctError / predictions.length).toFixed(2));
  const overallAccuracy = Number(Math.max(0, 100 - overallMAPE).toFixed(2));

  return {
    evaluatedCount: predictions.length,
    overallMAPE,
    overallAccuracy,
    evaluations,
  };
}

module.exports = {
  getSpendingPatterns,
  getFinancialForecast,
  getFinancialHealth,
  detectAnomalies,
  recordForecast,
  getForecastEvaluations,
};

