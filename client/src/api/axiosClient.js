import axios from 'axios';
import { emitToast } from '../context/ToastContext';
import {
  networkHealth,
  FRIENDLY_UNREACHABLE_MSG,
  UNREACHABLE_TOAST_ID,
} from '../utils/networkHealth';

const axiosClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT Token to every request automatically
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lifelink_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const isBackendUnreachable = (error) => {
  if (!error) return false;
  // Connection refused / DNS failure / aborted network request
  if (!error.response) return true;
  // 502 Bad Gateway, 503 Service Unavailable (e.g. Vite proxy proxy-error), 504 Gateway Timeout
  const status = error.response.status;
  if (status === 502 || status === 503 || status === 504) return true;
  return false;
};

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => {
    // Notify network health manager that backend is responding
    networkHealth.reportSuccess();
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized responses globally
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('lifelink_token');
      localStorage.removeItem('lifelink_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (isBackendUnreachable(error)) {
      networkHealth.reportFailure(error);

      // Log technical details in development only
      if (import.meta.env.DEV) {
        const url = error.config?.url || 'request';
        console.warn(`[LifeLink API] Server unreachable for ${url}:`, error.message);
      }

      // Replace technical / raw proxy error message with friendly copy
      if (error.response?.data) {
        error.response.data.message = FRIENDLY_UNREACHABLE_MSG;
      } else {
        error.message = FRIENDLY_UNREACHABLE_MSG;
      }

      // Pages that display inline errors (such as the Login form) should not also fire a toast
      const isLoginRequest =
        error.config?.url?.includes('/auth/login') ||
        (typeof window !== 'undefined' && window.location.pathname === '/login');
      const shouldSkipToast = error.config?.skipToast || isLoginRequest;

      if (!shouldSkipToast) {
        // Emit exactly once using a stable toast ID
        emitToast(FRIENDLY_UNREACHABLE_MSG, 'error', 6000, UNREACHABLE_TOAST_ID);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
