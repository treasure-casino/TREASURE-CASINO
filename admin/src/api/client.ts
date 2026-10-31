import axios, { AxiosError } from 'axios';

const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    // Strip trailing slashes and redundant trailing '/api'
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  // Local development default
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  // Production fallback: same-origin relative URLs
  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

export interface ApiClientError extends AxiosError {
  userFacingMessage?: string;
  roundNumber?: number;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to mask sensitive fields in logs
const sanitizeForLog = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'bearer', 'demoToken'];
    for (const key of Object.keys(copy)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        copy[key] = '[MASKED]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = sanitizeForLog(copy[key]);
      }
    }
    return copy;
  } catch {
    return '[Log Sanitization Error]';
  }
};

// Request interceptor to inject Admin JWT & Demo Token
apiClient.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('treasure_admin_token');
    if (adminToken && config.headers) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }

    const demoToken = localStorage.getItem('treasure_demo_token');
    if (demoToken && config.headers && !config.headers['x-demo-token']) {
      config.headers['x-demo-token'] = demoToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract informative errors and replace generic "Request Failed"
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status;
    const backendData = error.response?.data;
    const backendMessage = backendData?.message || backendData?.error;

    let userFacingMessage = 'An unexpected error occurred. Please try again.';

    if (backendMessage && typeof backendMessage === 'string') {
      userFacingMessage = backendMessage;
    } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      userFacingMessage = 'Request timed out. Server took too long to respond.';
    } else if (!error.response) {
      userFacingMessage = 'Network connection lost. Please check your internet connection.';
    } else if (status === 400) {
      userFacingMessage = backendMessage || 'Invalid request parameters.';
    } else if (status === 401) {
      userFacingMessage = 'Session expired. Please log in or refresh your session.';
    } else if (status === 403) {
      userFacingMessage = 'Access denied. You do not have permission for this action.';
    } else if (status === 404) {
      userFacingMessage = 'Requested game service or endpoint was not found.';
    } else if (status === 429) {
      userFacingMessage = 'Too many requests. Please slow down and wait a moment.';
    } else if (status && status >= 500) {
      userFacingMessage = 'Server error encountered. Please try again shortly.';
    }

    // Attach normalized error message
    (error as any).userFacingMessage = userFacingMessage;
    error.message = userFacingMessage;

    // Development diagnostic logging
    if (import.meta.env.DEV || process.env.NODE_ENV !== 'production') {
      console.warn('[API Client Error Diagnostics]', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: status || 'NETWORK_ERROR',
        backendResponse: sanitizeForLog(backendData),
        userFacingMessage,
        payload: sanitizeForLog(error.config?.data ? JSON.parse(error.config.data) : null),
      });
    }

    // Handle 401 session expiration
    if (status === 401) {
      localStorage.removeItem('treasure_admin_token');
      localStorage.removeItem('treasure_admin_user');
      const path = window.location.pathname;
      const isPublicRoute = path === '/login' || path.startsWith('/lobby') || path.startsWith('/play/');
      if (!isPublicRoute) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
