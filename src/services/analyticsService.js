const prisma = require('../config/prisma');

/**
 * Service providing Financial Dashboard, Expense Analytics, Historical Comparisons,
 * and Chart-Ready Visualizations.
 *
 * Calculations are strictly deterministic:
 *  - Transfers between accounts are excluded to prevent double counting.
 *  - Excluded transactions ('EXCLUDED') and Reversals ('REVERSAL') are factored out cleanly.
 */

/**
 * Helper to get date boundaries for a given timeframe or custom range
 */
const getDateRange = (timeframe, customStartDate, customEndDate) => {
  const now = new Date();
  let start;
  let end;

  if (customStartDate) {
    start = new Date(customStartDate);
    end = customEndDate ? new Date(customEndDate) : new Date(now);
  } else {
    switch (timeframe) {
      case 'today':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        end = customEndDate
          ? new Date(customEndDate)
          : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      case 'week': {
        const day = now.getUTCDay();
        const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
        end = customEndDate
          ? new Date(customEndDate)
          : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff + 6, 23, 59, 59, 999));
        break;
      }
      case 'year':
        start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
        end = customEndDate
          ? new Date(customEndDate)
          : new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
        break;
      case 'month':
      default: {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        end = customEndDate
          ? new Date(customEndDate)
          : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        break;
      }
    }
  }

  return { start, end };
};

/**
 * Helper to calculate sum of income and expenses for a user between two dates
 */
const getIncomeAndExpenseForRange = async (userId, start, end) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
      transactionAt: { gte: start, lte: end },
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  let income = 0;
  let expense = 0;
  const categoryTotals = new Map();

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
      income += amt;
    } else if (tx.type === 'DEBIT' || tx.type === 'FEE') {
      expense += amt;
      const catName = tx.category.name;
      categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + amt);
    }
  }

  return {
    income: Number(income.toFixed(2)),
    expense: Number(expense.toFixed(2)),
    net: Number((income - expense).toFixed(2)),
    categoryTotals,
  };
};

/**
 * 6.1 Dashboard Overview:
 * Computes:
 *  - Total income
 *  - Total expenditure
 *  - Account balances summary (by account & overall total)
 *  - Net savings (Income - Expenditure)
 *  - Monthly savings rate percentage ((Net Savings / Income) * 100)
 */
const getDashboardOverview = async (userId, options = {}) => {
  const { timeframe = 'month', startDate, endDate } = options;
  const { start, end } = getDateRange(timeframe, startDate, endDate);

  // 1. Fetch user accounts and sum cached balances
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      accountName: true,
      accountType: true,
      currency: true,
      cachedBalance: true,
      lastReconciledAt: true,
    },
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.cachedBalance), 0);

  // 2. Fetch posted non-transfer transactions within the period
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
      transactionAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      amount: true,
      type: true,
      transactionAt: true,
    },
  });

  let totalIncome = 0;
  let totalExpenditure = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
      totalIncome += amt;
    } else if (tx.type === 'DEBIT' || tx.type === 'FEE') {
      totalExpenditure += amt;
    }
  }

  // 3. Compute Net Savings & Savings Rate
  const netSavings = totalIncome - totalExpenditure;
  const savingsRatePct = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(2) : '0.00';

  return {
    period: {
      timeframe,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    summary: {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenditure: Number(totalExpenditure.toFixed(2)),
      netSavings: Number(netSavings.toFixed(2)),
      savingsRatePercentage: Number(savingsRatePct),
      totalAccountBalance: Number(totalBalance.toFixed(2)),
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.accountName,
      type: a.accountType,
      currency: a.currency,
      balance: Number(a.cachedBalance),
      lastReconciledAt: a.lastReconciledAt,
    })),
  };
};

/**
 * 6.2 Expense Analytics:
 * Computes:
 *  - Category-wise spending with amounts, percentage share, transaction counts
 *  - Account-wise spending breakdown
 *  - Daily expenditure breakdown
 *  - Weekly expenditure breakdown
 *  - Monthly expenditure breakdown
 *  - Income vs Expenditure balance summary
 */
