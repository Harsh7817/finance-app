import React, { useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from './api';
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
  Bell,
  CheckCircle,
  AlertTriangle,
  FileText,
  CreditCard,
  TrendingUp,
  X,
  Search,
  Brain,
  Activity,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(getAuthToken());
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'transactions' | 'budgets' | 'goals' | 'recurring'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Auth State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Main Dashboard Data
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [recurringAlerts, setRecurringAlerts] = useState(null);
  const [categories, setCategories] = useState([]);

  // Phase 10 Intelligence & Prediction Data
  const [healthScore, setHealthScore] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [spendingPatterns, setSpendingPatterns] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  // Phase 11 Smart Expenditure Advisor Data & Modal
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [advisoryHistory, setAdvisoryHistory] = useState([]);
  const [advisorySummary, setAdvisorySummary] = useState(null);
  const [advisorForm, setAdvisorForm] = useState({ purchaseAmount: '', itemDescription: '', categoryId: '', userNotes: '' });
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState({});

  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showUploadCsvModal, setShowUploadCsvModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(null);

  // Form States
  const [newTx, setNewTx] = useState({ accountId: '', categoryId: '', amount: '', type: 'DEBIT', merchantName: '', description: '' });
  const [newBudget, setNewBudget] = useState({ name: '', limitAmount: '', periodStart: '', periodEnd: '', categoryId: '' });
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', targetDate: '', monthlyTargetContribution: '' });
  const [newAccount, setNewAccount] = useState({ accountName: '', accountType: 'SAVINGS', institutionName: 'HDFC Bank', currency: 'INR', initialBalance: '50000' });
  const [contributionAmount, setContributionAmount] = useState('');
  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    if (token) {
      loadAllData();
    }
  }, [token]);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ovData, accData, txData, bData, gData, rData, catData] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getTransactions('?limit=25').catch(() => ({ transactions: [] })),
        api.getBudgets().catch(() => ({ budgets: [] })),
        api.getGoals().catch(() => ({ goals: [] })),
        api.getRecurring().catch(() => ({ commitments: [] })),
        api.getCategories().catch(() => ({ categories: [] })),
      ]);

      setOverview(ovData);
      setAccounts(Array.isArray(accData) ? accData : []);
      setTransactions(txData?.transactions || []);
      setBudgets(bData?.budgets || []);
      setGoals(gData?.goals || []);
      setRecurring(rData?.commitments || []);
      setCategories(catData?.categories || []);

      // Load Alerts, Intelligence & Advisory asynchronously
      api.getBudgetAlerts().then(res => setBudgetAlerts(res?.alerts || [])).catch(() => {});
      api.getRecurringAlerts().then(res => setRecurringAlerts(res)).catch(() => {});
      api.getHealthScore().then(res => setHealthScore(res)).catch(() => {});
      api.getForecast().then(res => setForecast(res)).catch(() => {});
      api.getSpendingPatterns().then(res => setSpendingPatterns(res)).catch(() => {});
      api.getAnomalies().then(res => setAnomalies(res)).catch(() => {});
      api.getAdvisoryHistory('?limit=5').then(res => setAdvisoryHistory(res?.history || [])).catch(() => {});
      api.getAdvisorySummary().then(res => setAdvisorySummary(res)).catch(() => {});
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'register') {
        await api.register(email, password);
        showToast('Registered successfully! Logging in...');
      }
      const data = await api.login(email, password);
      const jwt = data?.token || data?.accessToken;
      setAuthToken(jwt);
      setToken(jwt);
      showToast('Logged in successfully!');
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setToken(null);
  };

  // Add Transaction
  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        ...newTx,
        amount: parseFloat(newTx.amount),
        categoryId: newTx.categoryId || categories[0]?.id,
        accountId: newTx.accountId || accounts[0]?.id,
      });
      showToast('Transaction created!');
      setShowAddTxModal(false);
      loadAllData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Create Budget
  const handleCreateBudget = async (e) => {
    e.preventDefault();
    try {
      await api.createBudget({
        ...newBudget,
        limitAmount: parseFloat(newBudget.limitAmount),
        categoryId: newBudget.categoryId || null,
      });
      showToast('Budget created!');
      setShowAddBudgetModal(false);
      loadAllData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Create Goal
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await api.createGoal({
        ...newGoal,
        targetAmount: parseFloat(newGoal.targetAmount),
        monthlyTargetContribution: parseFloat(newGoal.monthlyTargetContribution || 0),
      });
      showToast('Goal created!');
      setShowAddGoalModal(false);
      loadAllData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Add Goal Contribution
  const handleAddContribution = async (e) => {
    e.preventDefault();
    if (!showContributionModal) return;
    try {
      await api.addContribution(showContributionModal.id, {
        amount: parseFloat(contributionAmount),
        notes: 'Mobile app deposit',
      });
      showToast('Contribution recorded!');
      setShowContributionModal(null);
      setContributionAmount('');
      loadAllData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Add Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.createAccount({
        ...newAccount,
        initialBalance: parseFloat(newAccount.initialBalance || 0),
      });
      showToast('Account added!');
      setShowAddAccountModal(false);
      loadAllData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // CSV Statement Upload
  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) return showToast('Please select a CSV file', true);
    setLoading(true);
    try {
      // 1. Ensure user has a FinancialAccount (DataSource requires an account)
      let currentAccounts = accounts;
      if (!currentAccounts || currentAccounts.length === 0) {
        const newAcc = await api.createAccount({
          accountName: 'Primary Bank Account',
          accountType: 'SAVINGS',
          institutionName: 'Main Bank',
          currency: 'INR',
          initialBalance: 25000
        });
        currentAccounts = [newAcc];
        setAccounts(currentAccounts);
      }

      // 2. Fetch existing data sources or create one linked to the account
      let sources = await api.getSources().catch(() => []);
      let csvSource = Array.isArray(sources) ? sources.find(s => s.sourceType === 'CSV_STATEMENT' && s.isActive) : null;
      
      if (!csvSource) {
        csvSource = await api.createSource({
          sourceType: 'CSV_STATEMENT',
          providerName: 'Bank CSV Statement',
          accountId: currentAccounts[0]?.id,
          currency: 'INR'
        });
      }

      // 3. Prepare FormData with required 'file' and 'sourceId'
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('sourceId', csvSource.id);

      await api.uploadCsv(formData);
      showToast('CSV statement imported and parsed successfully!');
      setShowUploadCsvModal(false);
      setCsvFile(null);
      await loadAllData();
    } catch (err) {
      console.error('CSV Import Error:', err);
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Recurring Detection
  const handleDetectRecurring = async () => {
    try {
      const res = await api.detectRecurring();
      showToast(`Analyzed! Found ${res.detected} recurring pattern(s).`);
      loadAllData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Phase 11: Evaluate Purchase with Smart Expenditure Advisor
  const handleEvaluatePurchase = async (e) => {
    e.preventDefault();
    if (!advisorForm.purchaseAmount || !advisorForm.itemDescription) {
      return showToast('Item description and amount are required', true);
    }
    setEvaluating(true);
    try {
      const res = await api.evaluatePurchase({
        purchaseAmount: parseFloat(advisorForm.purchaseAmount),
        itemDescription: advisorForm.itemDescription,
        categoryId: advisorForm.categoryId || null,
        userNotes: advisorForm.userNotes || null,
      });
      setEvaluationResult(res);
      showToast(`Recommendation: ${res.decisionOutcome}`);
      api.getAdvisoryHistory('?limit=5').then(r => setAdvisoryHistory(r?.history || [])).catch(() => {});
      api.getAdvisorySummary().then(s => setAdvisorySummary(s)).catch(() => {});
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setEvaluating(false);
    }
  };

  // Submit Feedback on Advisory Decision
  const handleAdvisoryFeedback = async (requestId, wasHelpful) => {
    try {
      await api.submitAdvisoryFeedback(requestId, {
        rating: wasHelpful ? 5 : 2,
        feedbackText: wasHelpful ? 'User marked as helpful' : 'User found unhelpful',
        wasHelpful,
      });
      setFeedbackSent(prev => ({ ...prev, [requestId]: wasHelpful }));
      showToast('Thank you for your feedback!');
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Format INR Currency
  const formatINR = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  // If Not Authenticated -> Show Mobile Auth Screen
  if (!token) {
    return (
      <div className="app-container">
        <div className="status-bar">
          <span>9:41</span>
          <span>5G • 100%</span>
        </div>
        <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, background: 'var(--accent-gradient)',
              display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
            }}>
              <Wallet size={32} color="#fff" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Finance Advisor</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              AI-Powered Personal Finance & Smart Expenditure
            </p>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
              <button
                onClick={() => setAuthMode('login')}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 8,
                  background: authMode === 'login' ? 'var(--accent-primary)' : 'transparent',
                  color: authMode === 'login' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer'
                }}>
                Log In
              </button>
              <button
                onClick={() => setAuthMode('register')}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 8,
                  background: authMode === 'register' ? 'var(--accent-primary)' : 'transparent',
                  color: authMode === 'register' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer'
                }}>
                Register
              </button>
            </div>

            {error && (
              <div style={{ padding: 10, background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: 10, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="demo@financeapp.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Processing...' : authMode === 'login' ? 'Sign In to App' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Mobile App Shell
  return (
    <div className="app-container">
      {/* Mobile Status Bar */}
      <div className="status-bar">
        <span>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>5G</span>
          <div style={{ width: 18, height: 10, border: '1px solid var(--text-muted)', borderRadius: 3, padding: 1 }}>
            <div style={{ width: '80%', height: '100%', background: 'var(--accent-emerald)', borderRadius: 1 }} />
          </div>
        </div>
      </div>

      {/* Floating Notifications / Toasts */}
      {error && (
        <div style={{
          position: 'absolute', top: 44, left: 20, right: 20, zIndex: 150,
          background: '#E11D48', color: '#fff', padding: '10px 14px', borderRadius: 12,
          fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 20px rgba(225, 29, 72, 0.4)'
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div style={{
          position: 'absolute', top: 44, left: 20, right: 20, zIndex: 150,
          background: '#059669', color: '#fff', padding: '10px 14px', borderRadius: 12,
          fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 20px rgba(5, 150, 105, 0.4)'
        }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Screen Content View */}
      <div className="screen-scroll">
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>WELCOME BACK</div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Smart Finance</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => showToast('Syncing with PostgreSQL database...')}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 8, color: 'var(--text-main)', cursor: 'pointer' }}>
              <Bell size={16} />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 8, color: 'var(--accent-rose)', cursor: 'pointer' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* TAB 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <div>
            {/* Balance Hero Card */}
            <div className="hero-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>
                    TOTAL ASSETS
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, margin: '4px 0 14px', letterSpacing: -0.5 }}>
                    {formatINR(overview?.cashFlow?.netCashFlow || accounts.reduce((s, a) => s + parseFloat(a.cachedBalance || 0), 0))}
                  </div>
                </div>
                <span className="badge badge-green">LIVE</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowDownLeft size={12} color="var(--accent-emerald)" /> Inflow
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-emerald)', marginTop: 2 }}>
                    {formatINR(overview?.cashFlow?.totalIncome || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUpRight size={12} color="var(--accent-rose)" /> Outflow
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-rose)', marginTop: 2 }}>
                    {formatINR(overview?.cashFlow?.totalExpenses || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="actions-grid">
              <button className="action-btn" onClick={() => setShowAddTxModal(true)}>
                <div className="action-icon"><Plus size={20} /></div>
                <span>Add Tx</span>
              </button>
              <button className="action-btn" onClick={() => setShowUploadCsvModal(true)}>
                <div className="action-icon"><Upload size={20} /></div>
                <span>Import CSV</span>
              </button>
              <button className="action-btn" onClick={() => setShowAddBudgetModal(true)}>
                <div className="action-icon"><PieChart size={20} /></div>
                <span>Set Budget</span>
              </button>
              <button className="action-btn" onClick={() => setShowAddAccountModal(true)}>
                <div className="action-icon"><CreditCard size={20} /></div>
                <span>New Acc</span>
              </button>
            </div>

            {/* Smart Expenditure Advisor Quick Entry Banner */}
            <div
              className="glass-card-interactive"
              onClick={() => {
                setEvaluationResult(null);
                setShowAdvisorModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.16) 0%, rgba(59, 130, 246, 0.12) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} color="#C084FC" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)' }}>Can I Afford This?</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ask AI Smart Expenditure Advisor</div>
                </div>
              </div>
              <button style={{ background: 'var(--accent-purple)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                Check Now
              </button>
            </div>

            {/* Connected Accounts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>ACCOUNTS ({accounts.length})</span>
              <button onClick={() => setShowAddAccountModal(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Add
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', marginBottom: 18 }}>
              {accounts.map(acc => (
                <div key={acc.id} style={{
                  minWidth: 150, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: 16, padding: '12px 14px', flexShrink: 0
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>{acc.institutionName}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, margin: '2px 0 8px' }}>{acc.accountName}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-primary)' }}>{formatINR(acc.cachedBalance)}</div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No accounts yet. Click + Add to start.</div>
              )}
            </div>

            {/* Recent Transactions Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>RECENT TRANSACTIONS</span>
              <button onClick={() => setActiveTab('transactions')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                See All
              </button>
            </div>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="glass-card-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: tx.type === 'CREDIT' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}>
                    {tx.type === 'CREDIT' ? <ArrowDownLeft size={18} color="var(--accent-emerald)" /> : <ArrowUpRight size={18} color="var(--accent-rose)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{tx.merchantName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{tx.category?.name || 'Expense'} • {new Date(tx.transactionAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  color: tx.type === 'CREDIT' ? 'var(--accent-emerald)' : 'var(--text-main)'
                }}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: TRANSACTIONS (Phase 5) */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Transactions</h2>
              <button onClick={() => setShowAddTxModal(true)} className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>
                <Plus size={14} /> Add Tx
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8 }}>
                <Search size={16} color="var(--text-dim)" />
                <input
                  type="text"
                  placeholder="Search merchant or category..."
                  className="form-input"
                  style={{ border: 'none', padding: 0, background: 'transparent' }}
                  onChange={(e) => api.getTransactions(`?search=${e.target.value}`).then(r => setTransactions(r?.transactions || []))}
                />
              </div>
            </div>

            {transactions.map(tx => (
              <div key={tx.id} className="glass-card-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: tx.type === 'CREDIT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}>
                    {tx.type === 'CREDIT' ? <ArrowDownLeft size={18} color="var(--accent-emerald)" /> : <ArrowUpRight size={18} color="var(--accent-rose)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{tx.merchantName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {tx.category?.name} • {new Date(tx.transactionAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800,
                    color: tx.type === 'CREDIT' ? 'var(--accent-emerald)' : 'var(--text-main)'
                  }}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                  </div>
                  <span className={`badge ${tx.type === 'CREDIT' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 9 }}>
                    {tx.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: BUDGETS (Phase 7) */}
        {activeTab === 'budgets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Budgets</h2>
              <button onClick={() => setShowAddBudgetModal(true)} className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>
                <Plus size={14} /> New Budget
              </button>
            </div>

            {budgetAlerts.length > 0 && (
              <div className="glass-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                  <AlertTriangle size={16} /> Budget Overspending Alert
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {budgetAlerts.length} budget(s) have exceeded warning thresholds.
                </div>
              </div>
            )}

            {budgets.map(b => {
              const spent = parseFloat(b.spentAmount || 0);
              const limit = parseFloat(b.limitAmount || 1);
              const pct = Math.min(100, Math.round((spent / limit) * 100));
              const isOver = pct >= 80;

              return (
                <div key={b.id} className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {b.category?.name || 'All Categories'} • {b.periodType}
                      </div>
                    </div>
                    <span className={`badge ${isOver ? 'badge-rose' : 'badge-green'}`}>
                      {pct}% SPENT
                    </span>
                  </div>

                  <div className="progress-track">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: isOver ? 'var(--accent-rose)' : 'var(--accent-primary)'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Spent: {formatINR(spent)}</span>
                    <span>Limit: {formatINR(limit)}</span>
                  </div>
                </div>
              );
            })}
            {budgets.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>
                No active budgets. Click 'New Budget' to track monthly caps.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINANCIAL GOALS (Phase 8) */}
        {activeTab === 'goals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Savings Goals</h2>
              <button onClick={() => setShowAddGoalModal(true)} className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12 }}>
                <Plus size={14} /> New Goal
              </button>
            </div>

            {goals.map(g => {
              const current = parseFloat(g.cachedCurrentAmount || 0);
              const target = parseFloat(g.targetAmount || 1);
              const pct = Math.min(100, Math.round((current / target) * 100));

              return (
                <div key={g.id} className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Target: {new Date(g.targetDate).toLocaleDateString()}</div>
                    </div>
                    <span className="badge badge-purple">{pct}%</span>
                  </div>

                  <div className="progress-track" style={{ height: 10, margin: '14px 0 8px' }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--accent-purple)' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                    <span style={{ color: 'var(--accent-purple)' }}>{formatINR(current)} saved</span>
                    <span style={{ color: 'var(--text-muted)' }}>Goal: {formatINR(target)}</span>
                  </div>

                  <button
                    onClick={() => setShowContributionModal(g)}
                    className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }}>
                    <Plus size={14} /> Deposit Contribution
                  </button>
                </div>
              );
            })}
            {goals.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)', fontSize: 13 }}>
                No financial goals set. Click 'New Goal' to begin saving!
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RECURRING EXPENDITURES (Phase 9) */}
        {activeTab === 'recurring' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Subscriptions</h2>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Recurring expenditure commitments</div>
              </div>
              <button onClick={handleDetectRecurring} className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: 11 }}>
                <TrendingUp size={14} /> Auto-Detect
              </button>
            </div>

            {/* Recurring Total Card */}
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>MONTHLY COMMITMENTS</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {formatINR(recurring.reduce((s, r) => s + parseFloat(r.expectedAmount || 0), 0))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                Across {recurring.length} active recurring services
              </div>
            </div>

            {recurring.map(r => (
              <div key={r.id} className="glass-card-interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Repeat size={18} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{r.merchantName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {r.frequency} • Due {new Date(r.nextExpectedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{formatINR(r.expectedAmount)}</div>
                  <span className={`badge ${r.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 9 }}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: PHASE 10 FINANCIAL INTELLIGENCE & PREDICTIONS */}
        {activeTab === 'intelligence' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Financial Intelligence</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Deterministic analytics & forecast engine</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={18} color="var(--accent-primary)" />
              </div>
            </div>

            {/* 1. FINANCIAL HEALTH SCORE CARD */}
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>FINANCIAL HEALTH INDEX</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-main)' }}>{healthScore?.score ?? '--'}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>/ 100</span>
                  </div>
                </div>
                <span className={`badge ${healthScore?.rating === 'EXCELLENT' || healthScore?.rating === 'GOOD' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                  {healthScore?.rating || 'EVALUATING'}
                </span>
              </div>

              {/* 5 Pillars Progress */}
              {healthScore?.pillarScores && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                  {Object.entries(healthScore.pillarScores).map(([key, val]) => {
                    const label = key === 'savingsRate' ? 'Savings Rate'
                      : key === 'incomeExpenseRatio' ? 'Income-to-Expense'
                      : key === 'budgetAdherence' ? 'Budget Adherence'
                      : key === 'recurringBurden' ? 'Recurring Burden'
                      : 'Goal Velocity';
                    const pct = (val.score / val.max) * 100;
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                          <span>{label}</span>
                          <span style={{ fontWeight: 600 }}>{val.score}/{val.max} pts</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: 4 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 75 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-primary)' : 'var(--accent-rose)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Diagnostic Recommendations */}
              {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
                <div style={{ marginTop: 14, padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={12} color="var(--accent-primary)" /> Key Takeaway
                  </div>
                  {healthScore.recommendations[0]}
                </div>
              )}
            </div>

            {/* 2. FORECASTING & BALANCE PROJECTION */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Month-End Expenditure Forecast</div>
                <span className="badge badge-blue" style={{ fontSize: 10 }}>{forecast?.forecastMonth || 'Current Month'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Projected Spend</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: 'var(--accent-rose)' }}>
                    {formatINR(forecast?.projection?.projectedMonthEndExpenditure || 0)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Projected Balance</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: 'var(--accent-emerald)' }}>
                    {formatINR(forecast?.projection?.projectedMonthEndBalance || 0)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Daily Run Rate: {formatINR(forecast?.actualToDate?.averageDailyBurnRate || 0)}/day</span>
                <span>Confidence: {forecast?.projection?.confidenceScore ? `${Math.round(forecast.projection.confidenceScore * 100)}%` : '--'}</span>
              </div>
            </div>

            {/* 3. SPENDING PATTERNS & FREQUENT MERCHANTS */}
            {spendingPatterns && (
              <div className="glass-card">
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Spending Velocity & Patterns</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14, textAlign: 'center' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Daily Avg</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{formatINR(spendingPatterns.summary.averageDailySpend)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Weekly Avg</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{formatINR(spendingPatterns.summary.averageWeeklySpend)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Avg Ticket</div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4 }}>{formatINR(spendingPatterns.summary.averageTicketSize)}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Frequent Merchants</div>
                {spendingPatterns.frequentMerchants.slice(0, 4).map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < 3 ? '1px solid var(--border-color)' : 'none', fontSize: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{m.merchantName}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>({m.visitCount} visits)</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>{formatINR(m.totalSpent)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 4. ANOMALY DETECTION ALERTS */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <ShieldAlert size={16} color="var(--accent-amber)" />
                  <span>Spending Anomaly Detection</span>
                </div>
                <span className={`badge ${anomalies?.anomalyCount > 0 ? 'badge-rose' : 'badge-green'}`} style={{ fontSize: 10 }}>
                  {anomalies?.anomalyCount || 0} flagged
                </span>
              </div>

              {anomalies?.anomalyCount > 0 ? (
                anomalies.anomalies.map((a, idx) => (
                  <div key={idx} style={{ padding: 10, background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{a.merchantName}</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>{formatINR(a.amount)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.reason}</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '6px 0' }}>
                  No statistical anomalies detected. All recent debit transactions align with typical spending baselines.
                </div>
              )}
            </div>

            {/* 5. SMART EXPENDITURE ADVISOR SECTION */}
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.10) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <Sparkles size={16} color="var(--accent-purple)" />
                  <span>Smart Expenditure Advisor</span>
                </div>
                <button
                  onClick={() => {
                    setEvaluationResult(null);
                    setShowAdvisorModal(true);
                  }}
                  style={{ background: 'var(--accent-purple)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}
                >
                  + New Evaluation
                </button>
              </div>

              {advisorySummary && advisorySummary.totalEvaluations > 0 ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12, textAlign: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>BUY</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 2 }}>{advisorySummary.distribution.BUY}</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>WAIT</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-amber)', marginTop: 2 }}>{advisorySummary.distribution.CONSIDER_WAITING}</div>
                    </div>
                    <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: 8, borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>AVOID</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-rose)', marginTop: 2 }}>{advisorySummary.distribution.AVOID_FOR_NOW}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Recent Advisory Decisions</div>
                  {advisoryHistory.map((item) => (
                    <div key={item.requestId} style={{ padding: 10, background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 8, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>{item.itemDescription}</span>
                        <span className={`badge ${item.decisionOutcome === 'BUY' ? 'badge-green' : item.decisionOutcome === 'CONSIDER_WAITING' ? 'badge-amber' : 'badge-rose'}`} style={{ fontSize: 9 }}>
                          {item.decisionOutcome}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>Amount: {formatINR(item.purchaseAmount)}</span>
                        <span>Score: {item.affordabilityScore}/100</span>
                      </div>
                      {/* User Feedback Pill */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                        <button
                          onClick={() => handleAdvisoryFeedback(item.requestId, true)}
                          style={{
                            background: feedbackSent[item.requestId] === true ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)',
                            border: 'none', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <ThumbsUp size={10} /> Helpful
                        </button>
                        <button
                          onClick={() => handleAdvisoryFeedback(item.requestId, false)}
                          style={{
                            background: feedbackSent[item.requestId] === false ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255,255,255,0.06)',
                            border: 'none', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <ThumbsDown size={10} /> Not helpful
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', padding: '10px 0' }}>
                  No purchases evaluated yet. Enter a purchase to get data-backed affordability advice!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Wallet size={20} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          <FileText size={20} />
          <span>History</span>
        </button>
        <button className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`} onClick={() => setActiveTab('budgets')}>
          <PieChart size={20} />
          <span>Budgets</span>
        </button>
        <button className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
          <Target size={20} />
          <span>Goals</span>
        </button>
        <button className={`nav-item ${activeTab === 'recurring' ? 'active' : ''}`} onClick={() => setActiveTab('recurring')}>
          <Repeat size={20} />
          <span>Recurring</span>
        </button>
        <button className={`nav-item ${activeTab === 'intelligence' ? 'active' : ''}`} onClick={() => setActiveTab('intelligence')}>
          <Brain size={20} />
          <span>Insights</span>
        </button>
      </div>

      {/* MODAL 1: ADD TRANSACTION */}
      {showAddTxModal && (
        <div className="modal-overlay" onClick={() => setShowAddTxModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Add Transaction</h3>
              <button onClick={() => setShowAddTxModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTransaction}>
              <div className="form-group">
                <label className="form-label">Transaction Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setNewTx({ ...newTx, type: 'DEBIT' })}
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: newTx.type === 'DEBIT' ? 'var(--accent-rose)' : 'var(--bg-tertiary)', color: '#fff', fontWeight: 700 }}>
                    Debit (Expense)
                  </button>
                  <button type="button" onClick={() => setNewTx({ ...newTx, type: 'CREDIT' })}
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: newTx.type === 'CREDIT' ? 'var(--accent-emerald)' : 'var(--bg-tertiary)', color: '#fff', fontWeight: 700 }}>
                    Credit (Income)
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Merchant / Payee Name</label>
                <input required type="text" placeholder="e.g. Starbucks or Salary" className="form-input"
                  value={newTx.merchantName} onChange={(e) => setNewTx({ ...newTx, merchantName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (INR)</label>
                <input required type="number" placeholder="450" className="form-input"
                  value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={newTx.categoryId} onChange={(e) => setNewTx({ ...newTx, categoryId: e.target.value })}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Create Transaction</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BUDGET */}
      {showAddBudgetModal && (
        <div className="modal-overlay" onClick={() => setShowAddBudgetModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Create New Budget</h3>
              <button onClick={() => setShowAddBudgetModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBudget}>
              <div className="form-group">
                <label className="form-label">Budget Name</label>
                <input required type="text" placeholder="Monthly Groceries Cap" className="form-input"
                  value={newBudget.name} onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Limit Amount (INR)</label>
                <input required type="number" placeholder="15000" className="form-input"
                  value={newBudget.limitAmount} onChange={(e) => setNewBudget({ ...newBudget, limitAmount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input required type="date" className="form-input"
                  value={newBudget.periodStart} onChange={(e) => setNewBudget({ ...newBudget, periodStart: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input required type="date" className="form-input"
                  value={newBudget.periodEnd} onChange={(e) => setNewBudget({ ...newBudget, periodEnd: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Save Budget</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD GOAL */}
      {showAddGoalModal && (
        <div className="modal-overlay" onClick={() => setShowAddGoalModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Set Financial Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGoal}>
              <div className="form-group">
                <label className="form-label">Goal Name</label>
                <input required type="text" placeholder="Emergency Fund / New Car" className="form-input"
                  value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Target Amount (INR)</label>
                <input required type="number" placeholder="100000" className="form-input"
                  value={newGoal.targetAmount} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Target Completion Date</label>
                <input required type="date" className="form-input"
                  value={newGoal.targetDate} onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Create Goal</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD CONTRIBUTION */}
      {showContributionModal && (
        <div className="modal-overlay" onClick={() => setShowContributionModal(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Deposit to {showContributionModal.name}</h3>
              <button onClick={() => setShowContributionModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddContribution}>
              <div className="form-group">
                <label className="form-label">Deposit Amount (INR)</label>
                <input required type="number" placeholder="5000" className="form-input"
                  value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Confirm Deposit</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD ACCOUNT */}
      {showAddAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Add Financial Account</h3>
              <button onClick={() => setShowAddAccountModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label className="form-label">Account Nickname</label>
                <input required type="text" placeholder="Salary Account / Primary Savings" className="form-input"
                  value={newAccount.accountName} onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Bank / Institution</label>
                <input required type="text" placeholder="HDFC Bank / SBI / ICICI" className="form-input"
                  value={newAccount.institutionName} onChange={(e) => setNewAccount({ ...newAccount, institutionName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Starting Balance (INR)</label>
                <input required type="number" placeholder="25000" className="form-input"
                  value={newAccount.initialBalance} onChange={(e) => setNewAccount({ ...newAccount, initialBalance: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Save Account</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: IMPORT CSV */}
      {showUploadCsvModal && (
        <div className="modal-overlay" onClick={() => setShowUploadCsvModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Import Bank Statement (CSV)</h3>
              <button onClick={() => setShowUploadCsvModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUploadCsv}>
              <div className="form-group">
                <label className="form-label">Select CSV Statement</label>
                <input
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
                Transactions will be parsed, deduplicated, and auto-categorized into your database.
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Uploading & Parsing...' : 'Upload & Parse'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: SMART EXPENDITURE ADVISOR EVALUATION */}
      {showAdvisorModal && (
        <div className="modal-overlay" onClick={() => setShowAdvisorModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color="#C084FC" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>Smart Expenditure Advisor</h3>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI purchase affordability guidance</div>
                </div>
              </div>
              <button onClick={() => setShowAdvisorModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleEvaluatePurchase} style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Item / Service Description</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sony WH-1000XM5 Headphones or Gym Pass"
                  className="form-input"
                  value={advisorForm.itemDescription}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, itemDescription: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Purchase Amount (INR)</label>
                <input
                  required
                  type="number"
                  placeholder="12000"
                  className="form-input"
                  value={advisorForm.purchaseAmount}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, purchaseAmount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category (Optional — auto-inferred if blank)</label>
                <select
                  className="form-select"
                  value={advisorForm.categoryId}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, categoryId: e.target.value })}
                >
                  <option value="">Auto-Detect Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">User Notes (Optional context)</label>
                <input
                  type="text"
                  placeholder="e.g. On sale for Diwali; replacement for broken pair"
                  className="form-input"
                  value={advisorForm.userNotes}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, userNotes: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={evaluating} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)', marginTop: 8 }}>
                {evaluating ? 'Analyzing Financial Context...' : 'Evaluate Affordability'}
              </button>
            </form>

            {/* Evaluation Results Card */}
            {evaluationResult && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                {/* Decision Outcome Badge */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 14,
                    background:
                      evaluationResult.decisionOutcome === 'BUY'
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.1) 100%)'
                        : evaluationResult.decisionOutcome === 'CONSIDER_WAITING'
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(244, 63, 94, 0.1) 100%)',
                    border: `1px solid ${
                      evaluationResult.decisionOutcome === 'BUY'
                        ? 'rgba(16, 185, 129, 0.4)'
                        : evaluationResult.decisionOutcome === 'CONSIDER_WAITING'
                        ? 'rgba(245, 158, 11, 0.4)'
                        : 'rgba(244, 63, 94, 0.4)'
                    }`,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>RECOMMENDATION</div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          marginTop: 2,
                          color:
                            evaluationResult.decisionOutcome === 'BUY'
                              ? 'var(--accent-emerald)'
                              : evaluationResult.decisionOutcome === 'CONSIDER_WAITING'
                              ? 'var(--accent-amber)'
                              : 'var(--accent-rose)',
                        }}
                      >
                        {evaluationResult.decisionOutcome === 'BUY'
                          ? 'RECOMMENDED: BUY'
                          : evaluationResult.decisionOutcome === 'CONSIDER_WAITING'
                          ? 'CONSIDER WAITING'
                          : 'AVOID FOR NOW'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Affordability Score</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-main)' }}>
                        {evaluationResult.affordabilityScore} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>/ 100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Financial Impact Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Post-Purchase Balance</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: evaluationResult.factors.postPurchaseBalance >= 0 ? 'var(--text-main)' : 'var(--accent-rose)' }}>
                      {formatINR(evaluationResult.factors.postPurchaseBalance)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Free Discretionary Cash</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, color: evaluationResult.factors.postPurchaseFreeCash >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {formatINR(evaluationResult.factors.postPurchaseFreeCash)}
                    </div>
                  </div>
                </div>

                {/* AI Natural-Language Explanation */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-purple)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} /> AI ADVISOR EXPLANATION
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                    {evaluationResult.explanation}
                  </div>
                </div>

                {/* Feedback Widget */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Was this advice helpful?</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleAdvisoryFeedback(evaluationResult.requestId, true)}
                      style={{
                        background: feedbackSent[evaluationResult.requestId] === true ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)',
                        border: 'none', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <ThumbsUp size={12} /> Yes
                    </button>
                    <button
                      onClick={() => handleAdvisoryFeedback(evaluationResult.requestId, false)}
                      style={{
                        background: feedbackSent[evaluationResult.requestId] === false ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255,255,255,0.08)',
                        border: 'none', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <ThumbsDown size={12} /> No
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

