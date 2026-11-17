/**
 * advisoryService.js
 * Phase 11 — AI-Powered Smart Expenditure Advisor
 *
 * Core differentiating feature providing:
 *  11.1 Financial Context Preparation: balances, budgets, recurring commitments, goals, income
 *  11.2 Affordability Analysis: deterministic multi-factor financial evaluation
 *  11.3 Recommendation Engine: authoritative outcomes (BUY, CONSIDER_WAITING, AVOID_FOR_NOW)
 *  11.4 AI-Generated Natural Language Explanations: grounded, deterministic explanations
 *  11.5 Advisory History & User Feedback Management
 */

const prisma = require('../config/prisma');
const { predictCategory } = require('./categorizationService');

// ---------------------------------------------------------------------------
// Constants & Risk Configurations
// ---------------------------------------------------------------------------

const RULE_ENGINE_VERSION = 'smart_advisor_v1.0';
const LLM_MODEL_VERSION = 'deterministic_nlg_v1.0';

const STANDARD_DISCLAIMER =
  'This advisory recommendation is generated automatically based on your current account balances, active budgets, recurring commitments, and historical spending patterns. It is intended for informational budgeting guidance only and does not constitute certified financial or investment advice.';

/**
 * Minimum buffer days of daily expenses to preserve based on risk profile
 */
const RISK_BUFFER_DAYS = {
  CONSERVATIVE: 30, // Preserve 30 days of typical expenses
  MODERATE: 15,     // Preserve 15 days of typical expenses
  AGGRESSIVE: 7,     // Preserve 7 days of typical expenses
};

// ---------------------------------------------------------------------------
// 11.1 Financial Context Preparation
// ---------------------------------------------------------------------------

/**
 * Gathers complete permissioned financial context for the user
 */
async function prepareFinancialContext(userId, purchaseAmount, requestedCategoryId, itemDescription) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const totalDaysInMonth = monthEnd.getUTCDate();
  const daysElapsed = Math.max(1, now.getUTCDate());
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

  // 1. User Profile & Preferences
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });
  const statedIncome = profile ? Number(profile.monthlyStatedIncome) : 0;
  const savingsTargetPct = profile ? Number(profile.savingsTargetPercentage) : 20;
  const riskTolerance = (profile?.riskTolerance || 'MODERATE').toUpperCase();

  // 2. Liquid Accounts & Total Balance
  const accounts = await prisma.financialAccount.findMany({
    where: {
      userId,
      deletedAt: null,
      status: 'ACTIVE',
      accountType: { in: ['SAVINGS', 'CURRENT', 'WALLET', 'CASH'] },
    },
    select: {
      id: true,
      accountName: true,
      accountType: true,
      cachedBalance: true,
    },
  });
  const liquidBalance = accounts.reduce((sum, a) => sum + Number(a.cachedBalance), 0);

  // 3. Month-to-Date (MTD) Debit Spend & Income
  const mtdDebits = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'FEE'] },
      transactionAt: { gte: monthStart, lte: now },
    },
    select: { amount: true, categoryId: true },
  });
  const mtdSpentTotal = mtdDebits.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const dailyBurnRate = daysElapsed > 0 ? mtdSpentTotal / daysElapsed : 0;

  // 4. Resolve Category (Auto-predict if not provided)
  let categoryId = requestedCategoryId;
  let categoryName = 'General Expenditure';
  let categoryIcon = 'tag';

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (cat) {
      categoryName = cat.name;
      categoryIcon = cat.icon || 'tag';
    }
  } else if (itemDescription) {
    const prediction = await predictCategory(userId, itemDescription, 'DEBIT');
    if (prediction && prediction.categoryId) {
      categoryId = prediction.categoryId;
      categoryName = prediction.categoryName;
    }
  }

  // Current category MTD spent
  const categoryMtdSpent = mtdDebits
    .filter((tx) => tx.categoryId === categoryId)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // 5. Active Category Budget & Overall Budget
  const categoryBudget = categoryId
    ? await prisma.budget.findFirst({
        where: {
          userId,
          categoryId,
          status: 'ACTIVE',
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
      })
    : null;

  const overallBudget = await prisma.budget.findFirst({
    where: {
      userId,
      categoryId: null,
      status: 'ACTIVE',
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
  });

  // 6. Upcoming Active Recurring Commitments in Current Month
  const upcomingRecurring = await prisma.recurringCommitment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      nextExpectedDate: { gte: now, lte: monthEnd },
    },
    select: { merchantName: true, expectedAmount: true, nextExpectedDate: true },
  });
  const upcomingRecurringTotal = upcomingRecurring.reduce(
    (sum, r) => sum + Number(r.expectedAmount),
    0
  );

  // 7. Active Financial Goals & Monthly Contributions
  const activeGoals = await prisma.financialGoal.findMany({
    where: { userId, status: 'IN_PROGRESS' },
    select: {
      id: true,
      name: true,
      targetAmount: true,
      cachedCurrentAmount: true,
      monthlyTargetContribution: true,
      targetDate: true,
    },
  });
  const monthlyGoalsTargetTotal = activeGoals.reduce(
    (sum, g) => sum + Number(g.monthlyTargetContribution),
    0
  );

  return {
    now,
    profile: { statedIncome, savingsTargetPct, riskTolerance },
    timeline: { daysElapsed, totalDaysInMonth, daysRemaining },
    accounts: { liquidBalance, accountsCount: accounts.length },
    spending: { mtdSpentTotal, dailyBurnRate, categoryMtdSpent },
    category: { categoryId, categoryName, categoryIcon },
    budgets: { categoryBudget, overallBudget },
    recurring: { upcomingRecurringTotal, count: upcomingRecurring.length },
    goals: { activeGoals, monthlyGoalsTargetTotal },
  };
}

