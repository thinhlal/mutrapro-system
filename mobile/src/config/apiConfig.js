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
const STUDIO_BOOKINGS_PATH = `${API_PREFIX}/projects/studio-bookings`;

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
  PAYMENT: {
    CREATE_ORDER: `${BILLING_PATH}/payments/orders`,
    GET_ORDER: (orderId) => `${BILLING_PATH}/payments/orders/${orderId}`,
    GET_ORDER_QR: (orderId) => `${BILLING_PATH}/payments/orders/${orderId}/qr`,
  },
  WALLET: {
    GET_OR_CREATE_MY_WALLET: `${BILLING_PATH}/wallets/me`,
    GET_BY_ID: (walletId) => `${BILLING_PATH}/wallets/${walletId}`,
    TOPUP: (walletId) => `${BILLING_PATH}/wallets/${walletId}/topup`,
    PAY_DEPOSIT: (walletId) => `${BILLING_PATH}/wallets/${walletId}/debit/deposit`,
    PAY_MILESTONE: (walletId) => `${BILLING_PATH}/wallets/${walletId}/debit/milestone`,
    PAY_REVISION_FEE: (walletId) => `${BILLING_PATH}/wallets/${walletId}/debit/revision-fee`,
    GET_TRANSACTIONS: (walletId) => `${BILLING_PATH}/wallets/${walletId}/transactions`,
    GET_MY_TRANSACTIONS: `${BILLING_PATH}/wallets/me/transactions`,
  },

  // === Project Service ===
  CONTRACTS: {
    BASE: `${PROJECT_PATH}/contracts`,
    MY_CONTRACTS: `${PROJECT_PATH}/contracts/my-contracts`,
    GET_BY_ID: (contractId) => `${PROJECT_PATH}/contracts/${contractId}`,
    GET_MILESTONE_BY_ID: (contractId, milestoneId) =>
      `${PROJECT_PATH}/contracts/${contractId}/milestones/${milestoneId}`,
  },

  // === File Submissions Management ===
  SUBMISSIONS: {
    // GET /submissions/by-milestone/{milestoneId}?contractId={contractId} (cho customer)
    GET_DELIVERED_BY_MILESTONE: (milestoneId, contractId) =>
      `${PROJECT_PATH}/submissions/by-milestone/${milestoneId}?contractId=${contractId}`,
    // POST /submissions/{submissionId}/customer-review
    CUSTOMER_REVIEW: (submissionId) =>
      `${PROJECT_PATH}/submissions/${submissionId}/customer-review`,
    // GET /submissions/{submissionId}
    GET: (submissionId) => `${PROJECT_PATH}/submissions/${submissionId}`,
  },

  // === Revision Requests Management ===
  REVISION_REQUESTS: {
    // GET /revision-requests/by-assignment/{assignmentId}
    BY_ASSIGNMENT: (assignmentId) =>
      `${PROJECT_PATH}/revision-requests/by-assignment/${assignmentId}`,
  },

  // === Notifications ===
  NOTIFICATIONS: {
    GET_ALL_NOTIFICATIONS: `${NOTIFICATIONS_PATH}/notifications`,
    GET_LATEST: `${NOTIFICATIONS_PATH}/notifications/latest`,
    GET_UNREAD_COUNT: `${NOTIFICATIONS_PATH}/notifications/unread-count`,
    MARK_AS_READ: (notificationId) => `${NOTIFICATIONS_PATH}/notifications/${notificationId}/read`,
    MARK_ALL_AS_READ: `${NOTIFICATIONS_PATH}/notifications/mark-all-read`,
    
    // WebSocket
    WS_ENDPOINT: `${NOTIFICATIONS_PATH}/notifications-ws`,
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

  // === Chat Service ===
  CHAT: {
    // Chat Rooms
    GET_ALL_ROOMS: `${CHAT_PATH}/chat-rooms`,
    GET_ROOM: (roomId) => `${CHAT_PATH}/chat-rooms/${roomId}`,
    GET_ROOM_BY_CONTEXT: `${CHAT_PATH}/chat-rooms/by-context`,
    CREATE_ROOM: `${CHAT_PATH}/chat-rooms`,
    ADD_PARTICIPANT: (roomId) => `${CHAT_PATH}/chat-rooms/${roomId}/participants`,
    REMOVE_PARTICIPANT: (roomId, userId) => `${CHAT_PATH}/chat-rooms/${roomId}/participants/${userId}`,
    
    // Messages
    GET_MESSAGES: (roomId) => `${CHAT_PATH}/messages/room/${roomId}`,
    GET_RECENT_MESSAGES: (roomId, sinceTimestamp) => 
      `${CHAT_PATH}/messages/room/${roomId}/recent?sinceTimestamp=${sinceTimestamp}`,
    GET_UNREAD_COUNT: (roomId) => `${CHAT_PATH}/messages/room/${roomId}/unread-count`,
    MARK_AS_READ: (roomId) => `${CHAT_PATH}/messages/room/${roomId}/mark-read`,
    
    // File Upload & Download
    UPLOAD_FILE: `${CHAT_PATH}/messages/upload`,
    DOWNLOAD_FILE: `${CHAT_PATH}/messages/download`,
    
    // WebSocket
    WS_ENDPOINT: `${CHAT_PATH}/ws`,
  },

  // === Specialist Service ===
  SPECIALISTS: {
    // Public endpoints (for customers)
    PUBLIC: {
      // GET /public/specialists/vocalists?gender=&genres=
      GET_VOCALISTS: `${SPECIALIST_PATH}/public/specialists/vocalists`,
      // GET /public/specialists/{specialistId}
      GET_SPECIALIST_DETAIL: (specialistId) =>
        `${SPECIALIST_PATH}/public/specialists/${specialistId}`,
      // GET /public/skills
      GET_ALL_SKILLS: `${SPECIALIST_PATH}/public/skills`,
    },
  },

  // === Equipment (Recording) ===
  EQUIPMENT: {
    // GET /projects/equipment?skillId=&includeInactive=&includeUnavailable=
    GET_ALL: `${PROJECT_PATH}/equipment`,
  },

  // === Studio Booking (Recording) ===
  STUDIO_BOOKINGS: {
    // GET /projects/studio-bookings/available-slots?date=YYYY-MM-DD
    GET_AVAILABLE_SLOTS: (date) =>
      `${STUDIO_BOOKINGS_PATH}/available-slots?date=${date}`,
    // GET /projects/studio-bookings/available-artists-for-request?date=&startTime=&endTime=&skillId=&roleType=&genres=
    GET_AVAILABLE_ARTISTS_FOR_REQUEST: (
      date,
      startTime,
      endTime,
      skillId = null,
      roleType = null,
      genres = null
    ) => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (startTime) params.append('startTime', startTime);
      if (endTime) params.append('endTime', endTime);
      if (skillId) params.append('skillId', skillId);
      if (roleType) params.append('roleType', roleType);
      if (genres && Array.isArray(genres)) {
        genres.forEach(g => params.append('genres', g));
      }
      return `${STUDIO_BOOKINGS_PATH}/available-artists-for-request${
        params.toString() ? `?${params.toString()}` : ''
      }`;
    },
    // POST /projects/studio-bookings/from-request/{requestId}
    CREATE_FROM_SERVICE_REQUEST: requestId =>
      `${STUDIO_BOOKINGS_PATH}/from-request/${requestId}`,
    // GET /projects/studio-bookings/by-request/{requestId}
    GET_BY_REQUEST_ID: requestId =>
      `${STUDIO_BOOKINGS_PATH}/by-request/${requestId}`,
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

