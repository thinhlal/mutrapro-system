// API Configuration
export const API_CONFIG = {
  // Backend API endpoint (Luôn trỏ đến API Gateway)
  BASE_URL:
    import.meta.env.VITE_API_BACK_END_ENDPOINT || 'http://localhost:8080',

  // Tiền tố API chung được định nghĩa trong Gateway
  API_PREFIX: 
    import.meta.env.VITE_API_PREFIX || '/api/v1',

  // Google OAuth config
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',

  // Environment
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};

// --- Đường dẫn cơ sở cho các Microservices ---
// Các đường dẫn này được định nghĩa trong cấu hình routes của api-gateway
const { API_PREFIX } = API_CONFIG;
const IDENTITY_PATH = `${API_PREFIX}/identity`;
const PROJECT_PATH = `${API_PREFIX}/projects`; 
const BILLING_PATH = `${API_PREFIX}/billing`; 
const REQUEST_PATH = `${API_PREFIX}/requests`;
const CHAT_PATH = `${API_PREFIX}/chat`;

// API Endpoints
export const API_ENDPOINTS = {
  // === Identity Service (Quản lý User & Auth) ===
  AUTH: {
    // Controller: /auth/log-in
    LOGIN: `${IDENTITY_PATH}/auth/log-in`,
    // Controller: /auth/register
    REGISTER: `${IDENTITY_PATH}/auth/register`,
    // Controller: /auth/logout
    LOGOUT: `${IDENTITY_PATH}/auth/logout`,
    // Controller: /auth/refresh
    REFRESH: `${IDENTITY_PATH}/auth/refresh`,
    // Public Endpoint: /auth/outbound/authentication
    GOOGLE_LOGIN: `${IDENTITY_PATH}/auth/outbound/authentication`,
    // Convenience builder: kèm code query cho OAuth callback
    GOOGLE_LOGIN_WITH_CODE: code =>
      `${IDENTITY_PATH}/auth/outbound/authentication?code=${code}`,
    // Controller: /auth/introspect
    INTROSPECT: `${IDENTITY_PATH}/auth/introspect`,
    // Public Endpoint: /auth/forgot-password
    FORGOT_PASSWORD: `${IDENTITY_PATH}/auth/forgot-password`,
    // Public Endpoint: /auth/reset-password
    RESET_PASSWORD: `${IDENTITY_PATH}/auth/reset-password`,
    // Create password for OAuth accounts
    CREATE_PASSWORD: `${IDENTITY_PATH}/auth/create-password`,
  },

  USER: {
    // Controller: GET /users (get all users)
    GET_ALL: `${IDENTITY_PATH}/users`,
    // Controller: /users/{id}/full (users + users_auth)
    FULL: id => `${IDENTITY_PATH}/users/${id}/full`,
    // Controller: /users/{id}/full (users + users_auth)
    FULL_UPDATE: id => `${IDENTITY_PATH}/users/${id}/full`,
    // Controller: /users
    CREATE: `${IDENTITY_PATH}/users`,
    // Public Endpoint: /users/verify-email
    VERIFY_EMAIL: `${IDENTITY_PATH}/users/verify-email`,
    // Public Endpoint: /users/resend-verification
    RESEND_VERIFICATION: `${IDENTITY_PATH}/users/resend-verification`,
    // Public Endpoint: /users/request-verification
    REQUEST_VERIFICATION: `${IDENTITY_PATH}/users/request-verification`,
    // Public Endpoint: /users/verification-status
    VERIFICATION_STATUS: `${IDENTITY_PATH}/users/verification-status`,
    // (Endpoint 'CREATE_PASSWORD' cũ của bạn có thể là RESET_PASSWORD)
    CREATE_PASSWORD: `${IDENTITY_PATH}/auth/reset-password`,
  },

  // === Project Service (Quản lý File, Folder, Tag) ===
  // Giả định các controller bên trong project-service giữ nguyên đường dẫn
  FILES: {
    MY_FILES: `${PROJECT_PATH}/files/my-files`,
    UPLOAD: `${PROJECT_PATH}/file/upload`,
    DOWNLOAD: fileId => `${PROJECT_PATH}/file/download/${fileId}`,
    GET_URL: fileId => `${PROJECT_PATH}/file/url/${fileId}`,
  },

  FOLDERS: {
    CREATE: `${PROJECT_PATH}/folders`,
    MY_FOLDERS: `${PROJECT_PATH}/folders/my-folders`,
    PUBLIC: `${PROJECT_PATH}/folders/public`,
  },

  TAGS: {
    GET_ALL: `${PROJECT_PATH}/tags`,
    CREATE: `${PROJECT_PATH}/tags`,
    ASSIGN_TO_FILE: `${PROJECT_PATH}/tags/files`,
    ASSIGN_TO_FOLDER: `${PROJECT_PATH}/tags/folders`,
  },

  // === Billing Service (Quản lý Thanh toán) ===
  // Giả định các controller bên trong billing-service giữ nguyên đường dẫn
  PAYMENT: {
    CREATE_ORDER: `${BILLING_PATH}/payments/orders`,
    GET_ORDER: orderId => `${BILLING_PATH}/payments/orders/${orderId}`,
    GET_PENDING_ORDER: `${BILLING_PATH}/payments/orders/pending`,
    CANCEL_ORDER: orderId => `${BILLING_PATH}/payments/orders/${orderId}`,
    REFRESH_STATUS: orderId =>
      `${BILLING_PATH}/payments/orders/refresh/${orderId}`,
  },

  SUBSCRIPTION_PLANS: {
    GET_ALL: `${BILLING_PATH}/subscription-plans`,
    GET_BY_ID: planId => `${BILLING_PATH}/subscription-plans/${planId}`,
  },

  // === Request Service (Quản lý Notation, Requests) ===
  REQUEST: {
    NOTATION_INSTRUMENTS: `${REQUEST_PATH}/notation-instruments`,
  },

  // === Service Requests Management ===
  SERVICE_REQUESTS: {
    // GET /api/v1/requests/requests
    GET_ALL: `${REQUEST_PATH}/requests`,
    // POST /api/v1/requests/requests
    CREATE: `${REQUEST_PATH}/requests`,
    // PUT /api/v1/requests/requests/{requestId}/assign
    ASSIGN: requestId => `${REQUEST_PATH}/requests/${requestId}/assign`,
    // GET /api/v1/requests/requests/{requestId}
    GET_BY_ID: requestId => `${REQUEST_PATH}/requests/${requestId}`,
    // GET /api/v1/requests/requests/my-requests?status=
    MY_REQUESTS: `${REQUEST_PATH}/requests/my-requests`,
  },

  // === Notation Instruments Management ===
  NOTATION_INSTRUMENTS: {
    // GET /notation-instruments?usage=transcription|arrangement|both&includeInactive=true
    GET_ALL: `${REQUEST_PATH}/notation-instruments`,
    // POST /notation-instruments (with multipart/form-data)
    CREATE: `${REQUEST_PATH}/notation-instruments`,
    // PUT /notation-instruments/{id} (with multipart/form-data)
    UPDATE: id => `${REQUEST_PATH}/notation-instruments/${id}`,
    // POST /notation-instruments/{id}/image
    UPLOAD_IMAGE: id => `${REQUEST_PATH}/notation-instruments/${id}/image`,
  },

  // === Chat Service (Quản lý Chat Rooms & Messages) ===
  CHAT: {
    // Chat Rooms
    GET_ALL_ROOMS: `${CHAT_PATH}/chat-rooms`,
    GET_ROOM: roomId => `${CHAT_PATH}/chat-rooms/${roomId}`,
    CREATE_ROOM: `${CHAT_PATH}/chat-rooms`,
    ADD_PARTICIPANT: roomId => `${CHAT_PATH}/chat-rooms/${roomId}/participants`,
    REMOVE_PARTICIPANT: (roomId, userId) => `${CHAT_PATH}/chat-rooms/${roomId}/participants/${userId}`,
    
    // Messages (read-only via REST, send via WebSocket)
    GET_MESSAGES: roomId => `${CHAT_PATH}/messages/room/${roomId}`,
    GET_RECENT_MESSAGES: (roomId, sinceTimestamp) => `${CHAT_PATH}/messages/room/${roomId}/recent?sinceTimestamp=${sinceTimestamp}`,
    
    // WebSocket (for real-time messaging)
    WS_ENDPOINT: `${CHAT_PATH}/ws`,
  },

  // === Pricing Management ===
  PRICING: {
    // GET /pricing-matrix
    GET_ALL: `${REQUEST_PATH}/pricing-matrix`,
    // GET /pricing-matrix/{serviceType}
    GET_BY_SERVICE_TYPE: serviceType => `${REQUEST_PATH}/pricing-matrix/${serviceType}`,
    // GET /pricing-matrix/calculate/{serviceType}?durationMinutes=X
    CALCULATE: (serviceType, durationMinutes) => 
      `${REQUEST_PATH}/pricing-matrix/calculate/${serviceType}?durationMinutes=${durationMinutes}`,
  },
};

// Log configuration in development
if (API_CONFIG.IS_DEV) {
  console.log('🔧 [Config] API Configuration:', {
    BASE_URL: API_CONFIG.BASE_URL,
    API_PREFIX: API_CONFIG.API_PREFIX,
    GOOGLE_CLIENT_ID: API_CONFIG.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    ENV: API_CONFIG.IS_DEV ? 'Development' : 'Production',
  });
}