// ---------------------------------------------------------------------------
// 11.2 & 11.3 Affordability Analysis & Recommendation Engine
// ---------------------------------------------------------------------------

/**
 * Evaluates the affordability of a proposed purchase with deterministic rules
 */
function evaluateAffordability(ctx, purchaseAmount) {
  const { profile, timeline, accounts, spending, budgets, recurring, goals } = ctx;
  const { liquidBalance } = accounts;
  const { statedIncome, riskTolerance } = profile;

  // 1. Minimum safety cushion required based on risk tolerance
  const requiredBufferDays = RISK_BUFFER_DAYS[riskTolerance] || 15;
  const dailyRunRate = spending.dailyBurnRate > 0 ? spending.dailyBurnRate : statedIncome / 30;
  const minimumSafetyCushion = Math.max(1000, dailyRunRate * requiredBufferDays);

  // 2. Remaining commitments for current month
  const variableRemaining = dailyRunRate * timeline.daysRemaining;
  const committedRemaining = recurring.upcomingRecurringTotal;
  const essentialUpcomingTotal = variableRemaining + committedRemaining;

  // 3. Post-Purchase Projections
  const postPurchaseBalance = liquidBalance - purchaseAmount;
  const postPurchaseFreeCash = postPurchaseBalance - essentialUpcomingTotal;

  // 4. Budget Impact
  let budgetImpact = {
    hasBudget: false,
    budgetName: null,
    limitAmount: 0,
    currentSpent: 0,
    projectedSpent: 0,
    remainingBefore: 0,
    remainingAfter: 0,
    willExceed: false,
    exceededBy: 0,
    utilizationBeforePct: 0,
    utilizationAfterPct: 0,
  };

  const evalBudget = budgets.categoryBudget || budgets.overallBudget;
  if (evalBudget) {
    const limit = Number(evalBudget.limitAmount);
    const currentSpent = budgets.categoryBudget
      ? spending.categoryMtdSpent
      : spending.mtdSpentTotal;
    const projectedSpent = currentSpent + purchaseAmount;
    const remainingBefore = Math.max(0, limit - currentSpent);
    const remainingAfter = limit - projectedSpent;
    const willExceed = projectedSpent > limit;

    budgetImpact = {
      hasBudget: true,
      budgetName: evalBudget.name,
      limitAmount: limit,
      currentSpent: Number(currentSpent.toFixed(2)),
      projectedSpent: Number(projectedSpent.toFixed(2)),
      remainingBefore: Number(remainingBefore.toFixed(2)),
      remainingAfter: Number(remainingAfter.toFixed(2)),
      willExceed,
      exceededBy: willExceed ? Number((projectedSpent - limit).toFixed(2)) : 0,
      utilizationBeforePct: limit > 0 ? Number(((currentSpent / limit) * 100).toFixed(1)) : 0,
      utilizationAfterPct: limit > 0 ? Number(((projectedSpent / limit) * 100).toFixed(1)) : 0,
    };
  }

  // 5. Goal Impact
  const monthlyGoalCommitment = goals.monthlyGoalsTargetTotal;
  const willCompromiseGoals = postPurchaseFreeCash < monthlyGoalCommitment;
  const goalImpact = {
    activeGoalsCount: goals.activeGoals.length,
    monthlyGoalCommitment,
    willCompromiseGoals,
    postPurchaseFreeCash: Number(postPurchaseFreeCash.toFixed(2)),
    compromisedAmount: willCompromiseGoals ? Number((monthlyGoalCommitment - postPurchaseFreeCash).toFixed(2)) : 0,
  };

  // 6. Factor Scores Calculation (0 - 100 Total)
  // Pillar A: Liquidity Coverage (40 points max)
  let liquidityScore = 0;
  if (postPurchaseBalance < 0) {
    liquidityScore = 0; // Outright cannot afford
  } else if (postPurchaseBalance >= minimumSafetyCushion + essentialUpcomingTotal) {
    liquidityScore = 40;
  } else if (postPurchaseBalance >= essentialUpcomingTotal) {
    const margin = postPurchaseBalance - essentialUpcomingTotal;
    liquidityScore = Number((20 + (margin / (minimumSafetyCushion || 1)) * 20).toFixed(1));
  } else {
    liquidityScore = Number(Math.max(5, (postPurchaseBalance / (essentialUpcomingTotal || 1)) * 18).toFixed(1));
  }

  // Pillar B: Budget Adherence (25 points max)
  let budgetScore = 25;
  if (budgetImpact.hasBudget) {
    if (budgetImpact.willExceed) {
      const overPct = (budgetImpact.exceededBy / budgetImpact.limitAmount) * 100;
      budgetScore = Math.max(0, Number((20 - overPct * 0.5).toFixed(1)));
    } else if (budgetImpact.utilizationAfterPct > 90) {
      budgetScore = 18;
    } else {
      budgetScore = 25;
    }
  } else {
    // If no explicit budget, assess spend relative to income
    const incomeRatio = statedIncome > 0 ? (purchaseAmount / statedIncome) * 100 : 25;
    budgetScore = incomeRatio <= 10 ? 25 : incomeRatio <= 25 ? 18 : 10;
  }

  // Pillar C: Income Proportionality (20 points max)
  let incomeScore = 20;
  if (statedIncome > 0) {
    const purchaseRatio = (purchaseAmount / statedIncome) * 100;
    if (purchaseRatio <= 5) incomeScore = 20;
    else if (purchaseRatio <= 15) incomeScore = 16;
    else if (purchaseRatio <= 30) incomeScore = 12;
    else if (purchaseRatio <= 50) incomeScore = 8;
    else incomeScore = 4;
  } else {
    incomeScore = 14;
  }

  // Pillar D: Goal & Commitment Safety (15 points max)
  let goalSafetyScore = 15;
  if (willCompromiseGoals) {
    goalSafetyScore = Math.max(2, Number((12 - (goalImpact.compromisedAmount / (monthlyGoalCommitment || 1)) * 10).toFixed(1)));
  } else {
    goalSafetyScore = 15;
  }

  // Composite Affordability Score
  const rawScore = liquidityScore + budgetScore + incomeScore + goalSafetyScore;
  const affordabilityScore = Number(Math.min(100, Math.max(0, rawScore)).toFixed(2));

  // 7. Authoritative Outcome Determination
  let decisionOutcome = 'CONSIDER_WAITING';

  if (postPurchaseBalance < 0 || postPurchaseBalance < committedRemaining) {
    // Hard boundary: Cannot afford or drains essential bill money
    decisionOutcome = 'AVOID_FOR_NOW';
  } else if (affordabilityScore >= 70 && !budgetImpact.willExceed && !willCompromiseGoals) {
    decisionOutcome = 'BUY';
  } else if (affordabilityScore >= 65 && postPurchaseFreeCash > minimumSafetyCushion * 0.8) {
    decisionOutcome = 'BUY';
  } else if (affordabilityScore < 40 || postPurchaseFreeCash < 0) {
    decisionOutcome = 'AVOID_FOR_NOW';
  } else {
    decisionOutcome = 'CONSIDER_WAITING';
  }

  return {
    decisionOutcome,
    affordabilityScore,
    deterministicFactors: {
      purchaseAmount,
      liquidBalance: Number(liquidBalance.toFixed(2)),
      postPurchaseBalance: Number(postPurchaseBalance.toFixed(2)),
      minimumSafetyCushion: Number(minimumSafetyCushion.toFixed(2)),
      essentialUpcomingTotal: Number(essentialUpcomingTotal.toFixed(2)),
      postPurchaseFreeCash: Number(postPurchaseFreeCash.toFixed(2)),
      riskTolerance,
      pillarScores: {
        liquidityScore: { score: liquidityScore, max: 40 },
        budgetScore: { score: budgetScore, max: 25 },
        incomeScore: { score: incomeScore, max: 20 },
        goalSafetyScore: { score: goalSafetyScore, max: 15 },
      },
    },
    budgetImpactSummary: budgetImpact,
    goalImpactSummary: goalImpact,
  };
}

