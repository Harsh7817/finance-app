import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {
  User,
  Shield,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  Eye,
  Bell,
  Check,
  FileText,
  Trash2,
  Mail,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react-native';

export default function ProfileScreen({
  theme,
  isDark,
  onToggleTheme,
  userName = 'Arya Wijaya',
  userEmail = 'arya.wijaya@walley.app',
  selectedAccount = null,
  accounts = [],
  onLogout,
  onNavigate,
}) {
  // Modal states
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Settings states
  const [compactNumbers, setCompactNumbers] = useState(false);
  const [biometricLock, setBiometricLock] = useState(true);
  const [hideBalances, setHideBalances] = useState(false);
  const [requireTransferConfirm, setRequireTransferConfirm] = useState(true);
  const [txAlerts, setTxAlerts] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);

  // FAQ state
  const [selectedFaqCategory, setSelectedFaqCategory] = useState('All');
  const [expandedFaqId, setExpandedFaqId] = useState(0);

  const faqData = [
    {
      id: 0,
      category: 'Accounts',
      question: 'How do I link a new bank account or card?',
      answer:
        'Go to Accounts or Profile, tap "My Account" or "Add New Account". Select your bank from the bank dropdown list, enter your account number and IFSC code, and tap "Create Account". Your new account will instantly appear in Walley.',
    },
    {
      id: 1,
      category: 'Accounts',
      question: 'How do I view or hide my full account number?',
      answer:
        'In the Account Details screen, tap the eye icon beside your masked account number (e.g. XXXXXXX0274). It will toggle between the masked format and your full account number securely.',
    },
    {
      id: 2,
      category: 'Accounts',
      question: 'How do I delete or remove an account?',
      answer:
        'In the Account Selection screen, tap the three vertical dots (⋮) on the right side of any account card and select "Delete Account". A confirmation popup will ask "Are you sure you want to delete the account?". Confirming deletes the account immediately.',
    },
    {
      id: 3,
      category: 'Statements',
      question: 'How does CSV bank statement upload work?',
      answer:
        'On the Home screen or when selecting an account, choose "Upload CSV Statement". Select your bank statement CSV file. Walley automatically detects the date, description, and debit/credit amounts to calculate your balance and populate your transactions list.',
    },
    {
      id: 4,
      category: 'Statements',
      question: 'What is SMS Parsing and when will it be available?',
      answer:
        'SMS Parsing is an automated feature in active development that analyzes incoming transactional SMS from your bank in real time to record expenses automatically. It is marked as Upcoming and will launch in an upcoming release.',
    },
    {
      id: 5,
      category: 'Security',
      question: 'Is my financial data safe with Walley?',
      answer:
        'Absolutely. Walley uses bank-grade AES-256 encryption. We never store your bank login credentials, NetBanking passwords, or debit card PINs. Biometric keys remain locked in your phone’s hardware enclave.',
    },
    {
      id: 6,
      category: 'Security',
      question: 'How do I enable biometric authentication?',
      answer:
        'Open Setting from the Profile screen and ensure the "Biometric App Lock" toggle is turned on. When enabled, Walley will prompt for Face ID or Fingerprint whenever the app is reopened.',
    },
    {
      id: 7,
      category: 'Statements',
      question: 'How do I set a monthly spending budget or savings goal?',
      answer:
        'On the Home screen under Featured, tap "Set Monthly Budget" to specify a monthly spending cap, or tap "New Savings Goal" to track progress toward a specific financial milestone.',
    },
  ];

  const filteredFaqs =
    selectedFaqCategory === 'All'
      ? faqData
      : faqData.filter((item) => item.category === selectedFaqCategory);

  const menuItems = [
    {
      id: 'account',
      title: 'My Account',
      subtitle: 'View linked accounts, balances & details',
      icon: User,
      onPress: () => {
        if (onNavigate) {
          onNavigate('accountDetails', 'profile');
        }
      },
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Bank-grade encryption & security standards',
      icon: Shield,
      onPress: () => setShowPrivacyModal(true),
    },
    {
      id: 'settings',
      title: 'Setting',
      subtitle: 'Security, display & notification preferences',
      icon: SettingsIcon,
      onPress: () => setShowSettingsModal(true),
    },
    {
      id: 'help',
      title: 'Help Center',
      subtitle: 'FAQs, guides & 24/7 support',
      icon: HelpCircle,
      onPress: () => setShowHelpModal(true),
    },
  ];

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear temporary offline cache and local logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cache Cleared', 'Temporary cache has been cleared successfully.');
          },
        },
      ]
    );
  };

  const handleResetPreferences = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all notification and display preferences to factory defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setCompactNumbers(false);
            setBiometricLock(true);
            setHideBalances(false);
            setRequireTransferConfirm(true);
            setTxAlerts(true);
            setBudgetAlerts(true);
            Alert.alert('Reset Complete', 'Preferences have been restored to defaults.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card Profile Header (Without mobile number) */}
        <View
          style={[
            styles.profileHero,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          {/* Avatar with circular aura */}
          <View style={[styles.avatarAura, { borderColor: theme.primaryLight }]}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
              <User size={38} color={theme.primary} strokeWidth={2.4} />
            </View>
          </View>

          <Text style={[styles.nameText, { color: theme.textPrimary }]}>{userName}</Text>
          <Text style={[styles.emailText, { color: theme.textMuted }]}>{userEmail}</Text>

          <View style={[styles.memberBadge, { backgroundColor: theme.primarySoft }]}>
            <Shield size={12} color={theme.primary} strokeWidth={2.5} />
            <Text style={[styles.memberBadgeText, { color: theme.primary }]}>Verified Profile</Text>
          </View>
        </View>

        {/* Theme Switch Row */}
        <View
          style={[
            styles.themeSwitchCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          <View>
            <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.menuSub, { color: theme.textMuted }]}>
              {isDark ? 'Dark theme active' : 'Light theme active'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={onToggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Menu Items List */}
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  theme.cardShadowSoft,
                ]}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
                  <Icon size={20} color={theme.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.menuSub, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textDim} />
              </TouchableOpacity>
            );
          })}

          {/* Logout Action */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              { backgroundColor: theme.surface, borderColor: 'rgba(244, 63, 94, 0.25)' },
              theme.cardShadowSoft,
            ]}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to log out of Walley?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: onLogout },
              ]);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
              <LogOut size={20} color={theme.accentRose} strokeWidth={2.2} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: theme.accentRose }]}>Logout</Text>
              <Text style={[styles.menuSub, { color: theme.textMuted }]}>
                End current active session
              </Text>
            </View>
            <ChevronRight size={18} color={theme.accentRose} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          1. PRIVACY POLICY MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: theme.primarySoft }]}>
                  <Shield size={20} color={theme.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Privacy Policy</Text>
                  <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                    Bank-Grade Security & Protection
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setShowPrivacyModal(false)}
              >
                <X size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.policyCard}>
                <View style={styles.policyRow}>
                  <CheckCircle2 size={18} color={theme.primary} strokeWidth={2.4} />
                  <Text style={[styles.policyHeading, { color: theme.textPrimary }]}>
                    1. Bank-Grade 256-Bit Encryption
                  </Text>
                </View>
                <Text style={[styles.policyText, { color: theme.textMuted }]}>
                  All financial communications, account masks, and session tokens are encrypted using
                  industry-standard AES-256 GCM algorithms at rest and TLS 1.3 in transit.
                </Text>
              </View>

              <View style={styles.policyCard}>
                <View style={styles.policyRow}>
                  <CheckCircle2 size={18} color={theme.primary} strokeWidth={2.4} />
                  <Text style={[styles.policyHeading, { color: theme.textPrimary }]}>
                    2. Zero-Knowledge Credential Policy
                  </Text>
                </View>
                <Text style={[styles.policyText, { color: theme.textMuted }]}>
                  Walley never asks for, captures, or stores your NetBanking passwords, UPI MPINs, or ATM
                  PINs. Your authentication keys remain strictly confidential to you.
                </Text>
              </View>

              <View style={styles.policyCard}>
                <View style={styles.policyRow}>
                  <CheckCircle2 size={18} color={theme.primary} strokeWidth={2.4} />
                  <Text style={[styles.policyHeading, { color: theme.textPrimary }]}>
                    3. Statement & Transaction Privacy
                  </Text>
                </View>
                <Text style={[styles.policyText, { color: theme.textMuted }]}>
                  Data imported via bank statement CSVs is parsed strictly to build your personal financial
                  dashboard and analytics. We never sell, lease, or monetize your transaction histories
                  with third-party advertisers.
                </Text>
              </View>

              <View style={styles.policyCard}>
                <View style={styles.policyRow}>
                  <CheckCircle2 size={18} color={theme.primary} strokeWidth={2.4} />
                  <Text style={[styles.policyHeading, { color: theme.textPrimary }]}>
                    4. Device-Isolated Biometrics
                  </Text>
                </View>
                <Text style={[styles.policyText, { color: theme.textMuted }]}>
                  Biometric signatures (Face ID and Fingerprint) operate solely through Apple Secure Enclave
                  and Android Keystore APIs. Raw biometric data never leaves your personal phone.
                </Text>
              </View>

              <View style={styles.policyCard}>
                <View style={styles.policyRow}>
                  <CheckCircle2 size={18} color={theme.primary} strokeWidth={2.4} />
                  <Text style={[styles.policyHeading, { color: theme.textPrimary }]}>
                    5. Account Ownership & Data Rights
                  </Text>
                </View>
                <Text style={[styles.policyText, { color: theme.textMuted }]}>
                  You maintain 100% ownership over your data. You may delete any linked bank account or wipe
                  your profile data at any time from your account settings.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowPrivacyModal(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>I Understand & Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          2. SETTINGS MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: theme.primarySoft }]}>
                  <SettingsIcon size={20} color={theme.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Settings</Text>
                  <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                    Preferences & Security Controls
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setShowSettingsModal(false)}
              >
                <X size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Group 1: Appearance & Display */}
              <Text style={[styles.settingGroupTitle, { color: theme.primary }]}>APPEARANCE</Text>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Dark Mode</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Switch between dark and light themes
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={onToggleTheme}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Compact Numbers</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Abbreviate large balances (e.g. ₹4.7K vs ₹4,732.17)
                  </Text>
                </View>
                <Switch
                  value={compactNumbers}
                  onValueChange={setCompactNumbers}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Group 2: Security & Privacy */}
              <Text style={[styles.settingGroupTitle, { color: theme.primary, marginTop: 18 }]}>
                SECURITY & PRIVACY
              </Text>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                    Biometric App Lock
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Prompt Face ID / Fingerprint on resume
                  </Text>
                </View>
                <Switch
                  value={biometricLock}
                  onValueChange={setBiometricLock}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Privacy Mode</Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Hide balances on home screen by default
                  </Text>
                </View>
                <Switch
                  value={hideBalances}
                  onValueChange={setHideBalances}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                    Confirm Before Transfer
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Require review before sending money
                  </Text>
                </View>
                <Switch
                  value={requireTransferConfirm}
                  onValueChange={setRequireTransferConfirm}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Group 3: Notifications */}
              <Text style={[styles.settingGroupTitle, { color: theme.primary, marginTop: 18 }]}>
                NOTIFICATIONS
              </Text>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                    Transaction Alerts
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Get notified immediately on debits and credits
                  </Text>
                </View>
                <Switch
                  value={txAlerts}
                  onValueChange={setTxAlerts}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                    Budget Overrun Warning
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Alert when spending crosses 80% of budget
                  </Text>
                </View>
                <Switch
                  value={budgetAlerts}
                  onValueChange={setBudgetAlerts}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Group 4: Storage & Data */}
              <Text style={[styles.settingGroupTitle, { color: theme.primary, marginTop: 18 }]}>
                STORAGE & SYSTEM
              </Text>

              <TouchableOpacity
                style={[styles.settingActionBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={handleClearCache}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingActionText, { color: theme.textPrimary }]}>
                  Clear Offline Cache
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingActionBtn, { backgroundColor: '#FEF2F2', marginTop: 10 }]}
                onPress={handleResetPreferences}
                activeOpacity={0.8}
              >
                <Text style={[styles.settingActionText, { color: '#EF4444' }]}>
                  Reset Settings to Default
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowSettingsModal(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Save & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          3. HELP CENTER & FAQS MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: theme.primarySoft }]}>
                  <HelpCircle size={20} color={theme.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Help Center</Text>
                  <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                    Frequently Asked Questions & Support
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setShowHelpModal(false)}
              >
                <X size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Category Chips */}
            <View style={styles.faqFilterRow}>
              {['All', 'Accounts', 'Statements', 'Security'].map((cat) => {
                const isSelected = selectedFaqCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.faqFilterChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surfaceAlt,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedFaqCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.faqFilterChipText,
                        { color: isSelected ? '#FFFFFF' : theme.textPrimary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <TouchableOpacity
                    key={faq.id}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isExpanded ? theme.primary : theme.border,
                      },
                      theme.cardShadowSoft,
                    ]}
                    onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.faqQuestionRow}>
                      <Text
                        style={[
                          styles.faqQuestion,
                          { color: isExpanded ? theme.primary : theme.textPrimary },
                        ]}
                      >
                        {faq.question}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color={theme.primary} />
                      ) : (
                        <ChevronDown size={18} color={theme.textMuted} />
                      )}
                    </View>

                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <Text style={[styles.faqAnswer, { color: theme.textMuted }]}>
                          {faq.answer}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Support Contact Info Box */}
              <View style={[styles.supportCard, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.supportTitle, { color: theme.primary }]}>Still need help?</Text>
                <Text style={[styles.supportSub, { color: theme.textPrimary }]}>
                  Our 24/7 financial support team is always ready to assist you.
                </Text>
                <View style={styles.supportContactRow}>
                  <Mail size={16} color={theme.primary} />
                  <Text style={[styles.supportContactText, { color: theme.primary }]}>
                    support@walley.app
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowHelpModal(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Close Help Center</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHero: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  avatarAura: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeSwitchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    marginBottom: 16,
    maxHeight: 400,
  },
  primaryActionBtn: {
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Policy Styles */
  policyCard: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  policyHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  policyText: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 26,
  },

  /* Settings Styles */
  settingGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingActionBtn: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingActionText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* FAQ Styles */
  faqFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  faqFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  faqFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  faqItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswerContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
  },
  supportCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 6,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  supportSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  supportContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  supportContactText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
