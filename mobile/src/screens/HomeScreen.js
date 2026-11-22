import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Zap,
  ShoppingBag,
  Coffee,
  DollarSign,
  Landmark,
} from 'lucide-react-native';
import WalleyHeader from '../components/WalleyHeader';
import WalleyCard from '../components/WalleyCard';
import FeaturedActions from '../components/FeaturedActions';
import { formatCurrency } from '../theme';

export default function HomeScreen({
  theme,
  isDark,
  onToggleTheme,
  userName = 'Arya Wijaya',
  balance = 1200.82,
  selectedAccount = null,
  transactions = [],
  onNavigate,
  onSwitchAccount,
  onOpenQuickActions,
  onRefresh,
  refreshing = false,
}) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const displayBalance = selectedAccount?.cachedBalance !== undefined
    ? Number(selectedAccount.cachedBalance)
    : balance;

  const cards = [
    {
      id: selectedAccount?.id || 'c1',
      variant: 'blue',
      name: userName,
      number: selectedAccount?.accountMask || '**** **** 2880',
      balance: displayBalance,
      expiry: '11/24',
      institution: selectedAccount?.institutionName || 'Citi Bank',
    },
    { id: 'c2', variant: 'cyan', name: userName, number: '**** **** 9421', balance: 3450.0, expiry: '08/27', institution: 'HDFC Bank' },
    { id: 'c3', variant: 'purple', name: userName, number: '**** **** 5133', balance: 7890.5, expiry: '03/28', institution: 'Chase' },
  ];

  // Default Walley demo transactions matching design
  const defaultActivity = [
    {
      id: 'tx1',
      merchantName: 'Paypal Income',
      category: 'Salary & Income',
      amount: 500.0,
      type: 'CREDIT',
      date: 'Today',
      icon: DollarSign,
      color: theme.accentEmerald,
    },
    {
      id: 'tx2',
      merchantName: 'Spotify Premium',
      category: 'Entertainment',
      amount: 12.99,
      type: 'DEBIT',
      date: 'Yesterday',
      icon: ShoppingBag,
      color: theme.accentPurple,
    },
    {
      id: 'tx3',
      merchantName: 'Electricity Bill',
      category: 'Utilities',
      amount: 85.0,
      type: 'DEBIT',
      date: '24 Nov',
      icon: Zap,
      color: theme.accentAmber,
    },
    {
      id: 'tx4',
      merchantName: 'Starbucks Coffee',
      category: 'Food & Drink',
      amount: 4.5,
      type: 'DEBIT',
      date: '22 Nov',
      icon: Coffee,
      color: theme.primary,
    },
  ];

  const currentCard = cards[activeCardIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <WalleyHeader
        theme={theme}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        userName={userName}
        onPressProfile={() => onNavigate('profile')}
        onPressNotifications={() => onNavigate('statistic')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Active Account Switcher Pill */}
        {selectedAccount && onSwitchAccount && (
          <View style={styles.accountBarRow}>
            <TouchableOpacity
              style={[
                styles.accountPill,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
                theme.cardShadowSoft,
              ]}
              onPress={onSwitchAccount}
              activeOpacity={0.8}
            >
              <View style={[styles.pillIconDot, { backgroundColor: theme.primarySoft }]}>
                <Landmark size={14} color={theme.primary} />
              </View>
              <Text style={[styles.pillText, { color: theme.textPrimary }]} numberOfLines={1}>
                {selectedAccount.institutionName} • {selectedAccount.accountName}
              </Text>
              <View style={styles.switchBadge}>
                <Text style={[styles.switchBadgeText, { color: theme.primary }]}>Switch</Text>
                <ChevronDown size={14} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Card Component */}
        <WalleyCard
          theme={theme}
          balance={currentCard.balance}
          cardHolder={currentCard.name}
          cardNumber={currentCard.number}
          expiry={currentCard.expiry}
          variant={currentCard.variant}
          onPress={() => {
            // Cycle through cards on tap
            setActiveCardIndex((prev) => (prev + 1) % cards.length);
          }}
        />

        {/* Card Dots Indicator */}
        <View style={styles.dotsRow}>
          {cards.map((c, idx) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setActiveCardIndex(idx)}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === activeCardIndex ? theme.primary : theme.border,
                  width: idx === activeCardIndex ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Featured Actions Grid (Transfer, Request, Top Up, Bill) */}
        <FeaturedActions
          theme={theme}
          onPressTransfer={() => onNavigate('transfer')}
          onPressRequest={() => onNavigate('request')}
          onPressTopUp={() => onNavigate('selectCard')}
          onPressBill={() => onNavigate('billPay')}
        />

        {/* Promotional Banner: Make Finance More Efficient */}
        <TouchableOpacity
          style={[
            styles.promoBanner,
            { backgroundColor: theme.primary, borderColor: theme.primaryBorder },
            theme.cardShadow,
          ]}
          onPress={() => onNavigate('statistic')}
          activeOpacity={0.9}
        >
          <View style={styles.promoTextCol}>
            <Text style={styles.promoTitle}>Make Finance More Efficient</Text>
            <Text style={styles.promoSub}>Review intelligent monthly insights & statistics</Text>
            <View style={styles.seeAllPill}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.promoIconBubble}>
            <TrendingUp size={32} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Last Activity / Recent Transactions */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Last activity</Text>
            <TouchableOpacity onPress={() => onNavigate('statistic')}>
              <Text style={[styles.seeAllLink, { color: theme.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.txList}>
            {(transactions && transactions.length > 0 ? transactions.slice(0, 5) : defaultActivity).map((tx, idx) => {
              const isCredit = tx.type === 'CREDIT';
              return (
                <View
                  key={tx.id || idx}
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
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(67, 97, 238, 0.12)',
                      },
                    ]}
                  >
                    {isCredit ? (
                      <ArrowDownLeft size={20} color={theme.accentEmerald} strokeWidth={2.4} />
                    ) : (
                      <ArrowUpRight size={20} color={theme.primary} strokeWidth={2.4} />
                    )}
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={[styles.txTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {tx.merchantName || 'Payment'}
                    </Text>
                    <Text style={[styles.txCategory, { color: theme.textMuted }]}>
                      {tx.category?.name || tx.category || 'Expenditure'} • {tx.date || (tx.transactionAt ? new Date(tx.transactionAt).toLocaleDateString() : 'Recent')}
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  accountBarRow: {
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  pillIconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  switchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(67, 97, 238, 0.08)',
  },
  switchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  promoBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  promoTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  promoSub: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  seeAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  promoIconBubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activitySection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
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
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  txCategory: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
