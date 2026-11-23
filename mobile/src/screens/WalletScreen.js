import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Plus, ArrowDownLeft, ArrowUpRight, CreditCard, ChevronRight } from 'lucide-react-native';
import WalleyCard from '../components/WalleyCard';
import { formatCurrency } from '../theme';

export default function WalletScreen({
  theme,
  balance = 0,
  accounts = [],
  onNavigate,
}) {
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);

  const walletCards = accounts && accounts.length > 0
    ? accounts.map((acc, i) => ({
        id: acc.id,
        name: acc.accountName || 'Account',
        number: acc.accountMask ? `**** **** ${acc.accountMask}` : '**** **** ----',
        balance: Number(acc.cachedBalance || 0),
        expiry: '12/28',
        variant: i % 2 === 0 ? 'blue' : 'cyan',
      }))
    : [
        { id: 'wc1', name: 'Primary Account', number: '**** **** ----', balance: balance, expiry: '12/28', variant: 'blue' }
      ];

  const current = walletCards[selectedCardIdx] || walletCards[0];

  const spendingCategories = [
    { name: 'Grocery', pct: 35, color: theme.accentCyan, amount: '₹4,200' },
    { name: 'Food', pct: 28, color: theme.primary, amount: '₹3,360' },
    { name: 'Drinks', pct: 20, color: theme.accentPurple, amount: '₹2,400' },
    { name: 'Equipment', pct: 17, color: theme.accentAmber, amount: '₹2,040' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Wallet</Text>
        <TouchableOpacity
          style={[styles.addCardBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}
          onPress={() => onNavigate('selectCard')}
          activeOpacity={0.8}
        >
          <Plus size={16} color={theme.primary} />
          <Text style={[styles.addCardText, { color: theme.primary }]}>Add Card</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card Carousel Preview */}
        <WalleyCard
          theme={theme}
          balance={current.balance}
          cardHolder={current.name}
          cardNumber={current.number}
          expiry={current.expiry}
          variant={current.variant}
          onPress={() => setSelectedCardIdx((prev) => (prev + 1) % walletCards.length)}
        />

        {/* Action Buttons: Withdraw & Transfer (Matching Image 1 Wallet screen) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              theme.cardShadowSoft,
            ]}
            onPress={() => onNavigate('request')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
              <ArrowDownLeft size={18} color={theme.primary} />
            </View>
            <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
              theme.cardShadow,
            ]}
            onPress={() => onNavigate('transfer')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <ArrowUpRight size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* Total Spending Section (Image 1 Wallet screen) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Total Spending</Text>

          <View
            style={[
              styles.spendingCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <View style={styles.spendingRow}>
              {/* Donut Chart */}
              <View style={styles.donutBox}>
                <Svg width={130} height={130} viewBox="0 0 100 100">
                  <G transform="rotate(-90 50 50)">
                    <Circle cx="50" cy="50" r="38" stroke={theme.borderLight} strokeWidth="12" fill="none" />
                    <Circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke={theme.accentCyan}
                      strokeWidth="12"
                      strokeDasharray="84 155"
                      strokeDashoffset="0"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke={theme.primary}
                      strokeWidth="12"
                      strokeDasharray="67 172"
                      strokeDashoffset="-88"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <Circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke={theme.accentPurple}
                      strokeWidth="12"
                      strokeDasharray="48 191"
                      strokeDashoffset="-159"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </G>
                </Svg>
              </View>

              {/* Legend Tags */}
              <View style={styles.legendBox}>
                {spendingCategories.map((cat) => (
                  <View key={cat.name} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legendName, { color: theme.textPrimary }]}>{cat.name}</Text>
                      <Text style={[styles.legendSub, { color: theme.textMuted }]}>{cat.amount}</Text>
                    </View>
                    <Text style={[styles.legendPct, { color: theme.textPrimary }]}>{cat.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Connected Bank Accounts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Bank Accounts</Text>
          {accounts && accounts.length > 0 ? (
            accounts.map((acc) => (
              <View
                key={acc.id}
                style={[
                  styles.accountRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  theme.cardShadowSoft,
                ]}
              >
                <View style={[styles.accIconBox, { backgroundColor: theme.primarySoft }]}>
                  <CreditCard size={20} color={theme.primary} />
                </View>
                <View style={styles.accInfo}>
                  <Text style={[styles.accInst, { color: theme.textPrimary }]}>{acc.institutionName}</Text>
                  <Text style={[styles.accName, { color: theme.textMuted }]}>{acc.accountName}</Text>
                </View>
                <Text style={[styles.accBal, { color: theme.textPrimary }]}>
                  {formatCurrency(acc.cachedBalance || 0)}
                </Text>
              </View>
            ))
          ) : (
            <View style={[styles.accountRow, { backgroundColor: theme.surface, borderColor: theme.border, justifyContent: 'center', paddingVertical: 18 }]}>
              <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '500' }}>No bank accounts linked yet</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  addCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 36,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  spendingCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  donutBox: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendBox: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendName: {
    fontSize: 12,
    fontWeight: '700',
  },
  legendSub: {
    fontSize: 11,
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '800',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  accIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accInfo: {
    flex: 1,
  },
  accInst: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  accName: {
    fontSize: 12,
  },
  accBal: {
    fontSize: 15,
    fontWeight: '800',
  },
});
