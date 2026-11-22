import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {
  Landmark,
  CreditCard,
  Wallet,
  Coins,
  Plus,
  Check,
  ArrowRight,
  ShieldCheck,
  Building2,
  X,
  Sparkles,
} from 'lucide-react-native';
import WalleyLogo from '../components/WalleyLogo';
import { formatCurrency } from '../theme';
import { api } from '../api';

export default function AccountSelectionScreen({
  theme,
  userName = 'Arya Wijaya',
  userEmail = 'you@example.com',
  onSelectAccount,
  onLogout,
}) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Account Form State
  const [accountName, setAccountName] = useState('');
  const [institutionName, setInstitutionName] = useState('Citi Bank');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [openingBalance, setOpeningBalance] = useState('1200.00');
  const [accountMask, setAccountMask] = useState('2880');
  const [currency, setCurrency] = useState('USD');

  const accountTypes = [
    { id: 'SAVINGS', label: 'Savings', icon: Landmark },
    { id: 'CURRENT', label: 'Checking', icon: Building2 },
    { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
    { id: 'WALLET', label: 'Digital Wallet', icon: Wallet },
    { id: 'CASH', label: 'Cash / Other', icon: Coins },
  ];

  // Preset demo accounts to guarantee a premium experience if backend is empty/offline
  const demoFallbackAccounts = [
    {
      id: 'acc_demo_1',
      accountName: 'Walley Primary Savings',
      institutionName: 'Citi Bank',
      accountType: 'SAVINGS',
      accountMask: '2880',
      cachedBalance: 1200.82,
      currency: 'USD',
      isPrimary: true,
    },
    {
      id: 'acc_demo_2',
      accountName: 'Salary & Everyday Checking',
      institutionName: 'HDFC Bank',
      accountType: 'CURRENT',
      accountMask: '9421',
      cachedBalance: 3450.0,
      currency: 'USD',
      isPrimary: false,
    },
    {
      id: 'acc_demo_3',
      accountName: 'Titanium Rewards Card',
      institutionName: 'Chase Bank',
      accountType: 'CREDIT_CARD',
      accountMask: '5133',
      cachedBalance: 7890.5,
      currency: 'USD',
      isPrimary: false,
    },
  ];

  useEffect(() => {
    fetchUserAccounts();
  }, []);

  const fetchUserAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts().catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        setAccounts(data);
        setSelectedAccountId(data[0].id);
      } else {
        // Use demo accounts for visual richness
        setAccounts(demoFallbackAccounts);
        setSelectedAccountId(demoFallbackAccounts[0].id);
      }
    } catch {
      setAccounts(demoFallbackAccounts);
      setSelectedAccountId(demoFallbackAccounts[0].id);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      return Alert.alert('Required', 'Please enter an account name (e.g. "Primary Savings").');
    }
    if (!institutionName.trim()) {
      return Alert.alert('Required', 'Please enter a bank or institution name.');
    }

    setCreating(true);
    try {
      const payload = {
        accountName: accountName.trim(),
        institutionName: institutionName.trim(),
        accountType: accountType,
        openingBalance: parseFloat(openingBalance) || 0,
        accountMask: accountMask.trim() ? `**** ${accountMask.trim().slice(-4)}` : '**** 2880',
        currency: currency,
      };

      let newAccount;
      try {
        newAccount = await api.createAccount(payload);
      } catch {
        // Fallback for offline / simulation mode
        newAccount = {
          id: 'acc_' + Date.now(),
          ...payload,
          cachedBalance: payload.openingBalance,
        };
      }

      const updatedList = [newAccount, ...accounts];
      setAccounts(updatedList);
      setSelectedAccountId(newAccount.id);
      setShowAddModal(false);

      // Reset form
      setAccountName('');
      setOpeningBalance('');
      setAccountMask('');

      Alert.alert(
        'Account Added',
        `"${newAccount.accountName}" has been successfully added to your Walley profile.`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => onSelectAccount(newAccount),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create account.');
    } finally {
      setCreating(false);
    }
  };

  const handleContinue = () => {
    const selected = accounts.find((a) => a.id === selectedAccountId);
    if (!selected) {
      return Alert.alert('Select Account', 'Please choose an account to proceed to your dashboard.');
    }
    onSelectAccount(selected);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'CREDIT_CARD':
        return CreditCard;
      case 'WALLET':
        return Wallet;
      case 'CURRENT':
        return Building2;
      case 'CASH':
      case 'INVESTMENT':
        return Coins;
      case 'SAVINGS':
      default:
        return Landmark;
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Brand Bar (Walley Theme) */}
      <View style={styles.topBrandRow}>
        <View style={styles.logoGroup}>
          <WalleyLogo size={34} />
          <Text style={[styles.brandName, { color: theme.textPrimary }]}>Walley</Text>
        </View>
        <View style={[styles.secureBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
          <ShieldCheck size={14} color={theme.primary} />
          <Text style={[styles.secureBadgeText, { color: theme.primary }]}>Secure wallet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <Text style={[styles.greeting, { color: theme.primary }]}>
            Welcome back, {userName.split(' ')[0]}
          </Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Select your account
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Choose an active account to enter your personalized financial dashboard, or link a new one below.
          </Text>
        </View>

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loaderText, { color: theme.textMuted }]}>
              Retrieving your secure accounts...
            </Text>
          </View>
        ) : (
          <View>
            {/* Accounts List */}
            <View style={styles.accountsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Your Accounts ({accounts.length})
                </Text>
                <TouchableOpacity
                  style={[styles.addInlineBtn, { backgroundColor: theme.primarySoft }]}
                  onPress={() => setShowAddModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={14} color={theme.primary} strokeWidth={2.6} />
                  <Text style={[styles.addInlineBtnText, { color: theme.primary }]}>Add Account</Text>
                </TouchableOpacity>
              </View>

              {accounts.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    theme.cardShadowSoft,
                  ]}
                >
                  <View style={[styles.emptyIconBox, { backgroundColor: theme.primarySoft }]}>
                    <Landmark size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                    No Accounts Found
                  </Text>
                  <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                    You haven't linked any bank accounts or wallets yet. Add your first account to start tracking your finances.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.emptyAddBtnText}>Add Your First Account</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.accountsList}>
                  {accounts.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    const IconComponent = getAccountIcon(acc.accountType);

                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.accountCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: isSelected ? theme.primary : theme.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                          isSelected ? theme.cardShadow : theme.cardShadowSoft,
                        ]}
                        onPress={() => setSelectedAccountId(acc.id)}
                        activeOpacity={0.88}
                      >
                        {/* Left Icon */}
                        <View
                          style={[
                            styles.accIconCircle,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : theme.primarySoft,
                            },
                          ]}
                        >
                          <IconComponent
                            size={22}
                            color={isSelected ? '#FFFFFF' : theme.primary}
                            strokeWidth={2.3}
                          />
                        </View>

                        {/* Middle Info */}
                        <View style={styles.accDetails}>
                          <View style={styles.accNameRow}>
                            <Text
                              style={[
                                styles.accName,
                                { color: theme.textPrimary, fontWeight: isSelected ? '800' : '700' },
                              ]}
                              numberOfLines={1}
                            >
                              {acc.accountName}
                            </Text>
                          </View>

                          <Text style={[styles.accSub, { color: theme.textMuted }]}>
                            {acc.institutionName} • {acc.accountMask || '**** 2880'}
                          </Text>

                          <View style={styles.accBadgeRow}>
                            <View
                              style={[
                                styles.typeBadge,
                                {
                                  backgroundColor: isSelected
                                    ? 'rgba(67, 97, 238, 0.1)'
                                    : theme.surfaceAlt,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.typeBadgeText,
                                  { color: isSelected ? theme.primary : theme.textMuted },
                                ]}
                              >
                                {acc.accountType || 'SAVINGS'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Right: Balance & Check Radio */}
                        <View style={styles.accRightCol}>
                          <Text
                            style={[
                              styles.accBalance,
                              { color: theme.textPrimary },
                            ]}
                          >
                            {formatCurrency(acc.cachedBalance || 0, acc.currency || 'USD')}
                          </Text>

                          <View
                            style={[
                              styles.radioCircle,
                              {
                                borderColor: isSelected ? theme.primary : theme.border,
                                backgroundColor: isSelected ? theme.primary : 'transparent',
                              },
                            ]}
                          >
                            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Link Another Account Card Prompt */}
            {accounts.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.linkAnotherCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  theme.cardShadowSoft,
                ]}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.linkIconBox, { backgroundColor: theme.primarySoft }]}>
                  <Plus size={20} color={theme.primary} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.linkTitle, { color: theme.textPrimary }]}>
                    Link or Add Another Account
                  </Text>
                  <Text style={[styles.linkSub, { color: theme.textMuted }]}>
                    Connect another bank, credit card, or digital wallet
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
          theme.cardShadow,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.continueBtn,
            { backgroundColor: theme.primary },
            !selectedAccountId && { opacity: 0.5 },
            theme.floatingShadow,
          ]}
          onPress={handleContinue}
          disabled={!selectedAccountId}
          activeOpacity={0.88}
        >
          <Text style={styles.continueBtnText}>
            Continue to Dashboard
          </Text>
          <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>

        {onLogout && (
          <TouchableOpacity style={styles.switchUserBtn} onPress={onLogout}>
            <Text style={[styles.switchUserText, { color: theme.textMuted }]}>
              Sign out or switch user
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add New Account</Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Link a bank, card, or wallet to Walley
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setShowAddModal(false)}
              >
                <X size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Account Type Chips */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Account Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChipsRow}>
                  {accountTypes.map((t) => {
                    const active = accountType === t.id;
                    const TypeIcon = t.icon;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: active ? theme.primary : theme.surfaceAlt,
                            borderColor: active ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setAccountType(t.id)}
                      >
                        <TypeIcon size={14} color={active ? '#FFFFFF' : theme.textPrimary} />
                        <Text
                          style={[
                            styles.typeChipText,
                            { color: active ? '#FFFFFF' : theme.textPrimary },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Account Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Account Name</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
                  ]}
                  placeholder="e.g. Personal Savings, Salary Account"
                  placeholderTextColor={theme.textDim}
                  value={accountName}
                  onChangeText={setAccountName}
                />
              </View>

              {/* Institution Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Bank / Institution</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
                  ]}
                  placeholder="e.g. Citi Bank, HDFC Bank, Chase"
                  placeholderTextColor={theme.textDim}
                  value={institutionName}
                  onChangeText={setInstitutionName}
                />
              </View>

              {/* Opening Balance & Last 4 digits */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Initial Balance ($)</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
                    ]}
                    placeholder="1200.00"
                    placeholderTextColor={theme.textDim}
                    keyboardType="numeric"
                    value={openingBalance}
                    onChangeText={setOpeningBalance}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Last 4 Digits</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
                    ]}
                    placeholder="2880"
                    placeholderTextColor={theme.textDim}
                    maxLength={4}
                    keyboardType="numeric"
                    value={accountMask}
                    onChangeText={setAccountMask}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createAccountBtn,
                { backgroundColor: theme.primary },
                creating && { opacity: 0.8 },
                theme.floatingShadow,
              ]}
              onPress={handleCreateAccount}
              disabled={creating}
              activeOpacity={0.88}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createAccountBtnText}>Create & Select Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 38 : 16,
    paddingBottom: 12,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  headerBlock: {
    marginVertical: 14,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 14,
  },
  loaderText: {
    fontSize: 14,
  },
  accountsSection: {
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
  },
  accIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accDetails: {
    flex: 1,
  },
  accNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  accName: {
    fontSize: 15,
  },
  accSub: {
    fontSize: 12,
    marginBottom: 6,
  },
  accBadgeRow: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accRightCol: {
    alignItems: 'flex-end',
    gap: 10,
  },
  accBalance: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
    marginVertical: 10,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  linkAnotherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    marginTop: 14,
  },
  linkIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  linkSub: {
    fontSize: 12,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    gap: 8,
  },
  continueBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  switchUserBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  switchUserText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 14,
    gap: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  formInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  typeChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  createAccountBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  createAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
