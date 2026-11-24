import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  ShoppingBag,
  CreditCard,
  Coffee,
  Zap,
  HelpCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { formatCurrency } from '../theme';
import { api } from '../api';

const { width } = Dimensions.get('window');

export default function StatisticScreen({
  theme,
  onNavigate,
  overview,
  balance = 0,
  transactions = [],
  onRefresh,
  refreshing = false,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('M'); // 'D' | 'W' | 'M' | 'Y'
  const [selectedBarIndex, setSelectedBarIndex] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);
  const [catSummary, setCatSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async (period) => {
    let timeframe = 'month';
    if (period === 'D') timeframe = 'today';
    else if (period === 'W') timeframe = 'week';
    else if (period === 'Y') timeframe = 'year';

    setLoading(true);
    try {
      const [ov, exp, viz, summary] = await Promise.all([
        api.getOverview(timeframe).catch(() => null),
        api.getExpenses(timeframe).catch(() => null),
        api.getVisualizations(timeframe).catch(() => null),
        api.getCategorizationSummary().catch(() => null),
      ]);

      if (ov) setAnalyticsData(ov);
      if (exp) setExpenseData(exp);
      if (viz) setVisualizationData(viz);
      if (summary) setCatSummary(summary);
      setSelectedBarIndex(null);
    } catch {
      // Offline safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedPeriod);
  }, [selectedPeriod]);

  const periods = [
    { id: 'D', label: 'Day' },
    { id: 'W', label: 'Week' },
    { id: 'M', label: 'Month' },
    { id: 'Y', label: 'Year' },
  ];

  // Helper to determine if a transaction belongs to the selected period
  const isTxInSelectedPeriod = (tx, period) => {
    if (!tx || !tx.transactionAt) return false;
    const txDate = new Date(tx.transactionAt);
    const now = new Date();

    if (period === 'D') {
      return (
        txDate.getUTCFullYear() === now.getUTCFullYear() &&
        txDate.getUTCMonth() === now.getUTCMonth() &&
        txDate.getUTCDate() === now.getUTCDate()
      );
    } else if (period === 'W') {
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
      const endOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff + 6, 23, 59, 59, 999));
      return txDate >= startOfWeek && txDate <= endOfWeek;
    } else if (period === 'Y') {
      // Last 1 full year (or matching current calendar year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return txDate >= oneYearAgo || txDate.getFullYear() === now.getFullYear();
    } else {
      // Month
      return (
        txDate.getUTCFullYear() === now.getUTCFullYear() &&
        txDate.getUTCMonth() === now.getUTCMonth()
      );
    }
  };

  // Filter transactions matching the selected period
  const periodTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((tx) => isTxInSelectedPeriod(tx, selectedPeriod));
  }, [transactions, selectedPeriod]);

  // Total balance: real balance or overview summary balance
  const totalBalance =
    balance ||
    (analyticsData?.summary?.totalAccountBalance !== undefined
      ? analyticsData.summary.totalAccountBalance
      : overview?.summary?.totalAccountBalance || 0);

  // Income and Expense for the selected timeframe
  const totalIncome =
    analyticsData?.summary?.totalIncome !== undefined
      ? analyticsData.summary.totalIncome
      : periodTransactions
          .filter((t) => t.type === 'CREDIT' || t.type === 'REFUND')
          .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalExpense =
    analyticsData?.summary?.totalExpenditure !== undefined
      ? analyticsData.summary.totalExpenditure
      : periodTransactions
          .filter((t) => t.type === 'DEBIT' || t.type === 'FEE')
          .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Compute Chart Bars: use backend visualizationData.chartBars if available, or generate from periodTransactions
  const chartBars = useMemo(() => {
    if (Array.isArray(visualizationData?.chartBars) && visualizationData.chartBars.length > 0) {
      return visualizationData.chartBars;
    }

    // Client-side fallback computation
    const now = new Date();
    if (selectedPeriod === 'D') {
      const labels = ['12am', '4am', '8am', '12pm', '4pm', '8pm'];
      const currentHour = now.getUTCHours();
      const activeIdx = Math.min(5, Math.floor(currentHour / 4));
      const bars = labels.map((label, idx) => ({
        label,
        income: 0,
        expense: 0,
        netSavings: 0,
        active: idx === activeIdx,
      }));
      periodTransactions.forEach((tx) => {
        const h = new Date(tx.transactionAt).getUTCHours();
        const bIdx = Math.min(5, Math.floor(h / 4));
        const amt = Number(tx.amount || 0);
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') bars[bIdx].income += amt;
        else bars[bIdx].expense += amt;
        bars[bIdx].netSavings = bars[bIdx].income - bars[bIdx].expense;
      });
      return bars;
    } else if (selectedPeriod === 'W') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayOfWeek = now.getUTCDay();
      const currentDayIdx = (dayOfWeek + 6) % 7;
      const bars = labels.map((label, idx) => ({
        label,
        income: 0,
        expense: 0,
        netSavings: 0,
        active: idx === currentDayIdx,
      }));
      periodTransactions.forEach((tx) => {
        const d = new Date(tx.transactionAt).getUTCDay();
        const bIdx = (d + 6) % 7;
        const amt = Number(tx.amount || 0);
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') bars[bIdx].income += amt;
        else bars[bIdx].expense += amt;
        bars[bIdx].netSavings = bars[bIdx].income - bars[bIdx].expense;
      });
      return bars;
    } else if (selectedPeriod === 'Y') {
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonthIdx = now.getUTCMonth();
      const bars = labels.map((label, idx) => ({
        label,
        income: 0,
        expense: 0,
        netSavings: 0,
        active: idx === currentMonthIdx,
      }));
      periodTransactions.forEach((tx) => {
        const m = new Date(tx.transactionAt).getUTCMonth();
        const amt = Number(tx.amount || 0);
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') bars[m].income += amt;
        else bars[m].expense += amt;
        bars[m].netSavings = bars[m].income - bars[m].expense;
      });
      return bars;
    } else {
      // Month
      const labels = ['W1', 'W2', 'W3', 'W4', 'W5'];
      const currentDay = now.getUTCDate();
      const currentWeekIdx = Math.min(4, Math.floor((currentDay - 1) / 7));
      const bars = labels.map((label, idx) => ({
        label,
        income: 0,
        expense: 0,
        netSavings: 0,
        active: idx === currentWeekIdx,
      }));
      periodTransactions.forEach((tx) => {
        const d = new Date(tx.transactionAt).getUTCDate();
        const bIdx = Math.min(4, Math.floor((d - 1) / 7));
        const amt = Number(tx.amount || 0);
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') bars[bIdx].income += amt;
        else bars[bIdx].expense += amt;
        bars[bIdx].netSavings = bars[bIdx].income - bars[bIdx].expense;
      });
      return bars;
    }
  }, [visualizationData, periodTransactions, selectedPeriod]);

  // Global scale for the bar chart
  const maxBarVal = useMemo(() => {
    return Math.max(
      ...chartBars.map((b) => Math.max(Number(b.income || 0), Number(b.expense || 0))),
      1
    );
  }, [chartBars]);

  // Scaled bar items
  const scaledBars = useMemo(() => {
    const isYear = chartBars.length > 7;
    const barW = isYear ? 8 : 13;
    const barGap = isYear ? 3 : 5;

    return chartBars.map((item, idx) => {
      const inc = Number(item.income || 0);
      const exp = Number(item.expense || 0);
      const isSelected = selectedBarIndex === idx;
      const isHighlighted = selectedBarIndex !== null ? isSelected : !!item.active;

      const incomeH = inc > 0 ? Math.max(8, Math.min(130, Math.round((inc / maxBarVal) * 130))) : 4;
      const expenseH = exp > 0 ? Math.max(8, Math.min(130, Math.round((exp / maxBarVal) * 130))) : 4;

      return {
        ...item,
        index: idx,
        barW,
        barGap,
        incomeH,
        expenseH,
        isHighlighted,
        isSelected,
      };
    });
  }, [chartBars, maxBarVal, selectedBarIndex]);

  // Active or selected bar for tooltip
  const activeBar = useMemo(() => {
    if (selectedBarIndex !== null && scaledBars[selectedBarIndex]) {
      return scaledBars[selectedBarIndex];
    }
    return scaledBars.find((b) => b.active) || scaledBars[0];
  }, [scaledBars, selectedBarIndex]);

  // Donut chart spending categories from real backend expense analytics or transactions
  const categoryPalette = [
    theme.primary,
    theme.accentCyan,
    theme.accentPurple,
    theme.accentAmber,
    theme.accentEmerald,
  ];

  const spendingCategories = useMemo(() => {
    if (Array.isArray(expenseData?.categorySpending) && expenseData.categorySpending.length > 0) {
      return expenseData.categorySpending.slice(0, 5).map((cat, idx) => ({
        name: cat.name,
        percentage: Math.round(Number(cat.percentage || 0)),
        amount: Number(cat.totalAmount || 0),
        color: categoryPalette[idx % categoryPalette.length],
      }));
    }

    // Fallback compute from periodTransactions
    const catMap = {};
    let totalCatExpense = 0;
    periodTransactions.forEach((tx) => {
      if (tx.type === 'DEBIT' || tx.type === 'FEE') {
        const cName = tx.category?.name || tx.category || 'General';
        const amt = Number(tx.amount || 0);
        catMap[cName] = (catMap[cName] || 0) + amt;
        totalCatExpense += amt;
      }
    });

    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length > 0) {
      return entries.map(([name, amount], idx) => ({
        name,
        amount,
        percentage: totalCatExpense > 0 ? Math.round((amount / totalCatExpense) * 100) : 0,
        color: categoryPalette[idx % categoryPalette.length],
      }));
    }

    return totalExpense > 0
      ? [{ name: 'Expenditure', percentage: 100, amount: totalExpense, color: theme.primary }]
      : [];
  }, [expenseData, periodTransactions, totalExpense, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Statistic</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={() => {
              if (onRefresh) onRefresh();
              fetchStats(selectedPeriod);
            }}
            tintColor={theme.primary}
          />
        }
      >
        {/* Total Balance Card & Period Selector */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Total Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>
              {formatCurrency(totalBalance)}
            </Text>

            {/* D / W / M / Y Selector */}
            <View style={[styles.periodToggle, { backgroundColor: theme.surfaceAlt }]}>
              {periods.map((p) => {
                const isActive = p.id === selectedPeriod;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPeriod(p.id)}
                    style={[
                      styles.periodBtn,
                      isActive && { backgroundColor: theme.primary },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        { color: isActive ? '#FFFFFF' : theme.textMuted },
                      ]}
                    >
                      {p.id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Uncategorized Review Card (Tap to Review & Categorize) */}
        {catSummary && (catSummary.needsReview > 0 || catSummary.uncategorized > 0) && (
          <TouchableOpacity
            onPress={() => onNavigate && onNavigate('importPreview')}
            style={[
              styles.reviewPromptCard,
              { backgroundColor: theme.surface, borderColor: 'rgba(245, 158, 11, 0.4)' },
              theme.cardShadowSoft,
            ]}
            activeOpacity={0.8}
          >
            <View style={[styles.reviewIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <HelpCircle size={20} color="#F59E0B" strokeWidth={2.4} />
            </View>
            <View style={styles.reviewTextBox}>
              <View style={styles.reviewHeaderLine}>
                <Text style={[styles.reviewTitle, { color: theme.textPrimary }]}>
                  {catSummary.needsReview} Transactions Need Review
                </Text>
                <View style={styles.reviewPill}>
                  <Text style={styles.reviewPillText}>Action Needed</Text>
                </View>
              </View>
              <Text style={[styles.reviewSub, { color: theme.textMuted }]}>
                Categorize payments to improve spending reports and budget tracking.
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}

        {/* Improved Interactive Bar Chart */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          {/* Chart Header: Title & Legend */}
          <View style={styles.chartHeaderRow}>
            <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
              {selectedPeriod === 'D' && 'Today Activity'}
              {selectedPeriod === 'W' && 'This Week Activity'}
              {selectedPeriod === 'M' && 'Monthly Breakdown'}
              {selectedPeriod === 'Y' && 'Annual Overview'}
            </Text>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.accentCyan }]} />
                <Text style={[styles.legendText, { color: theme.textMuted }]}>Expense</Text>
              </View>
            </View>
          </View>

          {/* Interactive Active Column Tooltip Banner */}
          {activeBar && (
            <View style={[styles.tooltipBanner, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.tooltipLabel, { color: theme.primary }]}>
                {activeBar.label}:
              </Text>
              <Text style={[styles.tooltipVal, { color: theme.textPrimary }]}>
                Income {formatCurrency(activeBar.income)} • Expense {formatCurrency(activeBar.expense)}
              </Text>
            </View>
          )}

          {/* Bar Columns Container */}
          <View style={styles.chartBarsContainer}>
            {scaledBars.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => setSelectedBarIndex(item.index)}
                style={[
                  styles.barColumn,
                  item.isSelected && [
                    styles.selectedBarColumn,
                    { borderColor: theme.primary, backgroundColor: 'rgba(67, 97, 238, 0.06)' },
                  ],
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.barsGroup, { gap: item.barGap }]}>
                  {/* Income Bar (Royal Blue) */}
                  <View
                    style={[
                      styles.bar,
                      {
                        width: item.barW,
                        height: item.incomeH,
                        backgroundColor: item.isHighlighted
                          ? theme.primary
                          : 'rgba(67, 97, 238, 0.45)',
                        opacity: item.income > 0 ? 1 : 0.35,
                      },
                    ]}
                  />
                  {/* Expense Bar (Cyan) */}
                  <View
                    style={[
                      styles.bar,
                      {
                        width: item.barW,
                        height: item.expenseH,
                        backgroundColor: item.isHighlighted
                          ? theme.accentCyan
                          : 'rgba(6, 214, 160, 0.45)',
                        opacity: item.expense > 0 ? 1 : 0.35,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    {
                      color: item.isHighlighted ? theme.primary : theme.textMuted,
                      fontWeight: item.isHighlighted ? '800' : '500',
                      fontSize: scaledBars.length > 7 ? 10 : 12,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Income & Expense Chips Row */}
        <View style={styles.metricsRow}>
          {/* Income Chip */}
          <View
            style={[
              styles.metricCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(67, 97, 238, 0.12)' }]}>
              <ArrowDownLeft size={18} color={theme.primary} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Income</Text>
              <Text style={[styles.metricVal, { color: theme.textPrimary }]} numberOfLines={1}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>

          {/* Expense Chip */}
          <View
            style={[
              styles.metricCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(6, 214, 160, 0.12)' }]}>
              <ArrowUpRight size={18} color={theme.accentCyan} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Expense</Text>
              <Text style={[styles.metricVal, { color: theme.textPrimary }]} numberOfLines={1}>
                {formatCurrency(totalExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* Total Spending Section with Donut Breakdown */}
        <View style={styles.spendingSection}>
          <Text style={[styles.spendingTitle, { color: theme.textPrimary }]}>Total Spending</Text>

          <View
            style={[
              styles.donutCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            {/* Donut Chart Visual SVG */}
            <View style={styles.donutVisual}>
              <Svg width={140} height={140} viewBox="0 0 100 100">
                <G transform="rotate(-90 50 50)">
                  {/* Background ring */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke={theme.borderLight}
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Dynamic Category Segments */}
                  {(() => {
                    const circum = 238.76;
                    let accumulatedOffset = 0;
                    return spendingCategories.map((c, idx) => {
                      const pct = Math.max(0, Math.min(100, c.percentage || 0));
                      const dash = Math.round((pct / 100) * circum);
                      const gap = Math.max(0, circum - dash);
                      const currentOffset = accumulatedOffset;
                      accumulatedOffset += dash;
                      if (dash <= 0) return null;
                      return (
                        <Circle
                          key={c.name || idx}
                          cx="50"
                          cy="50"
                          r="38"
                          stroke={c.color}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={-currentOffset}
                          fill="none"
                          strokeLinecap="round"
                        />
                      );
                    });
                  })()}
                </G>
              </Svg>
              <View style={styles.donutCenter}>
                <Text style={[styles.donutCenterVal, { color: theme.textPrimary }]} numberOfLines={1}>
                  {formatCurrency(totalExpense)}
                </Text>
                <Text style={[styles.donutCenterLabel, { color: theme.textMuted }]}>Spent</Text>
              </View>
            </View>

            {/* Category breakdown tags */}
            <View style={styles.categoriesList}>
              {spendingCategories.length === 0 ? (
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    No expense categories recorded yet.
                  </Text>
                </View>
              ) : (
                spendingCategories.map((c) => (
                  <View key={c.name} style={styles.categoryItem}>
                    <View style={[styles.catColorDot, { backgroundColor: c.color }]} />
                    <View style={styles.catInfo}>
                      <Text style={[styles.catName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={[styles.catAmt, { color: theme.textMuted }]}>
                        {c.percentage}% • {formatCurrency(c.amount)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* Real Transactions Breakdown for Selected Period */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeaderRow}>
            <Text style={[styles.spendingTitle, { color: theme.textPrimary }]}>
              Activity in this Period ({periodTransactions.length})
            </Text>
          </View>

          {periodTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Receipt size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No transactions recorded for this period.
              </Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {periodTransactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT' || tx.type === 'REFUND';
                const formattedDate = tx.transactionAt
                  ? new Date(tx.transactionAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Recent';

                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txRow,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                      theme.cardShadowSoft,
                    ]}
                  >
                    <View
                      style={[
                        styles.txIconBox,
                        {
                          backgroundColor: isCredit
                            ? 'rgba(6, 214, 160, 0.12)'
                            : 'rgba(67, 97, 238, 0.12)',
                        },
                      ]}
                    >
                      {isCredit ? (
                        <ArrowDownLeft size={18} color={theme.accentEmerald} strokeWidth={2.4} />
                      ) : (
                        <ArrowUpRight size={18} color={theme.primary} strokeWidth={2.4} />
                      )}
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={[styles.txTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {tx.merchantName || tx.description || 'Transaction'}
                      </Text>
                      <Text style={[styles.txCategory, { color: theme.textMuted }]}>
                        {tx.category?.name || tx.category || 'General'} • {formattedDate}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color: isCredit ? theme.accentEmerald : theme.textPrimary,
                        },
                      ]}
                    >
                      {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  balanceSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  periodToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
  },
  periodBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  reviewIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewTextBox: {
    flex: 1,
  },
  reviewHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  reviewPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reviewPillText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  reviewSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  chartCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tooltipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  tooltipVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 155,
    paddingTop: 8,
  },
  barColumn: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBarColumn: {
    borderWidth: 1,
  },
  barsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  metricIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  spendingSection: {
    marginTop: 4,
    marginBottom: 18,
  },
  spendingTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  donutCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutVisual: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutCenterVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  donutCenterLabel: {
    fontSize: 11,
  },
  categoriesList: {
    flex: 1,
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
  },
  catAmt: {
    fontSize: 11,
  },
  activitySection: {
    marginTop: 4,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  txList: {
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  txCategory: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 12,
  },
});
