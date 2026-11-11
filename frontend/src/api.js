/**
 * API Service for Finance App
 * Base URL pointing to Express backend
 */
const API_BASE = 'http://localhost:3000/api/v1';

export const getAuthToken = () => localStorage.getItem('finance_token');
export const setAuthToken = (token) => localStorage.setItem('finance_token', token);
export const removeAuthToken = () => localStorage.removeItem('finance_token');

export const getStoredUser = () => {
  const u = localStorage.getItem('finance_user');
  return u ? JSON.parse(u) : null;
};
export const setStoredUser = (user) => localStorage.setItem('finance_user', JSON.stringify(user));
export const removeStoredUser = () => localStorage.removeItem('finance_user');

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = { message: `Request failed with status ${res.status}` };
  }

  if (!res.ok) {
    const errorMsg = json.message || (Array.isArray(json.errors) ? json.errors.join(', ') : json.errors) || `Request failed with status ${res.status}`;
    console.error(`[API Error] ${endpoint}:`, errorMsg, json);
    throw new Error(errorMsg);
  }
  return json.data;
}

export const api = {
  // Auth
  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/auth/me'),

  // Profile
  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // Financial Data Sources & Accounts
  getSources: () => request('/financial/sources'),
  createSource: (data) => request('/financial/sources', { method: 'POST', body: JSON.stringify(data) }),
  getAccounts: () => request('/financial/accounts'),
  createAccount: (data) => request('/financial/accounts', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (params = '') => request(`/transactions${params}`),
  createTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  // Categories
  getCategories: () => request('/categories'),

  // CSV Import
  uploadCsv: (formData) => request('/imports/csv', { method: 'POST', body: formData }),

  // Analytics (Phase 6)
  getOverview: (timeframe = 'month') => request(`/analytics/overview?timeframe=${timeframe}`),
  getExpenses: (timeframe = 'month') => request(`/analytics/expenses?timeframe=${timeframe}`),
  getVisualizations: (timeframe = 'month') => request(`/analytics/visualizations?timeframe=${timeframe}`),

  // Budgets (Phase 7)
  getBudgets: () => request('/budgets'),
  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  getBudgetAlerts: () => request('/budgets/alerts'),

  // Goals (Phase 8)
  getGoals: () => request('/goals'),
  createGoal: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
  addContribution: (goalId, data) => request(`/goals/${goalId}/contributions`, { method: 'POST', body: JSON.stringify(data) }),
  getGoalAnalytics: () => request('/goals/analytics'),

  // Recurring (Phase 9)
  getRecurring: () => request('/recurring'),
  createRecurring: (data) => request('/recurring', { method: 'POST', body: JSON.stringify(data) }),
  detectRecurring: () => request('/recurring/detect', { method: 'POST', body: JSON.stringify({ lookbackDays: 90 }) }),
  getRecurringUpcoming: () => request('/recurring/upcoming'),
  getRecurringAlerts: () => request('/recurring/alerts'),
};

