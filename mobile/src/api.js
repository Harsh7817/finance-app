import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Current active PC Wi-Fi IP is 172.20.249.4.
// For Android Emulator, use '10.0.2.2'.
// For Web or iOS Simulator, use 'localhost'.
export const DEFAULT_API_HOST = Platform.OS === 'android' ? '172.20.249.127' : 'localhost';
export const API_PORT = '3000';

let dynamicHost = DEFAULT_API_HOST;

export const setApiHost = (host) => {
  dynamicHost = host.trim();
};

export const getApiHost = () => dynamicHost;

export const getApiBaseUrl = () => `http://${dynamicHost}:${API_PORT}/api/v1`;

const TOKEN_KEY = 'finance_jwt_token';

export const saveToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // Fallback if secure store is unavailable
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const deleteToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
};

export async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://${dynamicHost}:${API_PORT}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    ...(options.headers || {}),
  };

  // Accurately detect FormData in React Native / Hermes polyfill environments
  const isFormData =
    options.body &&
    (options.body instanceof FormData ||
      typeof options.body.append === 'function' ||
      Boolean(options.body._parts));

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  } else {
    // CRITICAL for React Native: Never set 'Content-Type' manually on FormData!
    // Fetch automatically calculates and includes 'multipart/form-data; boundary=...'
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${getApiBaseUrl()}${endpoint}`;

  // Use generous timeout (60s) for file uploads, 10s for standard requests
  const timeoutMs = isFormData ? 60000 : 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Connection timeout: Could not reach backend server at ${url}.`);
    }
    throw new Error(`Network error: ${err.message || 'Could not reach server'} at ${url}.`);
  } finally {
    clearTimeout(timeoutId);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    json = { message: `Request failed with status ${response.status}` };
  }

  if (!response.ok) {
    const errorMsg = json.message || (Array.isArray(json.errors) ? json.errors.join(', ') : json.errors) || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return json.data;
}

export const api = {
  // Auth
  register: (email, password) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => apiRequest('/auth/me'),

  // Profile
  getProfile: () => apiRequest('/profile'),
  updateProfile: (data) => apiRequest('/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // Accounts & Data Sources
  getAccounts: () => apiRequest('/financial/accounts'),
  createAccount: (data) => apiRequest('/financial/accounts', { method: 'POST', body: JSON.stringify(data) }),
  deleteAccount: (id) => apiRequest(`/financial/accounts/${id}`, { method: 'DELETE' }),
  getDataSources: () => apiRequest('/financial/sources'),
  createDataSource: (data) => apiRequest('/financial/sources', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions & Transfers
  getTransactions: (queryString = '') => apiRequest(`/transactions${queryString}`),
  createTransaction: (data) => apiRequest('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  recordTransfer: (data) => apiRequest('/transactions/transfer', { method: 'POST', body: JSON.stringify(data) }),
  getCategories: () => apiRequest('/categories'),

  // CSV Statement Ingestion
  uploadCsv: (formData) => apiRequest('/imports/csv', { method: 'POST', body: formData }),
  uploadCsvContent: (data) => apiRequest('/imports/csv', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Analytics
  getOverview: (timeframe = 'month') => apiRequest(`/analytics/overview?timeframe=${timeframe}`),
  getExpenses: (timeframe = 'month') => apiRequest(`/analytics/expenses?timeframe=${timeframe}`),
  getComparisons: () => apiRequest('/analytics/comparisons'),
  getVisualizations: (timeframe = 'month', months = 6) => apiRequest(`/analytics/visualizations?timeframe=${timeframe}&months=${months}`),

  // Budgets
  getBudgets: () => apiRequest('/budgets'),
  createBudget: (data) => apiRequest('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  getBudgetAlerts: () => apiRequest('/budgets/alerts'),

  // Goals
  getGoals: () => apiRequest('/goals'),
  createGoal: (data) => apiRequest('/goals', { method: 'POST', body: JSON.stringify(data) }),
  addContribution: (goalId, data) => apiRequest(`/goals/${goalId}/contributions`, { method: 'POST', body: JSON.stringify(data) }),

  // Recurring
  getRecurring: () => apiRequest('/recurring'),
  createRecurring: (data) => apiRequest('/recurring', { method: 'POST', body: JSON.stringify(data) }),
  detectRecurring: () => apiRequest('/recurring/detect', { method: 'POST', body: JSON.stringify({ lookbackDays: 90 }) }),
  getRecurringAlerts: () => apiRequest('/recurring/alerts'),
};
