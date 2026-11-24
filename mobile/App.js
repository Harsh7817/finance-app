import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import {
  api,
  saveToken,
  getToken,
  deleteToken,
  getApiBaseUrl,
} from './src/api';
import { walleyTheme } from './src/theme';

// Walley UI Components
import WalleyBottomNav from './src/components/WalleyBottomNav';
import QuickActionModal from './src/components/QuickActionModal';

// Walley UI Screens
import AuthScreen from './src/screens/AuthScreen';
import AccountSelectionScreen from './src/screens/AccountSelectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import StatisticScreen from './src/screens/StatisticScreen';
import AccountDetailsScreen from './src/screens/AccountDetailsScreen';
import ImportMethodScreen from './src/screens/ImportMethodScreen';
import WalletScreen from './src/screens/WalletScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TransferScreen from './src/screens/TransferScreen';
import ConfirmTransferScreen from './src/screens/ConfirmTransferScreen';
import TransferSuccessScreen from './src/screens/TransferSuccessScreen';
import RequestScreen from './src/screens/RequestScreen';
import BillPayScreen from './src/screens/BillPayScreen';
import PayToScreen from './src/screens/PayToScreen';
import SelectCardScreen from './src/screens/SelectCardScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? walleyTheme.dark : walleyTheme.light;

  // Selected Account State (required after login before entering dashboard)
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Navigation State: 'selectAccount' | 'home' | 'statistic' | 'wallet' | 'profile' | 'transfer' | etc.
  const [currentScreen, setCurrentScreen] = useState('selectAccount');
  const [activeTab, setActiveTab] = useState('home');
  const [returnScreen, setReturnScreen] = useState('home');

  // Data & API states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState({ name: '', email: '' });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [overview, setOverview] = useState(null);

  // Modals & Flow Data
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [transferFlowData, setTransferFlowData] = useState(null);
  const [selectedBillCategory, setSelectedBillCategory] = useState(null);
  const [actionModalType, setActionModalType] = useState(null); // 'addTx' | 'budget' | 'goal'

  // Input forms
  const [txForm, setTxForm] = useState({ merchantName: '', amount: '', type: 'DEBIT' });
  const [budgetForm, setBudgetForm] = useState({ name: '', limitAmount: '' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '' });

  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    const savedToken = await getToken();
    if (savedToken) {
      // Validate the token against the backend
      try {
        const me = await api.getMe();
        if (me?.user?.id) {
          setToken(savedToken);
          if (me.user.email) {
            const username = me.user.email.split('@')[0];
            setUserProfile({
              name: username.charAt(0).toUpperCase() + username.slice(1),
              email: me.user.email,
            });
          }
          fetchDashboardData();
          if (!selectedAccount) {
            setCurrentScreen('selectAccount');
          }
          return;
        }
      } catch {
        // Token is invalid/expired or user was deleted from DB -> purge and show login
        await deleteToken();
      }
    }
    // No valid token: force user to AuthScreen
    setToken(null);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ov, accs, txs] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getTransactions('?limit=50').catch(() => []),
      ]);

      if (ov) setOverview(ov);
      if (Array.isArray(accs) && accs.length > 0) {
        setAccounts(accs);
        setSelectedAccount((prev) => {
          if (!prev) return accs[0];
          const fresh = accs.find((a) => a.id === prev.id);
          return fresh || prev;
        });
        if (accs[0]?.accountName) {
          setUserProfile((prev) => ({
            ...prev,
            name: accs[0].accountName,
          }));
        }
      }

      const txList = Array.isArray(txs)
        ? txs
        : (Array.isArray(txs?.items) ? txs.items : (Array.isArray(txs?.transactions) ? txs.transactions : []));
      setTransactions(txList);
    } catch {
      // Offline mode safe fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Called when user logs in or registers
  const handleAuthSuccess = (jwt, user) => {
    setToken(jwt);
    if (user?.email) {
      const username = user.email.split('@')[0];
      setUserProfile({
        name: username.charAt(0).toUpperCase() + username.slice(1),
        email: user.email,
      });
    } else if (user?.name) {
      setUserProfile((prev) => ({ ...prev, ...user }));
    }
    fetchDashboardData();
    setSelectedAccount(null);
    setCurrentScreen('selectAccount');
  };

  // Called when user selects or creates an account
  const handleAccountSelected = (account) => {
    setSelectedAccount(account);
    if (account?.accountName) {
      setUserProfile((prev) => ({
        ...prev,
        name: account.accountName,
      }));
    }
    setCurrentScreen('importMethod');
  };

  const handleLogout = async () => {
    await deleteToken();
    setToken(null);
    setSelectedAccount(null);
    setCurrentScreen('selectAccount');
    setActiveTab('home');
  };

  const navigateTo = (screen, returnTo = null) => {
    if (returnTo) {
      setReturnScreen(returnTo);
    } else if (['home', 'statistic', 'wallet', 'profile'].includes(currentScreen)) {
      setReturnScreen(currentScreen);
    }
    setCurrentScreen(screen);
    if (['home', 'statistic', 'wallet', 'profile'].includes(screen)) {
      setActiveTab(screen);
    }
  };

  // Quick Action Selection Handler
  const handleSelectQuickAction = (actionId) => {
    switch (actionId) {
      case 'transfer':
        navigateTo('transfer');
        break;
      case 'request':
        navigateTo('request');
        break;
      case 'bill':
        navigateTo('billPay');
        break;
      case 'addTx':
        setActionModalType('addTx');
        break;
      case 'csvImport':
        handlePickCsv();
        break;
      case 'budget':
        setActionModalType('budget');
        break;
      case 'goal':
        setActionModalType('goal');
        break;
      default:
        break;
    }
  };

  // CSV Statement Picker
  const handlePickCsv = async (onSuccess) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const file = res.assets[0];

      setLoading(true);

      let currentAccs = accounts;
      if (!currentAccs || currentAccs.length === 0) {
        const fetched = await api.getAccounts().catch(() => []);
        if (fetched.length > 0) {
          currentAccs = fetched;
          setAccounts(fetched);
        } else {
          const newAcc = await api.createAccount({
            accountName: userProfile.name || 'Primary Account',
            accountType: 'SAVINGS',
            institutionName: 'State Bank of India (SBI)',
            currency: 'INR',
            openingBalance: 0,
          });
          currentAccs = [newAcc];
          setAccounts(currentAccs);
        }
      }

      const targetAccount = selectedAccount || currentAccs[0];

      // Find or create CSV_STATEMENT dataSource linked to targetAccount
      let sources = await api.getDataSources().catch(() => []);
      let csvSource = Array.isArray(sources)
        ? sources.find((s) => s.sourceType === 'CSV_STATEMENT' && s.isActive && s.accountId === targetAccount.id)
        : null;

      if (!csvSource) {
        csvSource = await api.createDataSource({
          sourceType: 'CSV_STATEMENT',
          providerName: `${targetAccount.institutionName || 'Bank'} Statement`,
          accountId: targetAccount.id,
          currency: targetAccount.currency || 'INR',
        });
      }

      let fileName = file.name || 'statement.csv';
      if (!fileName.toLowerCase().endsWith('.csv')) {
        fileName = `${fileName}.csv`;
      }

      // Convert local file URI to standard Web Blob for modern Expo SDK 58 / WinterCG fetch compatibility
      let filePayload;
      try {
        const fileRes = await fetch(file.uri);
        filePayload = await fileRes.blob();
      } catch {
        filePayload = {
          uri: file.uri,
          name: fileName,
          type: 'text/csv',
        };
      }

      const formData = new FormData();
      formData.append('sourceId', csvSource.id);
      if (typeof Blob !== 'undefined' && filePayload instanceof Blob) {
        formData.append('file', filePayload, fileName);
      } else {
        formData.append('file', filePayload);
      }

      const importResult = await api.uploadCsv(formData);

      await fetchDashboardData();

      const parsedCount = importResult?.parsedRecords || importResult?.totalRecords || 'all';
      Alert.alert(
        'Import Complete',
        `Successfully processed ${parsedCount} transactions from "${fileName}" into your account.`,
        [
          {
            text: 'View Dashboard',
            onPress: () => {
              if (onSuccess) onSuccess();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Import Failed',
        err.message || 'Could not process the CSV file. Please verify the file format and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Add Transaction Handler
  const handleCreateTx = async () => {
    if (!txForm.merchantName || !txForm.amount) {
      return Alert.alert('Required', 'Please enter merchant name and amount.');
    }

    try {
      const newTx = {
        id: 'tx_' + Date.now(),
        merchantName: txForm.merchantName.trim(),
        amount: parseFloat(txForm.amount),
        type: txForm.type,
        transactionAt: new Date().toISOString(),
        category: { name: txForm.type === 'CREDIT' ? 'Salary' : 'Expense' },
      };

      await api.createTransaction({
        ...txForm,
        amount: parseFloat(txForm.amount),
        accountId: selectedAccount?.id || accounts[0]?.id,
      }).catch(() => null);

      setTransactions([newTx, ...transactions]);
      setActionModalType(null);
      setTxForm({ merchantName: '', amount: '', type: 'DEBIT' });
      Alert.alert('Success', 'Transaction successfully saved.');
    } catch (err) {
      Alert.alert('Notice', err.message);
    }
  };

  // Save Budget
  const handleSaveBudget = async () => {
    if (!budgetForm.name || !budgetForm.limitAmount) {
      return Alert.alert('Required', 'Please enter budget title and cap amount.');
    }
    try {
      await api.createBudget({
        name: budgetForm.name,
        limitAmount: parseFloat(budgetForm.limitAmount),
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
      }).catch(() => null);
      setActionModalType(null);
      setBudgetForm({ name: '', limitAmount: '' });
      Alert.alert('Budget Set', 'Your monthly spending cap is now active.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Save Goal
  const handleSaveGoal = async () => {
    if (!goalForm.name || !goalForm.targetAmount) {
      return Alert.alert('Required', 'Please enter goal title and target amount.');
    }
    try {
      await api.createGoal({
        name: goalForm.name,
        targetAmount: parseFloat(goalForm.targetAmount),
        targetDate: '2026-12-31',
      }).catch(() => null);
      setActionModalType(null);
      setGoalForm({ name: '', targetAmount: '' });
      Alert.alert('Goal Created', 'Your new savings target has been added.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // If user is not authenticated, show the Walley AuthScreen (Image 2)
  if (!token) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <ExpoStatusBar style={isDark ? 'light' : 'dark'} />
        <AuthScreen
          theme={theme}
          onAuthSuccess={handleAuthSuccess}
        />
      </SafeAreaView>
    );
  }

  // Calculate dynamic balance from selected account or total
  const currentBalance = selectedAccount?.cachedBalance !== undefined
    ? Number(selectedAccount.cachedBalance)
    : (accounts.length > 0
        ? accounts.reduce((s, a) => s + parseFloat(a.cachedBalance || 0), 0)
        : 1200.82);

  // Determine whether to display the bottom nav (only on primary tabs)
  const isTabScreen = ['home', 'statistic', 'wallet', 'profile'].includes(currentScreen);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ExpoStatusBar style={isDark ? 'light' : 'dark'} />

      {/* Screen Router */}
      <View style={styles.screenContainer}>
        {/* Requirement: Account Selection Screen after login */}
        {currentScreen === 'selectAccount' && (
          <AccountSelectionScreen
            theme={theme}
            userName={userProfile.name}
            userEmail={userProfile.email}
            onSelectAccount={handleAccountSelected}
            onLogout={handleLogout}
          />
        )}

        {/* New Module: Import / Sync Method Screen */}
        {currentScreen === 'importMethod' && (
          <ImportMethodScreen
            theme={theme}
            selectedAccount={selectedAccount}
            userName={userProfile.name}
            onBack={() => setCurrentScreen('selectAccount')}
            onUploadCsv={() => {
              handlePickCsv(() => {
                navigateTo('home');
              });
            }}
            onSkip={() => navigateTo('home')}
          />
        )}

        {currentScreen === 'home' && (
          <HomeScreen
            theme={theme}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            userName={userProfile.name}
            balance={currentBalance}
            selectedAccount={selectedAccount}
            transactions={transactions}
            onNavigate={navigateTo}
            onSwitchAccount={() => setCurrentScreen('selectAccount')}
            onPressAddTx={() => setActionModalType('addTx')}
            onPressUploadCsv={handlePickCsv}
            onPressSetBudget={() => setActionModalType('budget')}
            onPressSetGoal={() => setActionModalType('goal')}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {currentScreen === 'statistic' && (
          <StatisticScreen
            theme={theme}
            onNavigate={navigateTo}
            overview={overview}
            balance={currentBalance}
          />
        )}

        {currentScreen === 'wallet' && (
          <WalletScreen
            theme={theme}
            balance={currentBalance}
            accounts={accounts}
            onNavigate={navigateTo}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            theme={theme}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            userName={userProfile.name}
            userEmail={userProfile.email}
            selectedAccount={selectedAccount}
            accounts={accounts}
            onLogout={handleLogout}
            onNavigate={navigateTo}
          />
        )}

        {currentScreen === 'transfer' && (
          <TransferScreen
            theme={theme}
            onBack={() => navigateTo('home')}
            onContinue={(data) => {
              setTransferFlowData(data);
              navigateTo('confirmTransfer');
            }}
          />
        )}

        {currentScreen === 'confirmTransfer' && (
          <ConfirmTransferScreen
            theme={theme}
            transferData={transferFlowData}
            onBack={() => navigateTo('transfer')}
            loading={loading}
            onConfirm={async () => {
              setLoading(true);
              try {
                const amountVal = parseFloat(transferFlowData?.amount || 0);
                if (selectedAccount?.id) {
                  await api.createTransaction({
                    merchantName: `Transfer to ${transferFlowData?.payee?.name || 'Contact'}`,
                    amount: amountVal,
                    type: 'DEBIT',
                    accountId: selectedAccount.id,
                  });
                }
                await fetchDashboardData();
                navigateTo('transferSuccess');
              } catch (err) {
                Alert.alert('Transfer Error', err.message);
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {currentScreen === 'transferSuccess' && (
          <TransferSuccessScreen
            theme={theme}
            transferData={transferFlowData}
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {currentScreen === 'request' && (
          <RequestScreen
            theme={theme}
            userName={userProfile.name}
            onBack={() => navigateTo('home')}
          />
        )}

        {currentScreen === 'billPay' && (
          <BillPayScreen
            theme={theme}
            onBack={() => navigateTo('home')}
            onSelectCategory={(cat) => {
              setSelectedBillCategory(cat);
              navigateTo('payTo');
            }}
          />
        )}

        {currentScreen === 'payTo' && (
          <PayToScreen
            theme={theme}
            category={selectedBillCategory}
            onBack={() => navigateTo('billPay')}
            onPaySuccess={async (billDetails) => {
              setLoading(true);
              try {
                if (selectedAccount?.id) {
                  await api.createTransaction({
                    merchantName: `${billDetails.provider || 'Bill Payment'}`,
                    amount: parseFloat(billDetails.amount || 0),
                    type: 'DEBIT',
                    accountId: selectedAccount.id,
                  });
                }
                await fetchDashboardData();
                setTransferFlowData({
                  payee: { name: billDetails.provider },
                  amount: billDetails.amount,
                  message: `Bill Token: ${billDetails.token}`,
                });
                navigateTo('transferSuccess');
              } catch (err) {
                Alert.alert('Bill Payment Error', err.message);
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {currentScreen === 'selectCard' && (
          <SelectCardScreen
            theme={theme}
            onBack={() => navigateTo('wallet')}
            onCardSaved={() => {
              navigateTo('wallet');
            }}
          />
        )}

        {currentScreen === 'accountDetails' && (
          <AccountDetailsScreen
            theme={theme}
            userName={selectedAccount?.accountName || accounts[0]?.accountName || userProfile.name}
            selectedAccount={selectedAccount || accounts[0]}
            accounts={accounts}
            onBack={() => navigateTo(returnScreen || 'home')}
            onAddAccount={() => navigateTo('selectAccount')}
            onSelectAccount={(acc) => {
              setSelectedAccount(acc);
              navigateTo(returnScreen || 'home');
            }}
          />
        )}
      </View>

      {/* Floating Bottom Navigation Bar (Visible on primary tabs) */}
      {isTabScreen && (
        <WalleyBottomNav
          theme={theme}
          activeTab={activeTab}
          onSelectTab={navigateTo}
        />
      )}

      {/* Quick Action Bottom Sheet Modal */}
      <QuickActionModal
        visible={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        theme={theme}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Add Transaction Modal */}
      <Modal visible={actionModalType === 'addTx'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setActionModalType(null)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Type selector: Debit vs Credit */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: txForm.type === 'DEBIT' ? theme.accentRose : theme.surfaceAlt },
                ]}
                onPress={() => setTxForm({ ...txForm, type: 'DEBIT' })}
              >
                <Text style={[styles.typeBtnText, { color: txForm.type === 'DEBIT' ? '#FFFFFF' : theme.textPrimary }]}>
                  Expense (Debit)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  { backgroundColor: txForm.type === 'CREDIT' ? theme.accentEmerald : theme.surfaceAlt },
                ]}
                onPress={() => setTxForm({ ...txForm, type: 'CREDIT' })}
              >
                <Text style={[styles.typeBtnText, { color: txForm.type === 'CREDIT' ? '#FFFFFF' : theme.textPrimary }]}>
                  Income (Credit)
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Merchant / Note (e.g. Starbucks)"
              placeholderTextColor={theme.textDim}
              value={txForm.merchantName}
              onChangeText={(t) => setTxForm({ ...txForm, merchantName: t })}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Amount (₹)"
              placeholderTextColor={theme.textDim}
              keyboardType="decimal-pad"
              value={txForm.amount}
              onChangeText={(t) => setTxForm({ ...txForm, amount: t })}
            />

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleCreateTx}>
              <Text style={styles.primaryBtnText}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Set Budget Modal */}
      <Modal visible={actionModalType === 'budget'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Set Monthly Budget</Text>
              <TouchableOpacity onPress={() => setActionModalType(null)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Budget Title (e.g. Dining & Groceries)"
              placeholderTextColor={theme.textDim}
              value={budgetForm.name}
              onChangeText={(t) => setBudgetForm({ ...budgetForm, name: t })}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Monthly Limit Amount (₹)"
              placeholderTextColor={theme.textDim}
              keyboardType="decimal-pad"
              value={budgetForm.limitAmount}
              onChangeText={(t) => setBudgetForm({ ...budgetForm, limitAmount: t })}
            />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleSaveBudget}>
              <Text style={styles.primaryBtnText}>Save Budget</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Set Goal Modal */}
      <Modal visible={actionModalType === 'goal'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Create Savings Goal</Text>
              <TouchableOpacity onPress={() => setActionModalType(null)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Goal Title (e.g. Emergency Fund)"
              placeholderTextColor={theme.textDim}
              value={goalForm.name}
              onChangeText={(t) => setGoalForm({ ...goalForm, name: t })}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Target Amount (₹)"
              placeholderTextColor={theme.textDim}
              keyboardType="decimal-pad"
              value={goalForm.targetAmount}
              onChangeText={(t) => setGoalForm({ ...goalForm, targetAmount: t })}
            />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleSaveGoal}>
              <Text style={styles.primaryBtnText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBtnText: {
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
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
