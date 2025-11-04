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
const PROJECT_PATH = `${API_PREFIX}/projects`; // Quản lý Files, Folders, Tags
const BILLING_PATH = `${API_PREFIX}/billing`; // Quản lý Payments, Subscriptions

// API Endpoints
export const API_ENDPOINTS = {
  // === Identity Service (Quản lý User & Auth) ===
  AUTH: {
    // Controller: /auth/log-in
    LOGIN: `${IDENTITY_PATH}/auth/log-in`,
    // Controller: /auth/logout
    LOGOUT: `${IDENTITY_PATH}/auth/logout`,
    // Controller: /auth/refresh
    REFRESH: `${IDENTITY_PATH}/auth/refresh`,
    // Public Endpoint: /auth/outbound/authentication
    GOOGLE_LOGIN: `${IDENTITY_PATH}/auth/outbound/authentication`,
    // Controller: /auth/introspect
    INTROSPECT: `${IDENTITY_PATH}/auth/introspect`,
    // Public Endpoint: /auth/forgot-password
    FORGOT_PASSWORD: `${IDENTITY_PATH}/auth/forgot-password`,
    // Public Endpoint: /auth/reset-password
    RESET_PASSWORD: `${IDENTITY_PATH}/auth/reset-password`,
  },

  USER: {
    // Controller: /api/users/{id}/profile
    PROFILE: id => `${IDENTITY_PATH}/api/users/${id}/profile`,
    // Controller: /api/users
    CREATE: `${IDENTITY_PATH}/api/users`,
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
};

// Log configuration in development
if (API_CONFIG.IS_DEV) {
  console.log('🔧 [Config] API Configuration:', {
    BASE_URL: API_CONFIG.BASE_URL,
    GOOGLE_CLIENT_ID: API_CONFIG.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    ENV: API_CONFIG.IS_DEV ? 'Development' : 'Production',
  });
}
