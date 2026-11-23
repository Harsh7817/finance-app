import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, TrendingUp } from 'lucide-react-native';
import { formatCurrency } from '../theme';
import { api } from '../api';

const { width } = Dimensions.get('window');

export default function StatisticScreen({ theme, onNavigate, overview, balance = 0 }) {
  const [selectedPeriod, setSelectedPeriod] = useState('M'); // 'D' | 'W' | 'M' | 'Y'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);

  useEffect(() => {
    let timeframe = 'month';
    if (selectedPeriod === 'D') timeframe = 'today';
    else if (selectedPeriod === 'W') timeframe = 'week';
    else if (selectedPeriod === 'Y') timeframe = 'year';

    Promise.all([
      api.getOverview(timeframe).catch(() => null),
      api.getExpenses(timeframe).catch(() => null),
      api.getVisualizations(6).catch(() => null),
    ]).then(([ov, exp, viz]) => {
      if (ov) setAnalyticsData(ov);
      if (exp) setExpenseData(exp);
      if (viz) setVisualizationData(viz);
    });
  }, [selectedPeriod]);

  const periods = [
    { id: 'D', label: 'Day' },
    { id: 'W', label: 'Week' },
    { id: 'M', label: 'Month' },
    { id: 'Y', label: 'Year' },
  ];

  const totalBalance = balance || (analyticsData?.summary?.totalAccountBalance !== undefined ? analyticsData.summary.totalAccountBalance : (overview?.summary?.totalAccountBalance || 0));
  const totalIncome = analyticsData?.summary?.totalIncome !== undefined ? analyticsData.summary.totalIncome : (overview?.summary?.totalIncome || 0);
  const totalExpense = analyticsData?.summary?.totalExpenditure !== undefined ? analyticsData.summary.totalExpenditure : (overview?.summary?.totalExpenditure || 0);

  // Dynamic bar height scaling based on actual figures
  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomeHeight = Math.max(12, Math.min(140, Math.round((totalIncome / maxVal) * 140)));
  const expenseHeight = Math.max(12, Math.min(140, Math.round((totalExpense / maxVal) * 140)));

  // Real monthly trend data if available from visualizations
  const barData = Array.isArray(visualizationData?.monthlyTrendsChart) && visualizationData.monthlyTrendsChart.length > 0
    ? visualizationData.monthlyTrendsChart.slice(-6).map((item) => {
        const inc = Number(item.income || 0);
        const exp = Number(item.expense || 0);
        const mMax = Math.max(inc, exp, 1);
        const monthLabel = item.month ? item.month.slice(5) : '';
        return {
          label: monthLabel,
          incomeH: Math.max(12, Math.min(140, Math.round((inc / mMax) * 140))),
          expenseH: Math.max(12, Math.min(140, Math.round((exp / mMax) * 140))),
          active: true,
        };
      })
    : [
        { label: selectedPeriod === 'M' ? 'Current' : selectedPeriod, incomeH: incomeHeight, expenseH: expenseHeight, active: true },
      ];

  // Donut chart spending categories from real backend expense analytics
  const categoryPalette = [
    theme.primary,
    theme.accentCyan,
    theme.accentPurple,
    theme.accentAmber,
    theme.accentEmerald,
  ];

  const spendingCategories = Array.isArray(expenseData?.categorySpending) && expenseData.categorySpending.length > 0
    ? expenseData.categorySpending.slice(0, 5).map((cat, idx) => ({
        name: cat.name,
        percentage: Math.round(Number(cat.percentage || 0)),
        amount: Number(cat.totalAmount || 0),
        color: categoryPalette[idx % categoryPalette.length],
      }))
    : (totalExpense > 0
      ? [{ name: 'Expenditure', percentage: 100, amount: totalExpense, color: theme.primary }]
      : []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Statistic</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Balance Card & Period Selector */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Total Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>{formatCurrency(totalBalance)}</Text>

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

        {/* Monthly Bar Chart */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          <View style={styles.chartBarsContainer}>
            {barData.map((item, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barsGroup}>
                  {/* Income Bar (Royal Blue) */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: item.incomeH,
                        backgroundColor: item.active ? theme.primary : 'rgba(67, 97, 238, 0.65)',
                      },
                    ]}
                  />
                  {/* Expense Bar (Cyan) */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: item.expenseH,
                        backgroundColor: item.active ? theme.accentCyan : 'rgba(6, 214, 160, 0.65)',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    {
                      color: item.active ? theme.primary : theme.textMuted,
                      fontWeight: item.active ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Income & Expense Chips Row (Matching Image 1) */}
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
            <View>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Income</Text>
              <Text style={[styles.metricVal, { color: theme.textPrimary }]}>{formatCurrency(totalIncome)}</Text>
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
            <View>
              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Expense</Text>
              <Text style={[styles.metricVal, { color: theme.textPrimary }]}>{formatCurrency(totalExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Make Finance More Efficient Promotion Banner */}
        <TouchableOpacity
          style={[
            styles.efficiencyCard,
            { backgroundColor: theme.primary },
            theme.cardShadow,
          ]}
          activeOpacity={0.9}
        >
          <View style={styles.efficiencyText}>
            <Text style={styles.effTitle}>Make Finance More Efficient</Text>
            <Text style={styles.effSub}>Automated categorization & budget recommendations</Text>
            <View style={styles.effBtn}>
              <Text style={styles.effBtnText}>See All</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </View>
          {/* Mini Donut illustration preview */}
          <View style={styles.effGraphic}>
            <TrendingUp size={36} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

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
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>No expense categories recorded yet.</Text>
                </View>
              ) : (
                spendingCategories.map((c) => (
                  <View key={c.name} style={styles.categoryItem}>
                    <View style={[styles.catColorDot, { backgroundColor: c.color }]} />
                    <View style={styles.catInfo}>
                      <Text style={[styles.catName, { color: theme.textPrimary }]}>{c.name}</Text>
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
    paddingBottom: 36,
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
  chartCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    gap: 10,
  },
  barsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    width: 14,
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 12,
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
  efficiencyCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  efficiencyText: {
    flex: 1,
    paddingRight: 10,
  },
  effTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  effSub: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  effBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  effBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  effGraphic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spendingSection: {
    marginTop: 4,
  },
  spendingTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
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
});
