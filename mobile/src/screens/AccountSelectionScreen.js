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
  ShieldCheck,
  Building2,
  X,
  LogOut,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Trash2,
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
  const [menuAccount, setMenuAccount] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);

  // New Account Form State
  const [accountName, setAccountName] = useState('');
  const [institutionName, setInstitutionName] = useState('State Bank of India (SBI)');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [openingBalance, setOpeningBalance] = useState('1200.00');
  const [ifscCode, setIfscCode] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const banksList = [
    'State Bank of India (SBI)',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank (PNB)',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'IndusInd Bank',
    'Yes Bank',
    'Federal Bank',
    'IDFC FIRST Bank',
    'Citi Bank',
    'Chase Bank',
    'Bank of America',
    'HSBC',
    'Standard Chartered',
    'DBS Bank',
  ];

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
        setAccounts([]);
        setSelectedAccountId(null);
      }
    } catch {
      setAccounts([]);
      setSelectedAccountId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      return Alert.alert('Required', 'Please enter the account holder name.');
    }
    if (!institutionName.trim()) {
      return Alert.alert('Required', 'Please select a bank.');
    }

    setCreating(true);
    try {
      const generatedMask = ifscCode.trim()
        ? `**** ${ifscCode.trim().slice(-4)}`
        : '**** 2880';

      const payload = {
        accountName: accountName.trim(),
        institutionName: institutionName.trim(),
        accountType: accountType,
        openingBalance: parseFloat(openingBalance) || 0,
        accountMask: generatedMask,
        currency: currency,
        ifscCode: ifscCode.trim().toUpperCase(),
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
      setShowAddModal(false);

      // Reset form
      setAccountName('');
      setOpeningBalance('');
      setIfscCode('');
      setShowBankDropdown(false);

      Alert.alert(
        'Account Created',
        `"${newAccount.accountName}" has been successfully added to your accounts.`
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create account.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAccountMenu = (acc) => {
    setMenuAccount(acc);
    setShowMenuModal(true);
  };

  const handleRequestDelete = () => {
    const accToDelete = menuAccount;
    setShowMenuModal(false);
    setTimeout(() => {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete the account?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => confirmDeleteAccount(accToDelete),
          },
        ],
        { cancelable: true }
      );
    }, 120);
  };

  const confirmDeleteAccount = async (accToDelete) => {
    if (!accToDelete) return;
    try {
      await api.deleteAccount(accToDelete.id);
      const remaining = accounts.filter((a) => a.id !== accToDelete.id);
      setAccounts(remaining);
      if (selectedAccountId === accToDelete.id) {
        setSelectedAccountId(remaining[0]?.id || null);
      }
      setMenuAccount(null);
      Alert.alert('Account Deleted', `"${accToDelete.accountName}" has been successfully deleted.`);
    } catch (err) {
      Alert.alert('Delete Failed', err.message || 'Could not delete the account. Please check your connection.');
    }
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
                      <View
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
                      >
                        {/* Main selectable area */}
                        <TouchableOpacity
                          style={styles.accCardContent}
                          onPress={() => {
                            setSelectedAccountId(acc.id);
                            onSelectAccount(acc);
                          }}
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

                        {/* Three Vertical Dots on the right side */}
                        <TouchableOpacity
                          style={styles.threeDotsBtn}
                          onPress={() => handleOpenAccountMenu(acc)}
                          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <MoreVertical size={18} color={theme.textMuted} strokeWidth={2.4} />
                        </TouchableOpacity>
                      </View>
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

      {/* Bottom Sticky Action Bar — Logout only */}
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
          style={[styles.logoutBtn, { borderColor: theme.border }]}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#EF4444" strokeWidth={2.4} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
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

              {/* Account Holder Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Account Holder Name</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
                  ]}
                  placeholder="e.g. Subhash Srija, Arya Wijaya"
                  placeholderTextColor={theme.textDim}
                  value={accountName}
                  onChangeText={setAccountName}
                />
              </View>

              {/* Bank Dropdown */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Bank</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: showBankDropdown ? theme.primary : theme.inputBorder,
                    },
                  ]}
                  onPress={() => setShowBankDropdown((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      { color: institutionName ? theme.textPrimary : theme.textDim },
                    ]}
                  >
                    {institutionName || 'Select a Bank'}
                  </Text>
                  {showBankDropdown ? (
                    <ChevronUp size={18} color={theme.primary} />
                  ) : (
                    <ChevronDown size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>

                {showBankDropdown && (
                  <View
                    style={[
                      styles.dropdownMenu,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                      theme.cardShadowSoft,
                    ]}
                  >
                    <ScrollView
                      style={{ maxHeight: 180 }}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {banksList.map((b) => {
                        const isSelected = institutionName === b;
                        return (
                          <TouchableOpacity
                            key={b}
                            style={[
                              styles.dropdownItem,
                              isSelected && { backgroundColor: theme.primarySoft },
                            ]}
                            onPress={() => {
                              setInstitutionName(b);
                              setShowBankDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                { color: isSelected ? theme.primary : theme.textPrimary },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              {b}
                            </Text>
                            {isSelected && <Check size={16} color={theme.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* IFSC Code */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>IFSC Code</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
                  ]}
                  placeholder="e.g. SBIN0001234, HDFC0000060"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="characters"
                  maxLength={11}
                  value={ifscCode}
                  onChangeText={(t) => setIfscCode(t.toUpperCase())}
                />
              </View>

              {/* Initial Balance */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Initial Balance (₹)</Text>
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
                <Text style={styles.createAccountBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Options Menu Modal (triggered by 3-dots) */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View
            style={[
              styles.menuCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadow,
            ]}
          >
            <View style={styles.menuCardHeader}>
              <View style={[styles.menuIconCircle, { backgroundColor: theme.primarySoft }]}>
                <Landmark size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuAccountName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {menuAccount?.accountName}
                </Text>
                <Text style={[styles.menuAccountSub, { color: theme.textMuted }]}>
                  {menuAccount?.institutionName} • {menuAccount?.accountMask || '**** 2880'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.menuCloseBtn}
                onPress={() => setShowMenuModal(false)}
              >
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuDivider} />

            {/* Delete Account Option */}
            <TouchableOpacity
              style={styles.menuActionItem}
              onPress={handleRequestDelete}
              activeOpacity={0.7}
            >
              <View style={styles.deleteIconBox}>
                <Trash2 size={18} color="#EF4444" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deleteActionText}>Delete Account</Text>
                <Text style={[styles.deleteActionSub, { color: theme.textMuted }]}>
                  Remove this account from your profile
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCancelBtn, { backgroundColor: theme.surfaceAlt }]}
              onPress={() => setShowMenuModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuCancelText, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  accountsList: {
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 20,
  },
  accCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  threeDotsBtn: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  logoutBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
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
  dropdownTrigger: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 16,
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuAccountName: {
    fontSize: 16,
    fontWeight: '800',
  },
  menuAccountSub: {
    fontSize: 12,
    marginTop: 2,
  },
  menuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  menuActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
  },
  deleteIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteActionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  menuCancelBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
