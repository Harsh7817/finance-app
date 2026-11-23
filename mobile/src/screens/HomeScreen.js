import React, { useState, useRef } from 'react';
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
  onPressAddTx,
  onPressUploadCsv,
  onPressSetBudget,
  onPressSetGoal,
  onRefresh,
  refreshing = false,
}) {
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const scrollViewRef = useRef(null);
  const transactionsYRef = useRef(0);

  const scrollToTransactions = () => {
    scrollViewRef.current?.scrollTo({
      y: transactionsYRef.current,
      animated: true,
    });
  };

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

  const allTxList = transactions && transactions.length > 0 ? transactions : defaultActivity;
  const displayedTransactions = showAllTransactions ? allTxList : allTxList.slice(0, 4);

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
        ref={scrollViewRef}
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
          onViewTransactions={scrollToTransactions}
        />

        {/* Featured Actions Grid (Add Transaction, Upload CSV, Budget, Goal) */}
        <FeaturedActions
          theme={theme}
          onPressAddTx={onPressAddTx}
          onPressUploadCsv={onPressUploadCsv}
          onPressSetBudget={onPressSetBudget}
          onPressSetGoal={onPressSetGoal}
        />

        {/* Transactions */}
        <View
          style={styles.activitySection}
          onLayout={(event) => {
            transactionsYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Transactions</Text>
            <TouchableOpacity onPress={() => setShowAllTransactions((prev) => !prev)}>
              <Text style={[styles.seeAllLink, { color: theme.primary }]}>
                {showAllTransactions ? 'Show less' : 'See all'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.txList}>
            {displayedTransactions.map((tx, idx) => {
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