// ---------------------------------------------------------------------------
// 11.4 AI-Generated Explanations (Natural Language Guidance)
// ---------------------------------------------------------------------------

/**
 * Produces structured natural language explanation grounded strictly in the deterministic numbers
 */
function generateExplanation(ctx, evalResult, itemDescription, purchaseAmount) {
  const { decisionOutcome, affordabilityScore, deterministicFactors, budgetImpactSummary, goalImpactSummary } = evalResult;
  const { category } = ctx;

  const parts = [];

  // 1. Verdict & Opening Summary
  if (decisionOutcome === 'BUY') {
    parts.push(
      `Recommendation: BUY (Affordability Score: ${affordabilityScore}/100).\n` +
      `Your proposed purchase of "${itemDescription}" for ₹${purchaseAmount.toLocaleString('en-IN')} fits comfortably within your current financial resources.`
    );
  } else if (decisionOutcome === 'CONSIDER_WAITING') {
    parts.push(
      `Recommendation: CONSIDER WAITING (Affordability Score: ${affordabilityScore}/100).\n` +
      `While you currently possess sufficient account balance for "${itemDescription}" (₹${purchaseAmount.toLocaleString('en-IN')}), proceeding now will place temporary pressure on upcoming financial commitments.`
    );
  } else {
    parts.push(
      `Recommendation: AVOID FOR NOW (Affordability Score: ${affordabilityScore}/100).\n` +
      `Purchasing "${itemDescription}" for ₹${purchaseAmount.toLocaleString('en-IN')} is not advisable right now, as it would severely compromise your required liquid reserves or committed expenses.`
    );
  }

  // 2. Budget Analysis
  if (budgetImpactSummary.hasBudget) {
    if (budgetImpactSummary.willExceed) {
      parts.push(
        `Budget Impact: This purchase will exceed your "${budgetImpactSummary.budgetName}" limit of ₹${budgetImpactSummary.limitAmount.toLocaleString('en-IN')} by ₹${budgetImpactSummary.exceededBy.toLocaleString('en-IN')} (projected utilization: ${budgetImpactSummary.utilizationAfterPct}%).`
      );
    } else {
      parts.push(
        `Budget Impact: Your "${budgetImpactSummary.budgetName}" budget has ₹${budgetImpactSummary.remainingBefore.toLocaleString('en-IN')} remaining. After this purchase, ₹${budgetImpactSummary.remainingAfter.toLocaleString('en-IN')} will remain (${budgetImpactSummary.utilizationAfterPct}% utilized).`
      );
    }
  } else {
    parts.push(
      `Category Context: Classified under "${category.categoryName}". You currently have no explicit spending limit configured for this category.`
    );
  }

  // 3. Liquidity & Cash Flow Analysis
  const postBal = deterministicFactors.postPurchaseBalance;
  const freeCash = deterministicFactors.postPurchaseFreeCash;
  if (postBal < 0) {
    parts.push(
      `Cash Flow: Your current balance is ₹${deterministicFactors.liquidBalance.toLocaleString('en-IN')}. This purchase exceeds your total liquid balance by ₹${Math.abs(postBal).toLocaleString('en-IN')}.`
    );
  } else {
    parts.push(
      `Cash Flow: Post-purchase balance will be ₹${postBal.toLocaleString('en-IN')}. After reserving ₹${deterministicFactors.essentialUpcomingTotal.toLocaleString('en-IN')} for remaining month expenses and recurring bills, your discretionary buffer will be ₹${freeCash.toLocaleString('en-IN')}.`
    );
  }

  // 4. Goals Impact
  if (goalImpactSummary.activeGoalsCount > 0) {
    if (goalImpactSummary.willCompromiseGoals) {
      parts.push(
        `Goals Impact: You have ${goalImpactSummary.activeGoalsCount} active savings goal(s) requiring ₹${goalImpactSummary.monthlyGoalCommitment.toLocaleString('en-IN')}/month. This purchase risks underfunding your goal allocations by ₹${goalImpactSummary.compromisedAmount.toLocaleString('en-IN')}.`
      );
    } else {
      parts.push(
        `Goals Impact: Your ongoing savings goals (₹${goalImpactSummary.monthlyGoalCommitment.toLocaleString('en-IN')}/month) remain fully protected.`
      );
    }
  }

  // 5. Practical Alternatives
  if (decisionOutcome === 'CONSIDER_WAITING') {
    const weeklyRate = Math.ceil(purchaseAmount / 4);
    parts.push(
      `Suggested Alternative: Consider setting aside ₹${weeklyRate.toLocaleString('en-IN')} per week over the next 4 weeks, or delaying this purchase until your next salary credit.`
    );
  } else if (decisionOutcome === 'AVOID_FOR_NOW') {
    parts.push(
      `Suggested Alternative: Focus on meeting current month commitments first. Consider creating a targeted savings goal for "${itemDescription}" to acquire it safely in the future.`
    );
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// 11.5 Main Advisory Execution & Storage
// ---------------------------------------------------------------------------

/**
 * Evaluates a purchase, records request and decision in PostgreSQL, and returns result
 */
async function evaluatePurchase(userId, data) {
  const { purchaseAmount, itemDescription, categoryId, userNotes } = data;
  const numAmount = Number(purchaseAmount);

  // 1. Gather comprehensive financial context
  const context = await prepareFinancialContext(userId, numAmount, categoryId, itemDescription);

  // 2. Compute deterministic affordability analysis
  const evalResult = evaluateAffordability(context, numAmount);

  // 3. Generate natural-language grounded explanation
  const explanation = generateExplanation(context, evalResult, itemDescription, numAmount);

  // 4. Store in database (AdvisoryRequest and AdvisoryDecision in a transaction)
  const saved = await prisma.$transaction(async (tx) => {
    const request = await tx.advisoryRequest.create({
      data: {
        userId,
        categoryId: context.category.categoryId,
        purchaseAmount: numAmount,
        currency: 'INR',
        itemDescription,
        userNotes: userNotes || null,
      },
    });

    const decision = await tx.advisoryDecision.create({
      data: {
        requestId: request.id,
        decisionOutcome: evalResult.decisionOutcome,
        affordabilityScore: evalResult.affordabilityScore,
        deterministicFactors: evalResult.deterministicFactors,
        budgetImpactSummary: evalResult.budgetImpactSummary,
        goalImpactSummary: evalResult.goalImpactSummary,
        llmExplanation: explanation,
        disclaimer: STANDARD_DISCLAIMER,
        ruleEngineVersion: RULE_ENGINE_VERSION,
        llmModelVersion: LLM_MODEL_VERSION,
      },
    });

    return { request, decision };
  });

  return {
    requestId: saved.request.id,
    decisionOutcome: saved.decision.decisionOutcome,
    affordabilityScore: Number(saved.decision.affordabilityScore),
    itemDescription,
    purchaseAmount: numAmount,
    categoryName: context.category.categoryName,
    budgetImpact: evalResult.budgetImpactSummary,
    goalImpact: evalResult.goalImpactSummary,
    factors: evalResult.deterministicFactors,
    explanation: saved.decision.llmExplanation,
    disclaimer: saved.decision.disclaimer,
    evaluatedAt: saved.decision.createdAt,
  };
}

/**
 * Retrieves paginated advisory history for the authenticated user
 */
async function getAdvisoryHistory(userId, options = {}) {
  const limit = parseInt(options.limit, 10) || 20;
  const offset = parseInt(options.offset, 10) || 0;

  const [requests, totalCount] = await Promise.all([
    prisma.advisoryRequest.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true, colorHex: true, icon: true } },
        decision: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.advisoryRequest.count({ where: { userId } }),
  ]);

  const history = requests.map((r) => ({
    requestId: r.id,
    itemDescription: r.itemDescription,
    purchaseAmount: Number(r.purchaseAmount),
    currency: r.currency,
    category: r.category ? r.category.name : 'General',
    decisionOutcome: r.decision?.decisionOutcome || null,
    affordabilityScore: r.decision ? Number(r.decision.affordabilityScore) : null,
    createdAt: r.createdAt,
    explanation: r.decision?.llmExplanation || null,
  }));

  return {
    total: totalCount,
    limit,
    offset,
    history,
  };
}

