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
import { ChevronLeft, Plus, Check } from 'lucide-react-native';
import WalleyCard from '../components/WalleyCard';

export default function SelectCardScreen({
  theme,
  onBack,
  onCardSaved,
}) {
  const [cardsList, setCardsList] = useState([
    { id: 'sc1', name: 'Arya Wijaya', number: '**** **** 2880', balance: 1200.82, expiry: '11/24', variant: 'blue' },
    { id: 'sc2', name: 'Arya Wijaya', number: '**** **** 9421', balance: 3450.0, expiry: '08/27', variant: 'cyan' },
    { id: 'sc3', name: 'Arya Wijaya', number: '**** **** 5133', balance: 7890.5, expiry: '03/28', variant: 'purple' },
  ]);

  const [selectedCardId, setSelectedCardId] = useState('sc1');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Card Form inputs (Image 1 Confirm Card)
  const [cardHolder, setCardHolder] = useState('Bianca Cooper');
  const [cardNumber, setCardNumber] = useState('3569 7532 3718 2265');
  const [expiry, setExpiry] = useState('11/24');
  const [cvv, setCvv] = useState('921');

  const handleSaveNewCard = () => {
    if (!cardHolder.trim() || !cardNumber.trim()) {
      return Alert.alert('Required', 'Please complete the card details.');
    }

    const newC = {
      id: 'sc_' + Date.now(),
      name: cardHolder.trim(),
      number: cardNumber.trim().slice(-4) ? `**** **** ${cardNumber.trim().slice(-4)}` : '**** **** 8822',
      balance: 1000.0,
      expiry: expiry.trim() || '12/28',
      variant: 'cyan',
    };

    setCardsList([newC, ...cardsList]);
    setSelectedCardId(newC.id);
    setShowAddForm(false);
    Alert.alert('Card Added', 'Your new payment card is ready for use.');
    if (onCardSaved) onCardSaved(newC);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {showAddForm ? 'Confirm Card' : 'Select Card'}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!showAddForm ? (
          <View>
            <Text style={[styles.subHeading, { color: theme.textMuted }]}>
              Select Card for Transfer or Payments
            </Text>

            {/* List of stacked cards (Matching Image 1 Select Card) */}
            <View style={styles.cardsStack}>
              {cardsList.map((c) => {
                const isSelected = c.id === selectedCardId;
                return (
                  <View key={c.id} style={styles.cardItemWrapper}>
                    <WalleyCard
                      theme={theme}
                      balance={c.balance}
                      cardHolder={c.name}
                      cardNumber={c.number}
                      expiry={c.expiry}
                      variant={c.variant}
                      onPress={() => setSelectedCardId(c.id)}
                    />
                    {isSelected && (
                      <View style={[styles.selectedCheckBadge, { backgroundColor: theme.primary }]}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }, theme.floatingShadow]}
              onPress={onBack}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Use Selected Card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Confirm Card / Add Card Form (Matching Image 1 Confirm Card) */
          <View style={styles.formContainer}>
            <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>
              Scan completed, now verify your data
            </Text>

            {/* Preview Card */}
            <WalleyCard
              theme={theme}
              balance={0.0}
              cardHolder={cardHolder || 'Arya Wijaya'}
              cardNumber={cardNumber || '**** **** **** 2880'}
              expiry={expiry || '11/24'}
              variant="cyan"
            />

            {/* Form Fields */}
            <View style={styles.formFields}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Cardholder Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  placeholder="Cardholder Name"
                  placeholderTextColor={theme.textDim}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Card Number</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="numeric"
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={theme.textDim}
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>Expiry Date</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
                    ]}
                    value={expiry}
                    onChangeText={setExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.textPrimary }]}>3-Digit CVV</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary },
                    ]}
                    value={cvv}
                    onChangeText={setCvv}
                    secureTextEntry
                    keyboardType="numeric"
                    placeholder="921"
                    placeholderTextColor={theme.textDim}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }, theme.floatingShadow]}
                onPress={handleSaveNewCard}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  addBtn: {
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
  subHeading: {
    fontSize: 13,
    marginBottom: 10,
  },
  cardsStack: {
    gap: 8,
    marginBottom: 20,
  },
  cardItemWrapper: {
    position: 'relative',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 24,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  formContainer: {
    gap: 12,
  },
  formSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  formFields: {
    gap: 14,
    marginTop: 8,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 14,
  },
});
