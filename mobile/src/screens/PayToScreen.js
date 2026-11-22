import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { ChevronLeft, Zap, ChevronDown, CheckCircle } from 'lucide-react-native';
import { formatCurrency } from '../theme';

export default function PayToScreen({
  theme,
  category,
  onBack,
  onPaySuccess,
}) {
  const [tokenInput, setTokenInput] = useState('QC11Z0XQ');
  const [amount, setAmount] = useState('275.00');
  const [selectedCard, setSelectedCard] = useState('Citi Bank Visa Card (**** 2880)');

  const service = category || {
    label: 'Electricity',
    provider: 'PLN Electricity',
    color: theme.primary,
  };

  const handlePay = () => {
    if (!tokenInput.trim()) {
      return Alert.alert('Required', 'Please enter a valid customer / token number.');
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return Alert.alert('Invalid', 'Please enter a valid bill payment amount.');
    }

    onPaySuccess({
      service: service.label,
      provider: service.provider,
      amount: amt,
      token: tokenInput.trim(),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Pay to</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Icon & Info (Matching Image 1 Pay To) */}
        <View style={styles.serviceHero}>
          <View style={[styles.serviceIconCircle, { backgroundColor: theme.primary }]}>
            <Zap size={32} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <Text style={[styles.serviceName, { color: theme.textPrimary }]}>{service.label}</Text>
          <Text style={[styles.lastPaymentText, { color: theme.textMuted }]}>Last payment 2 Aug 2026</Text>
        </View>

        {/* Pay Via Card Selector */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Pay Via</Text>
          <TouchableOpacity
            style={[
              styles.cardSelector,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
            onPress={() => Alert.alert('Payment Source', 'Selected: Citi Bank Visa Card (**** 2880)')}
            activeOpacity={0.8}
          >
            <View style={styles.cardSelectContent}>
              <View style={[styles.bankTag, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.bankTagText, { color: theme.primary }]}>VISA</Text>
              </View>
              <Text style={[styles.cardSelectName, { color: theme.textPrimary }]}>
                {selectedCard}
              </Text>
            </View>
            <ChevronDown size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Enter Token Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Enter Token / Customer ID</Text>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="e.g. QC11Z0XQ"
              placeholderTextColor={theme.textDim}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Amount</Text>
          <View
            style={[
              styles.amountCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <Text style={[styles.currencyPrefix, { color: theme.primary }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.textPrimary }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Pay Bill Primary Button */}
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: theme.primary }, theme.floatingShadow]}
          onPress={handlePay}
          activeOpacity={0.88}
        >
          <Text style={styles.payBtnText}>Pay Bill</Text>
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
  serviceHero: {
    alignItems: 'center',
    marginVertical: 18,
  },
  serviceIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  lastPaymentText: {
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  cardSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bankTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bankTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardSelectName: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
  },
  currencyPrefix: {
    fontSize: 30,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 30,
    fontWeight: '800',
    minWidth: 120,
    textAlign: 'center',
  },
  payBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
