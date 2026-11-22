import React, { useState } from 'react';
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

const { width } = Dimensions.get('window');

export default function StatisticScreen({ theme, onNavigate }) {
  const [selectedPeriod, setSelectedPeriod] = useState('M'); // 'D' | 'W' | 'M' | 'Y'

  const periods = [
    { id: 'D', label: 'Day' },
    { id: 'W', label: 'Week' },
    { id: 'M', label: 'Month' },
    { id: 'Y', label: 'Year' },
  ];

  // Bar chart data matching Image 1 (Aug, Sep, Oct, Nov, Dec)
  const barData = [
    { label: 'Aug', incomeH: 90, expenseH: 60 },
    { label: 'Sep', incomeH: 120, expenseH: 80 },
    { label: 'Oct', incomeH: 70, expenseH: 50 },
    { label: 'Nov', incomeH: 140, expenseH: 95, active: true },
    { label: 'Dec', incomeH: 110, expenseH: 75 },
  ];

  // Donut chart spending categories
  const spendingCategories = [
    { name: 'Grocery', percentage: 38, amount: 1217.9, color: theme.accentCyan },
    { name: 'Food', percentage: 26, amount: 833.3, color: theme.primary },
    { name: 'Drink', percentage: 18, amount: 576.9, color: theme.accentPurple },
    { name: 'Equipment', percentage: 18, amount: 576.9, color: theme.accentAmber },
  ];

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
            <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>$12,549.00</Text>

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
              <Text style={[styles.metricVal, { color: theme.textPrimary }]}>$5,448</Text>
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
              <Text style={[styles.metricVal, { color: theme.textPrimary }]}>$3,205</Text>
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
                  {/* Segment 1: Cyan (38%) */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke={theme.accentCyan}
                    strokeWidth="12"
                    strokeDasharray="91 148"
                    strokeDashoffset="0"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Segment 2: Blue (26%) */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke={theme.primary}
                    strokeWidth="12"
                    strokeDasharray="62 177"
                    strokeDashoffset="-95"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Segment 3: Purple (18%) */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke={theme.accentPurple}
                    strokeWidth="12"
                    strokeDasharray="43 196"
                    strokeDashoffset="-160"
                    fill="none"
                    strokeLinecap="round"
                  />
                </G>
              </Svg>
              <View style={styles.donutCenter}>
                <Text style={[styles.donutCenterVal, { color: theme.textPrimary }]}>72%</Text>
                <Text style={[styles.donutCenterLabel, { color: theme.textMuted }]}>Budget</Text>
              </View>
            </View>

            {/* Category breakdown tags */}
            <View style={styles.categoriesList}>
              {spendingCategories.map((c) => (
                <View key={c.name} style={styles.categoryItem}>
                  <View style={[styles.catColorDot, { backgroundColor: c.color }]} />
                  <View style={styles.catInfo}>
                    <Text style={[styles.catName, { color: theme.textPrimary }]}>{c.name}</Text>
                    <Text style={[styles.catAmt, { color: theme.textMuted }]}>
                      {c.percentage}% • {formatCurrency(c.amount)}
                    </Text>
                  </View>
                </View>
              ))}
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
