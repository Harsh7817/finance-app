import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  ChevronRight,
  Landmark,
  CreditCard,
  Wallet,
  Building2,
  Coins,
  Plus,
} from 'lucide-react-native';
import { formatCurrency } from '../theme';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 240;

export default function AccountDetailsScreen({
  theme,
  userName = 'Arya Wijaya',
  selectedAccount = null,
  accounts = [],
  onBack,
  onAddAccount,
  onSelectAccount,
}) {
  const [visibleAccountNumbers, setVisibleAccountNumbers] = useState({});

  const toggleAccountNumber = (key) => {
    setVisibleAccountNumbers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Use passed accounts, or build a single-item list from selectedAccount
  const displayAccounts =
    accounts.length > 0
      ? accounts
      : selectedAccount
      ? [selectedAccount]
      : [];

  // Combined balance across all displayed accounts
  const combinedBalance = displayAccounts.reduce(
    (sum, a) => sum + parseFloat(a.cachedBalance || 0),
    0
  );

  const getAccountIcon = (type) => {
    switch (type) {
      case 'CREDIT_CARD': return CreditCard;
      case 'WALLET':      return Wallet;
      case 'CURRENT':     return Building2;
      case 'CASH':
      case 'INVESTMENT':  return Coins;
      case 'SAVINGS':
      default:            return Landmark;
    }
  };

  const getAccountTypeLabel = (type) => {
    switch (type) {
      case 'CREDIT_CARD': return 'Credit Card';
      case 'WALLET':      return 'Digital Wallet';
      case 'CURRENT':     return 'Checking Account';
      case 'CASH':        return 'Cash';
      case 'INVESTMENT':  return 'Investment';
      case 'SAVINGS':
      default:            return 'Savings Account';
    }
  };

  const maskNumber = (mask) => {
    if (!mask) return 'XXXXXXX0274';
    const digits = mask.replace(/\D/g, '').slice(-4) || '0274';
    return `XXXXXXX${digits}`;
  };

  const getUnmaskedNumber = (acc) => {
    if (acc.accountNumber) return acc.accountNumber;
    const digits = (acc.accountMask || '').replace(/\D/g, '').slice(-4) || '0274';
    return `50100438${digits}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ── Header bar ── */}
      <View style={[styles.headerBar, { backgroundColor: theme.bg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft size={26} color={theme.textPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Accounts</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Purple gradient banner ── */}
        <View style={styles.bannerWrap}>
          <Svg
            width={width}
            height={BANNER_HEIGHT}
            viewBox={`0 0 ${width} ${BANNER_HEIGHT}`}
            style={StyleSheet.absoluteFillObject}
          >
            <Defs>
              <LinearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#7C3AED" stopOpacity="1" />
                <Stop offset="100%" stopColor="#4C1D95" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={BANNER_HEIGHT} fill="url(#bannerGrad)" />
            {/* Decorative circles */}
            <Circle cx={width - 40} cy={30} r="110" fill="rgba(255,255,255,0.08)" />
            <Circle cx={width + 10} cy={BANNER_HEIGHT - 20} r="140" fill="rgba(255,255,255,0.06)" />
          </Svg>

          {/* Banner content — z above SVG */}
          <View style={styles.bannerContent}>
            <View style={styles.bannerTopRow}>
              <Text style={styles.bannerAccountsLabel}>
                Transaction Accounts
              </Text>
              <View style={styles.bannerCountBadge}>
                <Text style={styles.bannerCountText}>{displayAccounts.length}</Text>
              </View>
            </View>

            <Text style={styles.bannerUserName}>{userName}</Text>

            <Text style={styles.bannerBalanceLabel}>Combined Balance</Text>
            <View style={styles.bannerBalanceRow}>
              <Text style={styles.bannerBalance}>
                {formatCurrency(combinedBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Account list cards ── */}
        <View style={[styles.listSection, { backgroundColor: theme.bg }]}>
          {displayAccounts.map((acc, idx) => {
            const IconComp = getAccountIcon(acc.accountType);
            const isSelected = selectedAccount?.id === acc.id;
            const accKey = acc.id || String(idx);
            const isNumberVisible = !!visibleAccountNumbers[accKey];

            return (
              <TouchableOpacity
                key={accKey}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                  theme.cardShadowSoft,
                ]}
                onPress={() => onSelectAccount && onSelectAccount(acc)}
                activeOpacity={0.85}
              >
                {/* Account type label & holder */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.cardTypeLabel, { color: theme.textMuted }]}>
                    {getAccountTypeLabel(acc.accountType)}
                  </Text>
                  {acc.accountName && (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted }}>
                      {acc.accountName}
                    </Text>
                  )}
                </View>

                {/* Mask + eye + balance + chevron row */}
                <View style={styles.cardMainRow}>
                  <View style={styles.cardMaskRow}>
                    <Text style={[styles.cardMask, { color: theme.textPrimary }]}>
                      {isNumberVisible ? getUnmaskedNumber(acc) : maskNumber(acc.accountMask)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleAccountNumber(accKey)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      {isNumberVisible ? (
                        <EyeOff size={18} color={theme.textMuted} />
                      ) : (
                        <Eye size={18} color={theme.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardBalanceRow}>
                    <Text style={[styles.cardBalance, { color: theme.textPrimary }]}>
                      {formatCurrency(acc.cachedBalance || 0)}
                    </Text>
                    <ChevronRight size={18} color={theme.textMuted} strokeWidth={2.5} />
                  </View>
                </View>

                {/* Institution & IFSC badge */}
                <View style={[styles.institutionBadge, { backgroundColor: theme.primarySoft }]}>
                  <IconComp size={12} color={theme.primary} />
                  <Text style={[styles.institutionText, { color: theme.primary }]}>
                    {acc.institutionName || 'Bank'}{acc.ifscCode ? ` • IFSC: ${acc.ifscCode}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Empty state */}
          {displayAccounts.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Landmark size={36} color={theme.primary} />
              <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No accounts linked yet</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Add a bank account to start tracking your finances
              </Text>
            </View>
          )}

          {/* Add Account CTA */}
          <TouchableOpacity
            style={[styles.addAccountBtn, { borderColor: theme.primary }]}
            onPress={onAddAccount}
            activeOpacity={0.8}
          >
            <Plus size={18} color={theme.primary} strokeWidth={2.5} />
            <Text style={[styles.addAccountText, { color: theme.primary }]}>Add Another Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 4,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: {
    paddingBottom: 40,
  },
  // ── Banner ──
  bannerWrap: {
    width: width,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  bannerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 28,
    justifyContent: 'center',
    zIndex: 1,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  bannerAccountsLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '700',
  },
  bannerCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bannerUserName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  bannerBalanceLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerBalance: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  bannerEyeBtn: {
    padding: 4,
  },
  // ── Account Cards ──
  listSection: {
    padding: 20,
    gap: 14,
  },
  accountCard: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  cardTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardMask: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardBalance: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  institutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  institutionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addAccountText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