const getExpenseAnalytics = async (userId, options = {}) => {
  const { timeframe = 'month', startDate, endDate } = options;
  const { start, end } = getDateRange(timeframe, startDate, endDate);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['DEBIT', 'CREDIT', 'FEE', 'REFUND'] },
      transactionAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      category: {
        select: { id: true, name: true, icon: true, colorHex: true, categoryType: true },
      },
      account: {
        select: { id: true, accountName: true, accountType: true },
      },
    },
    orderBy: { transactionAt: 'asc' },
  });

  let totalExpense = 0;
  let totalIncome = 0;

  const categoryMap = new Map();
  const accountMap = new Map();
  const dailyMap = new Map();
  const weeklyMap = new Map();
  const monthlyMap = new Map();

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    const isExpense = tx.type === 'DEBIT' || tx.type === 'FEE';

    if (isExpense) {
      totalExpense += amt;

      // 1. Category-wise Spending
      const catId = tx.category.id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          id: catId,
          name: tx.category.name,
          icon: tx.category.icon,
          colorHex: tx.category.colorHex,
          totalAmount: 0,
          transactionCount: 0,
        });
      }
      const catEntry = categoryMap.get(catId);
      catEntry.totalAmount += amt;
      catEntry.transactionCount += 1;

      // 2. Account-wise Spending
      const accId = tx.account.id;
      if (!accountMap.has(accId)) {
        accountMap.set(accId, {
          id: accId,
          name: tx.account.accountName,
          type: tx.account.accountType,
          totalAmount: 0,
          transactionCount: 0,
        });
      }
      const accEntry = accountMap.get(accId);
      accEntry.totalAmount += amt;
      accEntry.transactionCount += 1;

      // 3. Daily Breakdown
      const dayKey = tx.transactionAt.toISOString().split('T')[0];
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + amt);

      // 4. Weekly Breakdown (Year-WXX)
      const d = new Date(Date.UTC(tx.transactionAt.getUTCFullYear(), tx.transactionAt.getUTCMonth(), tx.transactionAt.getUTCDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
      const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + amt);

      // 5. Monthly Breakdown (YYYY-MM)
      const monthKey = tx.transactionAt.toISOString().substring(0, 7);
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amt);
    } else {
      totalIncome += amt;
    }
  }

  const categorySpending = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    totalAmount: Number(c.totalAmount.toFixed(2)),
    percentage: totalExpense > 0 ? Number(((c.totalAmount / totalExpense) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  const accountSpending = Array.from(accountMap.values()).map((a) => ({
    ...a,
    totalAmount: Number(a.totalAmount.toFixed(2)),
    percentage: totalExpense > 0 ? Number(((a.totalAmount / totalExpense) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  const dailyExpenditure = Array.from(dailyMap.entries()).map(([date, amount]) => ({
    date,
    amount: Number(amount.toFixed(2)),
  })).sort((a, b) => a.date.localeCompare(b.date));

  const weeklyExpenditure = Array.from(weeklyMap.entries()).map(([week, amount]) => ({
    week,
    amount: Number(amount.toFixed(2)),
  })).sort((a, b) => a.week.localeCompare(b.week));

  const monthlyExpenditure = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount: Number(amount.toFixed(2)),
  })).sort((a, b) => a.month.localeCompare(b.month));

  return {
    period: {
      timeframe,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    totals: {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenditure: Number(totalExpense.toFixed(2)),
      netSavings: Number((totalIncome - totalExpense).toFixed(2)),
    },
    categorySpending,
    accountSpending,
    timeline: {
      daily: dailyExpenditure,
      weekly: weeklyExpenditure,
      monthly: monthlyExpenditure,
    },
  };
};

/**
 * 6.3 Historical Comparisons:
 * Computes:
 *  - Month-over-Month comparison (current month vs previous month)
 *  - Week-over-Week comparison (current week vs previous week)
 *  - Spending trends (absolute change & percentage change)
 *  - Category-level spending changes (increases/decreases across periods)
 */
const getHistoricalComparisons = async (userId) => {
  const now = new Date();

  // 1. Current Month vs Previous Month
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const currentMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));

  // 2. Current Week vs Previous Week
  const curDay = now.getUTCDay();
  const curDiff = now.getUTCDate() - curDay + (curDay === 0 ? -6 : 1);
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), curDiff, 0, 0, 0, 0));
  const currentWeekEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), curDiff + 6, 23, 59, 59, 999));

  const prevWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), curDiff - 7, 0, 0, 0, 0));
  const prevWeekEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), curDiff - 1, 23, 59, 59, 999));

  const [curMonthData, prevMonthData, curWeekData, prevWeekData] = await Promise.all([
    getIncomeAndExpenseForRange(userId, currentMonthStart, currentMonthEnd),
    getIncomeAndExpenseForRange(userId, prevMonthStart, prevMonthEnd),
    getIncomeAndExpenseForRange(userId, currentWeekStart, currentWeekEnd),
    getIncomeAndExpenseForRange(userId, prevWeekStart, prevWeekEnd),
  ]);

  // Month-over-Month calculation
  const momExpenseDiff = curMonthData.expense - prevMonthData.expense;
  const momExpensePctChange = prevMonthData.expense > 0
    ? Number(((momExpenseDiff / prevMonthData.expense) * 100).toFixed(2))
    : null;

  // Week-over-Week calculation
  const wowExpenseDiff = curWeekData.expense - prevWeekData.expense;
  const wowExpensePctChange = prevWeekData.expense > 0
    ? Number(((wowExpenseDiff / prevWeekData.expense) * 100).toFixed(2))
    : null;

  // Category-level spending changes (Month-over-Month)
  const allCategoryNames = new Set([
    ...curMonthData.categoryTotals.keys(),
    ...prevMonthData.categoryTotals.keys(),
  ]);

  const categoryChanges = [];
  for (const catName of allCategoryNames) {
    const curAmt = curMonthData.categoryTotals.get(catName) || 0;
    const prevAmt = prevMonthData.categoryTotals.get(catName) || 0;
    const diff = Number((curAmt - prevAmt).toFixed(2));
    const pct = prevAmt > 0 ? Number(((diff / prevAmt) * 100).toFixed(2)) : null;

    categoryChanges.push({
      categoryName: catName,
      currentMonthAmount: curAmt,
      previousMonthAmount: prevAmt,
      difference: diff,
      percentageChange: pct,
      trend: diff > 0 ? 'INCREASED' : diff < 0 ? 'DECREASED' : 'UNCHANGED',
    });
  }

  categoryChanges.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  return {
    monthOverMonth: {
      currentMonth: {
        period: `${currentMonthStart.toISOString().substring(0, 7)}`,
        income: curMonthData.income,
        expense: curMonthData.expense,
        netSavings: curMonthData.net,
      },
      previousMonth: {
        period: `${prevMonthStart.toISOString().substring(0, 7)}`,
        income: prevMonthData.income,
        expense: prevMonthData.expense,
        netSavings: prevMonthData.net,
      },
      expenseDifference: Number(momExpenseDiff.toFixed(2)),
      expensePercentageChange: momExpensePctChange,
      trend: momExpenseDiff > 0 ? 'INCREASED' : momExpenseDiff < 0 ? 'DECREASED' : 'UNCHANGED',
    },
    weekOverWeek: {
      currentWeek: {
        startDate: currentWeekStart.toISOString().split('T')[0],
        endDate: currentWeekEnd.toISOString().split('T')[0],
        expense: curWeekData.expense,
      },
      previousWeek: {
        startDate: prevWeekStart.toISOString().split('T')[0],
        endDate: prevWeekEnd.toISOString().split('T')[0],
        expense: prevWeekData.expense,
      },
      expenseDifference: Number(wowExpenseDiff.toFixed(2)),
      expensePercentageChange: wowExpensePctChange,
      trend: wowExpenseDiff > 0 ? 'INCREASED' : wowExpenseDiff < 0 ? 'DECREASED' : 'UNCHANGED',
    },
    categoryChanges,
  };
};

