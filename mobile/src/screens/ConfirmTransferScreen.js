import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, User, ShieldCheck } from 'lucide-react-native';
import { formatCurrency } from '../theme';

export default function ConfirmTransferScreen({
  theme,
  transferData,
  onBack,
  onConfirm,
  loading = false,
}) {
  const payee = transferData?.payee || {
    name: 'Arya Wijaya',
    phone: '+62 812-3456-7890',
    account: '3214-5678-2253',
  };
  const amount = transferData?.amount || 275.0;
  const message = transferData?.message || 'For monthly dinner eating eating';
  const date = transferData?.date || 'Dec 2, 2026';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Confirm Transfer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Payee Hero Profile (Matching Image 1 Confirm Transfer) */}
        <View
          style={[
            styles.payeeCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
            <User size={36} color={theme.primary} strokeWidth={2.4} />
          </View>
          <Text style={[styles.payeeName, { color: theme.textPrimary }]}>{payee.name}</Text>
          <Text style={[styles.payeeAccount, { color: theme.textMuted }]}>{payee.account}</Text>

          {/* Amount Badge */}
          <View style={[styles.amountBadge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.amountValue, { color: theme.primary }]}>
              {formatCurrency(amount)}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: theme.textDim }]}>Transfer on {date}</Text>
        </View>

        {/* Transfer Breakdown & Metadata */}
        <View
          style={[
            styles.breakdownCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Payment Method</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary }]}>Walley Card (**** 2880)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Transfer Fee</Text>
            <Text style={[styles.rowVal, { color: theme.accentEmerald }]}>Free (₹0.00)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Message</Text>
            <Text style={[styles.rowVal, { color: theme.textPrimary, flex: 1, textAlign: 'right' }]}>
              {message}
            </Text>
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityPill}>
          <ShieldCheck size={16} color={theme.primary} />
          <Text style={[styles.securityText, { color: theme.textMuted }]}>
            Encrypted with 256-bit bank grade security
          </Text>
        </View>

        {/* Transfer Action Button */}
        <TouchableOpacity
          style={[
            styles.transferBtn,
            { backgroundColor: theme.primary },
            theme.floatingShadow,
            loading && { opacity: 0.8 },
          ]}
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.transferBtnText}>Transfer</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  payeeCard: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  payeeName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  payeeAccount: {
    fontSize: 13,
    marginBottom: 16,
  },
  amountBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dateText: {
    fontSize: 12,
  },
  breakdownCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
  },
  rowVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 12,
  },
  transferBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
