// Demo wallet state, persistent token & backend synchronization helper
import { apiClient } from '../api/client';

const DEMO_BALANCE_KEY = 'treasure_demo_balance';
const DEMO_TOKEN_KEY = 'treasure_demo_token';
const DEFAULT_DEMO_BALANCE = 10000.00;

export const getDemoToken = (): string => {
  let token = localStorage.getItem(DEMO_TOKEN_KEY);
  if (!token) {
    token = 'demo_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(DEMO_TOKEN_KEY, token);
  }
  return token;
};

export const getDemoBalance = (): number => {
  const stored = localStorage.getItem(DEMO_BALANCE_KEY);
  if (!stored) {
    localStorage.setItem(DEMO_BALANCE_KEY, DEFAULT_DEMO_BALANCE.toFixed(2));
    return DEFAULT_DEMO_BALANCE;
  }
  const val = parseFloat(stored);
  return isNaN(val) ? DEFAULT_DEMO_BALANCE : val;
};

export const setLocalDemoBalance = (balance: number): void => {
  localStorage.setItem(DEMO_BALANCE_KEY, balance.toFixed(2));
  window.dispatchEvent(new CustomEvent('demo_balance_updated', { detail: { balance } }));
};

export const fetchServerDemoBalance = async (): Promise<number> => {
  try {
    const token = getDemoToken();
    const res = await apiClient.get(`/api/games/original/demo-wallet?token=${token}`);
    if (res.data?.success && res.data?.data) {
      const balance = parseFloat(res.data.data.balance);
      setLocalDemoBalance(balance);
      return balance;
    }
  } catch (err) {
    console.warn('Failed to fetch server demo balance, using cached:', err);
  }
  return getDemoBalance();
};

export const resetDemoBalance = (): number => {
  setLocalDemoBalance(DEFAULT_DEMO_BALANCE);
  try {
    const token = getDemoToken();
    apiClient.post('/api/games/original/demo-wallet/reset', { token }).catch(() => {});
  } catch (err) {
    console.warn('Failed to dispatch server reset:', err);
  }
  return DEFAULT_DEMO_BALANCE;
};

export const updateDemoBalance = (delta: number): number => {
  const current = getDemoBalance();
  const next = Math.max(0, parseFloat((current + delta).toFixed(2)));
  setLocalDemoBalance(next);
  return next;
};

export const deductDemoBet = (amount: number): number => {
  return updateDemoBalance(-Math.abs(amount));
};

export const addDemoWin = (amount: number): number => {
  return updateDemoBalance(Math.abs(amount));
};