/**
 * Retrieves a single advisory decision by Request ID
 */
async function getAdvisoryById(userId, requestId) {
  const request = await prisma.advisoryRequest.findFirst({
    where: { id: requestId, userId },
    include: {
      category: { select: { id: true, name: true, colorHex: true } },
      decision: true,
    },
  });

  if (!request) {
    const error = new Error('Advisory request not found');
    error.statusCode = 404;
    throw error;
  }

  // Fetch feedback if already provided
  const feedback = await prisma.feedback.findFirst({
    where: { userId, targetType: 'ADVISORY', targetId: requestId },
  });

  return {
    requestId: request.id,
    itemDescription: request.itemDescription,
    purchaseAmount: Number(request.purchaseAmount),
    currency: request.currency,
    userNotes: request.userNotes,
    category: request.category ? request.category.name : null,
    decision: request.decision,
    feedback: feedback || null,
    createdAt: request.createdAt,
  };
}

/**
 * Records user feedback for an advisory decision
 */
async function submitAdvisoryFeedback(userId, requestId, feedbackData) {
  const { rating, feedbackText, wasHelpful } = feedbackData;

  // Verify request ownership
  const request = await prisma.advisoryRequest.findFirst({
    where: { id: requestId, userId },
  });

  if (!request) {
    const error = new Error('Advisory request not found');
    error.statusCode = 404;
    throw error;
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId,
      targetType: 'ADVISORY',
      targetId: requestId,
      rating: rating ? parseInt(rating, 10) : null,
      feedbackText: feedbackText || null,
      correctionData: {
        wasHelpful: wasHelpful !== undefined ? Boolean(wasHelpful) : true,
        submittedAt: new Date().toISOString(),
      },
    },
  });

  return feedback;
}