/**
 * 6.4 Visualizations:
 * Formats chart-ready structures for the frontend (Figma design):
 *  - Income and expense bar/donut charts
 *  - Category distribution charts (donut/pie ready with colorHex)
 *  - Monthly spending trends (last 6-12 months series)
 *  - Savings progress charts (goals progress & historical savings rate)
 */
const getVisualizationData = async (userId, options = {}) => {
  const { timeframe = 'month', months = 6 } = options;
  const now = new Date();

  // 1. Fetch last N months of data for Monthly Spending Trends & Income vs Expense
  const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const trendEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['POSTED', 'RECONCILED'] },
      type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
      transactionAt: { gte: trendStart, lte: trendEnd },
    },
    include: {
      category: {
        select: { id: true, name: true, colorHex: true },
      },
    },
    orderBy: { transactionAt: 'asc' },
  });

  // Monthly buckets
  const monthlyBuckets = new Map();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().substring(0, 7);
    monthlyBuckets.set(key, { month: key, income: 0, expense: 0, netSavings: 0 });
  }

  const currentMonthKey = now.toISOString().substring(0, 7);
  const currentMonthCategoryMap = new Map();
  let currentMonthExpense = 0;
  let currentMonthIncome = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    const monthKey = tx.transactionAt.toISOString().substring(0, 7);

    if (monthlyBuckets.has(monthKey)) {
      const bucket = monthlyBuckets.get(monthKey);
      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        bucket.income += amt;
      } else if (tx.type === 'DEBIT' || tx.type === 'FEE') {
        bucket.expense += amt;
      }
      bucket.netSavings = bucket.income - bucket.expense;
    }

    // Category distribution for current active month
    if (monthKey === currentMonthKey) {
      if (tx.type === 'DEBIT' || tx.type === 'FEE') {
        currentMonthExpense += amt;
        const catId = tx.category.id;
        if (!currentMonthCategoryMap.has(catId)) {
          currentMonthCategoryMap.set(catId, {
            name: tx.category.name,
            colorHex: tx.category.colorHex || '#64748B',
            value: 0,
          });
        }
        currentMonthCategoryMap.get(catId).value += amt;
      } else {
        currentMonthIncome += amt;
      }
    }
  }

  // Monthly trends chart data
  const monthlyTrendsChart = Array.from(monthlyBuckets.values()).map((b) => ({
    month: b.month,
    income: Number(b.income.toFixed(2)),
    expense: Number(b.expense.toFixed(2)),
    netSavings: Number(b.netSavings.toFixed(2)),
    savingsRatePercentage: b.income > 0 ? Number(((b.netSavings / b.income) * 100).toFixed(2)) : 0,
  }));

  // 2. Generate timeframe-specific Chart Bars for Day, Week, Month, and Year
  let chartBars = [];

  if (timeframe === 'today') {
    const hourLabels = ['12am', '4am', '8am', '12pm', '4pm', '8pm'];
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const currentHour = now.getUTCHours();
    const activeIdx = Math.min(5, Math.floor(currentHour / 4));

    const dayTxs = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['POSTED', 'RECONCILED'] },
        type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
        transactionAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    chartBars = hourLabels.map((label, idx) => ({
      label,
      income: 0,
      expense: 0,
      netSavings: 0,
      active: idx === activeIdx,
    }));

    for (const tx of dayTxs) {
      const h = tx.transactionAt.getUTCHours();
      const bIdx = Math.min(5, Math.floor(h / 4));
      const amt = Number(tx.amount);
      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        chartBars[bIdx].income += amt;
      } else {
        chartBars[bIdx].expense += amt;
      }
      chartBars[bIdx].netSavings = chartBars[bIdx].income - chartBars[bIdx].expense;
    }
  } else if (timeframe === 'week') {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOfWeek = now.getUTCDay();
    const mondayDiff = now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), mondayDiff, 0, 0, 0, 0));
    const endOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), mondayDiff + 6, 23, 59, 59, 999));
    const currentDayIdx = (dayOfWeek + 6) % 7;

    const weekTxs = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['POSTED', 'RECONCILED'] },
        type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
        transactionAt: { gte: startOfWeek, lte: endOfWeek },
      },
    });

    chartBars = dayNames.map((label, idx) => ({
      label,
      income: 0,
      expense: 0,
      netSavings: 0,
      active: idx === currentDayIdx,
    }));

    for (const tx of weekTxs) {
      const txDay = tx.transactionAt.getUTCDay();
      const bIdx = (txDay + 6) % 7;
      const amt = Number(tx.amount);
      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        chartBars[bIdx].income += amt;
      } else {
        chartBars[bIdx].expense += amt;
      }
      chartBars[bIdx].netSavings = chartBars[bIdx].income - chartBars[bIdx].expense;
    }
  } else if (timeframe === 'year') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    const currentMonthIdx = now.getUTCMonth();

    const yearTxs = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['POSTED', 'RECONCILED'] },
        type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
        transactionAt: { gte: startOfYear, lte: endOfYear },
      },
    });

    chartBars = monthNames.map((label, idx) => ({
      label,
      income: 0,
      expense: 0,
      netSavings: 0,
      active: idx === currentMonthIdx,
    }));

    for (const tx of yearTxs) {
      const mIdx = tx.transactionAt.getUTCMonth();
      const amt = Number(tx.amount);
      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        chartBars[mIdx].income += amt;
      } else {
        chartBars[mIdx].expense += amt;
      }
      chartBars[mIdx].netSavings = chartBars[mIdx].income - chartBars[mIdx].expense;
    }
  } else {
    // Default: 'month' - broken down into weeks W1, W2, W3, W4, W5
    const weekLabels = ['W1', 'W2', 'W3', 'W4', 'W5'];
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const currentDayOfMonth = now.getUTCDate();
    const currentWeekIdx = Math.min(4, Math.floor((currentDayOfMonth - 1) / 7));

    const monthTxs = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['POSTED', 'RECONCILED'] },
        type: { in: ['CREDIT', 'DEBIT', 'FEE', 'REFUND'] },
        transactionAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    chartBars = weekLabels.map((label, idx) => ({
      label,
      income: 0,
      expense: 0,
      netSavings: 0,
      active: idx === currentWeekIdx,
    }));

    for (const tx of monthTxs) {
      const day = tx.transactionAt.getUTCDate();
      const bIdx = Math.min(4, Math.floor((day - 1) / 7));
      const amt = Number(tx.amount);
      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        chartBars[bIdx].income += amt;
      } else {
        chartBars[bIdx].expense += amt;
      }
      chartBars[bIdx].netSavings = chartBars[bIdx].income - chartBars[bIdx].expense;
    }
  }

  // Format numbers to 2 decimals
  chartBars = chartBars.map((b) => ({
    ...b,
    income: Number(b.income.toFixed(2)),
    expense: Number(b.expense.toFixed(2)),
    netSavings: Number(b.netSavings.toFixed(2)),
  }));

  // Category distribution chart
  const categoryDistributionChart = Array.from(currentMonthCategoryMap.values()).map((c) => ({
    label: c.name,
    color: c.colorHex,
    value: Number(c.value.toFixed(2)),
    percentage: currentMonthExpense > 0 ? Number(((c.value / currentMonthExpense) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.value - a.value);

  // Income vs Expense comparison chart
  const incomeVsExpenseChart = {
    income: Number(currentMonthIncome.toFixed(2)),
    expense: Number(currentMonthExpense.toFixed(2)),
    netSavings: Number((currentMonthIncome - currentMonthExpense).toFixed(2)),
  };

  // Savings progress charts (Active Financial Goals)
  const financialGoals = await prisma.financialGoal.findMany({
    where: { userId, status: 'IN_PROGRESS' },
    select: {
      id: true,
      name: true,
      targetAmount: true,
      cachedCurrentAmount: true,
      targetDate: true,
      priority: true,
    },
    orderBy: { priority: 'asc' },
  });

  const savingsGoalsProgress = financialGoals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.cachedCurrentAmount);
    const pct = target > 0 ? Number(((current / target) * 100).toFixed(2)) : 0;
    return {
      goalId: g.id,
      goalName: g.name,
      targetAmount: target,
      currentAmount: current,
      percentageAchieved: Math.min(100, pct),
      targetDate: g.targetDate.toISOString().split('T')[0],
    };
  });

  return {
    timeframe,
    chartBars,
    incomeVsExpenseChart,
    categoryDistributionChart,
    monthlyTrendsChart,
    savingsGoalsProgress,
  };
};

module.exports = {
  getDashboardOverview,
  getExpenseAnalytics,
  getHistoricalComparisons,
  getVisualizationData,
};
