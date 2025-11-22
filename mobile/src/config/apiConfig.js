// API Configuration for Mobile App
import { API_BASE_URL } from '@env';

export const API_CONFIG = {
  // Backend API endpoint - đọc từ .env file
  BASE_URL: API_BASE_URL || 'http://localhost:8080',
  
  // API prefix
  API_PREFIX: '/api/v1',
  
  // Google OAuth Client ID (same as web)
  GOOGLE_CLIENT_ID: '807495098527-cngsfgsl7aep23ht0u0t26e99ofohc7u.apps.googleusercontent.com',
  
  // Environment
  IS_DEV: __DEV__,
};

// Base paths for microservices
const { API_PREFIX } = API_CONFIG;
const IDENTITY_PATH = `${API_PREFIX}/identity`;
const PROJECT_PATH = `${API_PREFIX}/projects`;
const BILLING_PATH = `${API_PREFIX}/billing`;
const REQUEST_PATH = `${API_PREFIX}/requests`;
const CHAT_PATH = `${API_PREFIX}/chat`;
const NOTIFICATIONS_PATH = `${API_PREFIX}/notifications`;
const SPECIALIST_PATH = `${API_PREFIX}/specialists`;

// API Endpoints - giống như web
export const API_ENDPOINTS = {
  // === Identity Service ===
  AUTH: {
    LOGIN: `${IDENTITY_PATH}/auth/log-in`,
    REGISTER: `${IDENTITY_PATH}/auth/register`,
    LOGOUT: `${IDENTITY_PATH}/auth/logout`,
    REFRESH: `${IDENTITY_PATH}/auth/refresh`,
    GOOGLE_LOGIN: `${IDENTITY_PATH}/auth/outbound/authentication`,
    INTROSPECT: `${IDENTITY_PATH}/auth/introspect`,
    FORGOT_PASSWORD: `${IDENTITY_PATH}/auth/forgot-password`,
    RESET_PASSWORD: `${IDENTITY_PATH}/auth/reset-password`,
    CREATE_PASSWORD: `${IDENTITY_PATH}/auth/create-password`,
  },

  USER: {
    GET_ALL: `${IDENTITY_PATH}/users`,
    FULL: (id) => `${IDENTITY_PATH}/users/${id}/full`,
    FULL_UPDATE: (id) => `${IDENTITY_PATH}/users/${id}/full`,
    CREATE: `${IDENTITY_PATH}/users`,
    VERIFY_EMAIL: `${IDENTITY_PATH}/users/verify-email`,
    RESEND_VERIFICATION: `${IDENTITY_PATH}/users/resend-verification`,
    REQUEST_VERIFICATION: `${IDENTITY_PATH}/users/request-verification`,
    VERIFICATION_STATUS: `${IDENTITY_PATH}/users/verification-status`,
  },

  // === Request Service ===
  SERVICE_REQUESTS: {
    GET_ALL: `${REQUEST_PATH}/requests`,
    CREATE: `${REQUEST_PATH}/requests`,
    GET_BY_ID: (requestId) => `${REQUEST_PATH}/requests/${requestId}`,
    MY_REQUESTS: `${REQUEST_PATH}/requests/my-requests`,
  },

  // === Billing Service ===
  WALLET: {
    GET_OR_CREATE_MY_WALLET: `${BILLING_PATH}/wallets/me`,
    GET_BY_ID: (walletId) => `${BILLING_PATH}/wallets/${walletId}`,
    GET_MY_TRANSACTIONS: `${BILLING_PATH}/wallets/me/transactions`,
  },

  // === Project Service ===
  CONTRACTS: {
    BASE: `${PROJECT_PATH}/contracts`,
    MY_CONTRACTS: `${PROJECT_PATH}/contracts/my-contracts`,
    GET_BY_ID: (contractId) => `${PROJECT_PATH}/contracts/${contractId}`,
  },

  // === Notifications ===
  NOTIFICATIONS: {
    GET_ALL_NOTIFICATIONS: `${NOTIFICATIONS_PATH}/notifications`,
    GET_LATEST: `${NOTIFICATIONS_PATH}/notifications/latest`,
    GET_UNREAD_COUNT: `${NOTIFICATIONS_PATH}/notifications/unread-count`,
    MARK_AS_READ: (notificationId) => `${NOTIFICATIONS_PATH}/notifications/${notificationId}/read`,
    MARK_ALL_AS_READ: `${NOTIFICATIONS_PATH}/notifications/mark-all-read`,
  },

  // === Pricing Management ===
  PRICING: {
    // GET /pricing-matrix
    GET_ALL: `${REQUEST_PATH}/pricing-matrix`,
    // GET /pricing-matrix/{serviceType}
    GET_BY_SERVICE_TYPE: (serviceType) => `${REQUEST_PATH}/pricing-matrix/${serviceType}`,
    // GET /pricing-matrix/calculate/{serviceType}?durationMinutes=X
    CALCULATE: (serviceType, durationMinutes) =>
      `${REQUEST_PATH}/pricing-matrix/calculate/${serviceType}?durationMinutes=${durationMinutes}`,
  },

  // === Notation Instruments Management ===
  NOTATION_INSTRUMENTS: {
    // GET /notation-instruments?usage=transcription|arrangement|both&includeInactive=true
    GET_ALL: `${REQUEST_PATH}/notation-instruments`,
    // GET /notation-instruments/by-ids?ids=id1&ids=id2
    GET_BY_IDS: `${REQUEST_PATH}/notation-instruments/by-ids`,
  },
};

// Log configuration in development
if (API_CONFIG.IS_DEV) {
  console.log('🔧 [Mobile Config] API Configuration:', {
    BASE_URL: API_CONFIG.BASE_URL,
    API_PREFIX: API_CONFIG.API_PREFIX,
    ENV: API_CONFIG.IS_DEV ? 'Development' : 'Production',
  });
}