/**
 * Returns summary statistics on advisory requests and outcomes
 */
async function getAdvisorySummary(userId) {
  const decisions = await prisma.advisoryDecision.findMany({
    where: { request: { userId } },
    select: {
      decisionOutcome: true,
      affordabilityScore: true,
    },
  });

  const total = decisions.length;
  if (total === 0) {
    return {
      totalEvaluations: 0,
      distribution: { BUY: 0, CONSIDER_WAITING: 0, AVOID_FOR_NOW: 0 },
      averageAffordabilityScore: 0,
    };
  }

  let buyCount = 0;
  let waitCount = 0;
  let avoidCount = 0;
  let sumScore = 0;

  for (const d of decisions) {
    sumScore += Number(d.affordabilityScore);
    if (d.decisionOutcome === 'BUY') buyCount += 1;
    else if (d.decisionOutcome === 'CONSIDER_WAITING') waitCount += 1;
    else if (d.decisionOutcome === 'AVOID_FOR_NOW') avoidCount += 1;
  }

  return {
    totalEvaluations: total,
    distribution: {
      BUY: buyCount,
      CONSIDER_WAITING: waitCount,
      AVOID_FOR_NOW: avoidCount,
    },
    percentages: {
      buyPct: Number(((buyCount / total) * 100).toFixed(1)),
      waitPct: Number(((waitCount / total) * 100).toFixed(1)),
      avoidPct: Number(((avoidCount / total) * 100).toFixed(1)),
    },
    averageAffordabilityScore: Number((sumScore / total).toFixed(2)),
  };
}

module.exports = {
  prepareFinancialContext,
  evaluateAffordability,
  evaluatePurchase,
  getAdvisoryHistory,
  getAdvisoryById,
  submitAdvisoryFeedback,
  getAdvisorySummary,
};

