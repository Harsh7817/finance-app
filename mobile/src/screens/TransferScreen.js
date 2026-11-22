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
import { ChevronLeft, Plus, User } from 'lucide-react-native';
import { formatCurrency } from '../theme';

export default function TransferScreen({
  theme,
  onBack,
  onContinue,
  recentPayees = [
    { id: 'p1', name: 'Arya', phone: '+62 812-3456-7890', account: '3214-5678-2253' },
    { id: 'p2', name: 'Rafa', phone: '+62 813-8822-1044', account: '9841-2200-1145' },
    { id: 'p3', name: 'Adiba', phone: '+62 819-4455-6677', account: '5512-9901-3321' },
    { id: 'p4', name: 'Joki', phone: '+62 856-1122-3344', account: '1109-8877-6655' },
    { id: 'p5', name: 'Sarah', phone: '+62 878-5544-3322', account: '7721-3344-9988' },
  ],
}) {
  const [selectedPayee, setSelectedPayee] = useState(recentPayees[0]);
  const [phoneInput, setPhoneInput] = useState(recentPayees[0].phone);
  const [amount, setAmount] = useState('275.00');
  const [message, setMessage] = useState('For dinner eating eating');

  const chips = ['50.00', '100.00', '200.00', '275.00', '500.00'];

  const handleProceed = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      return Alert.alert('Invalid Amount', 'Please enter a valid transfer amount.');
    }
    onContinue({
      payee: selectedPayee,
      amount: val,
      message: message.trim() || 'Transfer via Walley',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Transfer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Contact Input (Image 1 Transfer screen) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Contact</Text>
          <View
            style={[
              styles.inputRow,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Enter phone number or name"
              placeholderTextColor={theme.textDim}
              value={phoneInput}
              onChangeText={setPhoneInput}
            />
            <TouchableOpacity
              style={[styles.addContactBtn, { backgroundColor: theme.primary }]}
              onPress={() => Alert.alert('Contacts', 'Contacts list synchronized.')}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Payees Horizontal List */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Recent Payees</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.payeesRow}>
            {recentPayees.map((p) => {
              const isSelected = selectedPayee?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.payeeItem}
                  onPress={() => {
                    setSelectedPayee(p);
                    setPhoneInput(p.phone);
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.payeeAvatar,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                      theme.cardShadowSoft,
                    ]}
                  >
                    <User
                      size={22}
                      color={isSelected ? '#FFFFFF' : theme.primary}
                      strokeWidth={2.4}
                    />
                  </View>
                  <Text
                    style={[
                      styles.payeeName,
                      { color: isSelected ? theme.primary : theme.textSecondary, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Amount Input Block */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Amount</Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            How much would you like to transfer?
          </Text>

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
              placeholder="0.00"
              placeholderTextColor={theme.textDim}
            />
          </View>

          {/* Quick Amount Chips */}
          <View style={styles.chipsRow}>
            {chips.map((c) => {
              const active = amount === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.primarySoft : theme.surface,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setAmount(c)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? theme.primary : theme.textSecondary },
                    ]}
                  >
                    ${c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Message</Text>
          <View
            style={[
              styles.messageWrapper,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
          >
            <TextInput
              style={[styles.messageInput, { color: theme.textPrimary }]}
              placeholder="Write Message here"
              placeholderTextColor={theme.textDim}
              value={message}
              onChangeText={setMessage}
            />
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: theme.primary }, theme.floatingShadow]}
          onPress={handleProceed}
          activeOpacity={0.88}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  addContactBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payeesRow: {
    gap: 16,
    paddingVertical: 4,
  },
  payeeItem: {
    alignItems: 'center',
    gap: 8,
  },
  payeeAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payeeName: {
    fontSize: 12,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 32,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '800',
    minWidth: 120,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messageWrapper: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  messageInput: {
    fontSize: 15,
  },
  continueBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
