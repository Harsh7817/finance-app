import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Target,
  Repeat,
  Upload,
  Plus,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  api,
  saveToken,
  getToken,
  deleteToken,
  setApiHost,
  DEFAULT_API_HOST,
} from './src/api';
import { colors, formatINR } from './src/constants';

export default function App() {
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'transactions' | 'budgets' | 'goals' | 'recurring'
  const [loading, setLoading] = useState(false);
  const [hostInput, setHostInput] = useState(DEFAULT_API_HOST);

  // Auth form
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard Data
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modals
  const [modalType, setModalType] = useState(null); // 'tx' | 'budget' | 'goal' | 'account' | 'contrib'
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Form states
  const [txForm, setTxForm] = useState({ merchantName: '', amount: '', type: 'DEBIT', categoryId: '' });
  const [budgetForm, setBudgetForm] = useState({ name: '', limitAmount: '', periodStart: '2026-11-01', periodEnd: '2026-11-30' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', targetDate: '2026-12-31' });
  const [accountForm, setAccountForm] = useState({ accountName: '', institutionName: 'HDFC Bank', initialBalance: '25000' });
  const [contribAmount, setContribAmount] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const saved = await getToken();
    if (saved) {
      setToken(saved);
      loadAllData();
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ov, accs, txs, bData, gData, rData, catData] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getTransactions('?limit=25').catch(() => ({ transactions: [] })),
        api.getBudgets().catch(() => ({ budgets: [] })),
        api.getGoals().catch(() => ({ goals: [] })),
        api.getRecurring().catch(() => ({ commitments: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
      ]);

      setOverview(ov);
      setAccounts(Array.isArray(accs) ? accs : []);
      setTransactions(txs?.transactions || []);
      setBudgets(bData?.budgets || []);
      setGoals(gData?.goals || []);
      setRecurring(rData?.commitments || []);
      setCategories(catData?.categories || []);
    } catch (err) {
      Alert.alert('Connection Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    setLoading(true);
    try {
      if (authMode === 'register') {
        await api.register(email, password);
      }
      const data = await api.login(email, password);
      const jwt = data?.token || data?.accessToken;
      await saveToken(jwt);
      setToken(jwt);
      loadAllData();
    } catch (err) {
      Alert.alert('Auth Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await deleteToken();
    setToken(null);
  };

  const handleCreateTx = async () => {
    try {
      await api.createTransaction({
        ...txForm,
        amount: parseFloat(txForm.amount),
        categoryId: txForm.categoryId || categories[0]?.id,
        accountId: accounts[0]?.id,
      });
      setModalType(null);
      setTxForm({ merchantName: '', amount: '', type: 'DEBIT', categoryId: '' });
      loadAllData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCreateBudget = async () => {
    try {
      await api.createBudget({
        ...budgetForm,
        limitAmount: parseFloat(budgetForm.limitAmount),
      });
      setModalType(null);
      loadAllData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleCreateGoal = async () => {
    try {
      await api.createGoal({
        ...goalForm,
        targetAmount: parseFloat(goalForm.targetAmount),
      });
      setModalType(null);
      loadAllData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddContribution = async () => {
    if (!selectedGoal) return;
    try {
      await api.addContribution(selectedGoal.id, {
        amount: parseFloat(contribAmount),
        notes: 'Mobile app contribution',
      });
      setModalType(null);
      setContribAmount('');
      loadAllData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handlePickCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const file = res.assets[0];

      setLoading(true);

      // Ensure account and data source
      let currentAccs = accounts;
      if (!currentAccs || currentAccs.length === 0) {
        const newAcc = await api.createAccount({
          accountName: 'Primary Bank Account',
          accountType: 'SAVINGS',
          institutionName: 'Bank',
          currency: 'INR',
          initialBalance: 25000,
        });
        currentAccs = [newAcc];
        setAccounts(currentAccs);
      }

      let sources = await api.getDataSources().catch(() => []);
      let csvSource = Array.isArray(sources) ? sources.find((s) => s.sourceType === 'CSV_STATEMENT' && s.isActive) : null;
      if (!csvSource) {
        csvSource = await api.createDataSource({
          sourceType: 'CSV_STATEMENT',
          providerName: 'Mobile Statement Upload',
          accountId: currentAccs[0].id,
          currency: 'INR',
        });
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'text/csv',
      });
      formData.append('sourceId', csvSource.id);

      await api.uploadCsv(formData);
      Alert.alert('Success', 'CSV statement parsed and transactions imported!');
      loadAllData();
    } catch (err) {
      Alert.alert('Import Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectRecurring = async () => {
    try {
      setLoading(true);
      const res = await api.detectRecurring();
      Alert.alert('Analysis Complete', `Found ${res.detected} recurring pattern(s).`);
      loadAllData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authHeader}>
            <View style={styles.appIconWrapper}>
              <Wallet size={36} color="#fff" />
            </View>
            <Text style={styles.appTitle}>Finance Advisor</Text>
            <Text style={styles.appSubtitle}>AI Personal Finance & Expenditure Mobile</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                onPress={() => setAuthMode('login')}
                style={[styles.tabToggleBtn, authMode === 'login' && styles.tabToggleActive]}>
                <Text style={[styles.tabToggleText, authMode === 'login' && styles.tabToggleTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAuthMode('register')}
                style={[styles.tabToggleBtn, authMode === 'register' && styles.tabToggleActive]}>
                <Text style={[styles.tabToggleText, authMode === 'register' && styles.tabToggleTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor={colors.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              secureTextEntry
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>{authMode === 'login' ? 'Sign In to Mobile App' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
          <Text style={styles.brandTitle}>Smart Finance</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={loadAllData}>
            <RefreshCw size={18} color={colors.textMain} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: 'rgba(244,63,94,0.3)' }]} onPress={handleLogout}>
            <LogOut size={18} color={colors.accentRose} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <View>
            {/* Total Balance Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroSub}>NET ASSETS</Text>
              <Text style={styles.heroAmount}>
                {formatINR(overview?.cashFlow?.netCashFlow || accounts.reduce((s, a) => s + parseFloat(a.cachedBalance || 0), 0))}
              </Text>
              <View style={styles.heroSplit}>
                <View>
                  <Text style={styles.flowLabel}><ArrowDownLeft size={12} color={colors.accentEmerald} /> Inflow</Text>
                  <Text style={styles.incomeVal}>{formatINR(overview?.cashFlow?.totalIncome || 0)}</Text>
                </View>
                <View>
                  <Text style={styles.flowLabel}><ArrowUpRight size={12} color={colors.accentRose} /> Outflow</Text>
                  <Text style={styles.expenseVal}>{formatINR(overview?.cashFlow?.totalExpenses || 0)}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionItem} onPress={() => setModalType('tx')}>
                <View style={styles.actionIconBox}><Plus size={20} color={colors.accentPrimary} /></View>
                <Text style={styles.actionText}>Add Tx</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={handlePickCsv}>
                <View style={styles.actionIconBox}><Upload size={20} color={colors.accentEmerald} /></View>
                <Text style={styles.actionText}>CSV Import</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => setModalType('budget')}>
                <View style={styles.actionIconBox}><PieChart size={20} color={colors.accentAmber} /></View>
                <Text style={styles.actionText}>Set Budget</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => setModalType('goal')}>
                <View style={styles.actionIconBox}><Target size={20} color={colors.accentPurple} /></View>
                <Text style={styles.actionText}>New Goal</Text>
              </TouchableOpacity>
            </View>

            {/* Accounts Horizontal Scroll */}
            <Text style={styles.sectionHeader}>ACCOUNTS ({accounts.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
              {accounts.map((acc) => (
                <View key={acc.id} style={styles.accountCard}>
                  <Text style={styles.accInstitution}>{acc.institutionName}</Text>
                  <Text style={styles.accName}>{acc.accountName}</Text>
                  <Text style={styles.accBal}>{formatINR(acc.cachedBalance)}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Recent Transactions */}
            <Text style={styles.sectionHeader}>RECENT TRANSACTIONS</Text>
            {transactions.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIconBox, { backgroundColor: tx.type === 'CREDIT' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }]}>
                  {tx.type === 'CREDIT' ? (
                    <ArrowDownLeft size={18} color={colors.accentEmerald} />
                  ) : (
                    <ArrowUpRight size={18} color={colors.accentRose} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txMerchant}>{tx.merchantName}</Text>
                  <Text style={styles.txMeta}>{tx.category?.name || 'Expense'} • {new Date(tx.transactionAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? colors.accentEmerald : colors.textMain }]}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Transactions</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setModalType('tx')}>
                <Plus size={14} color="#fff" />
                <Text style={styles.smallBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {transactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIconBox, { backgroundColor: tx.type === 'CREDIT' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }]}>
                  {tx.type === 'CREDIT' ? <ArrowDownLeft size={18} color={colors.accentEmerald} /> : <ArrowUpRight size={18} color={colors.accentRose} />}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txMerchant}>{tx.merchantName}</Text>
                  <Text style={styles.txMeta}>{tx.category?.name} • {new Date(tx.transactionAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'CREDIT' ? colors.accentEmerald : colors.textMain }]}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* BUDGETS TAB */}
        {activeTab === 'budgets' && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Budgets</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setModalType('budget')}>
                <Plus size={14} color="#fff" />
                <Text style={styles.smallBtnText}>New Budget</Text>
              </TouchableOpacity>
            </View>
            {budgets.map((b) => {
              const spent = parseFloat(b.spentAmount || 0);
              const limit = parseFloat(b.limitAmount || 1);
              const pct = Math.min(100, Math.round((spent / limit) * 100));
              return (
                <View key={b.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{b.name}</Text>
                    <Text style={{ color: pct >= 80 ? colors.accentRose : colors.accentEmerald, fontWeight: '700' }}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct >= 80 ? colors.accentRose : colors.accentPrimary }]} />
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardMeta}>Spent: {formatINR(spent)}</Text>
                    <Text style={styles.cardMeta}>Cap: {formatINR(limit)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Savings Goals</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setModalType('goal')}>
                <Plus size={14} color="#fff" />
                <Text style={styles.smallBtnText}>New Goal</Text>
              </TouchableOpacity>
            </View>
            {goals.map((g) => {
              const current = parseFloat(g.cachedCurrentAmount || 0);
              const target = parseFloat(g.targetAmount || 1);
              const pct = Math.min(100, Math.round((current / target) * 100));
              return (
                <View key={g.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{g.name}</Text>
                    <Text style={{ color: colors.accentPurple, fontWeight: '700' }}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.accentPurple }]} />
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardMeta}>Saved: {formatINR(current)}</Text>
                    <Text style={styles.cardMeta}>Target: {formatINR(target)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btnSecondary, { marginTop: 10 }]}
                    onPress={() => {
                      setSelectedGoal(g);
                      setModalType('contrib');
                    }}>
                    <Text style={styles.btnSecondaryText}>+ Record Contribution</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* RECURRING TAB */}
        {activeTab === 'recurring' && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Subscriptions</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={handleDetectRecurring}>
                <RefreshCw size={14} color="#fff" />
                <Text style={styles.smallBtnText}>Auto-Detect</Text>
              </TouchableOpacity>
            </View>
            {recurring.map((r) => (
              <View key={r.id} style={styles.txRow}>
                <View style={[styles.txIconBox, { backgroundColor: colors.bgTertiary }]}>
                  <Repeat size={18} color={colors.accentPrimary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txMerchant}>{r.merchantName}</Text>
                  <Text style={styles.txMeta}>{r.frequency} • Next: {new Date(r.nextExpectedDate).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.txAmount}>{formatINR(r.expectedAmount)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('home')}>
          <Wallet size={20} color={activeTab === 'home' ? colors.accentPrimary : colors.textDim} />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('transactions')}>
          <ArrowDownLeft size={20} color={activeTab === 'transactions' ? colors.accentPrimary : colors.textDim} />
          <Text style={[styles.navText, activeTab === 'transactions' && styles.navTextActive]}>Txns</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('budgets')}>
          <PieChart size={20} color={activeTab === 'budgets' ? colors.accentPrimary : colors.textDim} />
          <Text style={[styles.navText, activeTab === 'budgets' && styles.navTextActive]}>Budgets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('goals')}>
          <Target size={20} color={activeTab === 'goals' ? colors.accentPrimary : colors.textDim} />
          <Text style={[styles.navText, activeTab === 'goals' && styles.navTextActive]}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveTab('recurring')}>
          <Repeat size={20} color={activeTab === 'recurring' ? colors.accentPrimary : colors.textDim} />
          <Text style={[styles.navText, activeTab === 'recurring' && styles.navTextActive]}>Recurring</Text>
        </TouchableOpacity>
      </View>

      {/* Add Transaction Modal */}
      <Modal visible={modalType === 'tx'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setModalType(null)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Merchant (e.g. Starbucks)"
              placeholderTextColor={colors.textDim}
              value={txForm.merchantName}
              onChangeText={(t) => setTxForm({ ...txForm, merchantName: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (INR)"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              value={txForm.amount}
              onChangeText={(t) => setTxForm({ ...txForm, amount: t })}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateTx}>
              <Text style={styles.btnPrimaryText}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Goal Contribution Modal */}
      <Modal visible={modalType === 'contrib'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Deposit to {selectedGoal?.name}</Text>
              <TouchableOpacity onPress={() => setModalType(null)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Contribution Amount (INR)"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              value={contribAmount}
              onChangeText={setContribAmount}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAddContribution}>
              <Text style={styles.btnPrimaryText}>Confirm Deposit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Budget Modal */}
      <Modal visible={modalType === 'budget'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Set Budget</Text>
              <TouchableOpacity onPress={() => setModalType(null)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Budget Name (e.g. Groceries Cap)"
              placeholderTextColor={colors.textDim}
              value={budgetForm.name}
              onChangeText={(t) => setBudgetForm({ ...budgetForm, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Limit Amount (INR)"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              value={budgetForm.limitAmount}
              onChangeText={(t) => setBudgetForm({ ...budgetForm, limitAmount: t })}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateBudget}>
              <Text style={styles.btnPrimaryText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={modalType === 'goal'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Create Goal</Text>
              <TouchableOpacity onPress={() => setModalType(null)}><X size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Goal Name (e.g. Vacation Fund)"
              placeholderTextColor={colors.textDim}
              value={goalForm.name}
              onChangeText={(t) => setGoalForm({ ...goalForm, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Target Amount (INR)"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              value={goalForm.targetAmount}
              onChangeText={(t) => setGoalForm({ ...goalForm, targetAmount: t })}
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateGoal}>
              <Text style={styles.btnPrimaryText}>Save Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  authContainer: { flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center' },
  authScroll: { padding: 24, justifyContent: 'center' },
  authHeader: { alignItems: 'center', marginBottom: 28 },
  appIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: { fontSize: 24, fontWeight: '800', color: colors.textMain },
  appSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderColor,
    padding: 16,
    marginBottom: 14,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgTertiary,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabToggleActive: { backgroundColor: colors.accentPrimary },
  tabToggleText: { fontSize: 12, fontWeight: '700', color: colors.textDim },
  tabToggleTextActive: { color: '#fff' },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 12,
    color: colors.textMain,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  btnPrimary: {
    backgroundColor: colors.accentPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.accentPrimary, fontSize: 12, fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 30 : 10,
    paddingBottom: 14,
  },
  welcomeLabel: { fontSize: 10, fontWeight: '700', color: colors.textDim },
  brandTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  topBarActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainScroll: { paddingHorizontal: 20, paddingBottom: 90 },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  heroSub: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  heroAmount: { fontSize: 32, fontWeight: '800', color: colors.textMain, marginVertical: 6 },
  heroSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flowLabel: { fontSize: 11, color: colors.textDim },
  incomeVal: { fontSize: 15, fontWeight: '700', color: colors.accentEmerald, marginTop: 2 },
  expenseVal: { fontSize: 15, fontWeight: '700', color: colors.accentRose, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionItem: { alignItems: 'center', gap: 6 },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: colors.textDim, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  accountsScroll: { flexDirection: 'row', marginBottom: 20 },
  accountCard: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
    minWidth: 140,
  },
  accInstitution: { fontSize: 10, color: colors.textDim, fontWeight: '700' },
  accName: { fontSize: 13, fontWeight: '700', color: colors.textMain, marginVertical: 4 },
  accBal: { fontSize: 14, fontWeight: '800', color: colors.accentPrimary },
  txRow: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  txIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txMerchant: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  txMeta: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800', color: colors.textMain },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  smallBtn: {
    backgroundColor: colors.accentPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textMain },
  cardMeta: { fontSize: 12, color: colors.textDim },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(15,20,30,0.95)',
    borderTopWidth: 1,
    borderColor: colors.borderColor,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 6,
  },
  navBtn: { alignItems: 'center', gap: 3 },
  navText: { fontSize: 10, fontWeight: '600', color: colors.textDim },
  navTextActive: { color: colors.accentPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: colors.borderColor,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },
});
