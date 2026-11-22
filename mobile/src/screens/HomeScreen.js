import React from 'react';
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
  ChevronRight,
  Zap,
  ShoppingBag,
  Coffee,
  DollarSign,
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
  const displayBalance = selectedAccount?.cachedBalance !== undefined
    ? Number(selectedAccount.cachedBalance)
    : balance;

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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <WalleyHeader
        theme={theme}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onPressNotifications={() => onNavigate('statistic')}
        onSwitchAccount={onSwitchAccount}
        selectedAccount={selectedAccount}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Single WalleyCard for selected account */}
        <WalleyCard
          theme={theme}
          balance={displayBalance}
          cardHolder={userName}
          cardNumber={selectedAccount?.accountMask || '**** **** 2880'}
          expiry="11/24"
          variant="blue"
          accountName={selectedAccount?.accountName || 'Primary Account'}
          institutionName={selectedAccount?.institutionName || 'Citi Bank'}
          accountType={selectedAccount?.accountType || 'SAVINGS'}
          onViewAccounts={() => onNavigate('accountDetails')}
          onViewTransactions={() => onNavigate('statistic')}
        />

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
