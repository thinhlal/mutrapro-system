// API Configuration
export const API_CONFIG = {
  // Backend API endpoint (Luôn trỏ đến API Gateway)
  BASE_URL:
    import.meta.env.VITE_API_BACK_END_ENDPOINT || 'http://localhost:8080',

  // Tiền tố API chung được định nghĩa trong Gateway
  API_PREFIX: import.meta.env.VITE_API_PREFIX || '/api/v1',

  // Google OAuth config
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',

  // Company/Party A info for contracts
  PARTY_A_NAME: import.meta.env.VITE_PARTY_A_NAME || 'MuTraPro Studio Co., Ltd',
  PARTY_A_ADDRESS: import.meta.env.VITE_PARTY_A_ADDRESS || '',

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
const NOTIFICATIONS_PATH = `${API_PREFIX}/notifications`;
const SPECIALIST_PATH = `${API_PREFIX}/specialists`;

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

  // === Project Service (Quản lý File, Folder, Tag, Contract) ===
  // Giả định các controller bên trong project-service giữ nguyên đường dẫn
  FILES: {
    MY_FILES: `${PROJECT_PATH}/files/my-files`,
    UPLOAD: `${PROJECT_PATH}/file/upload`,
    DOWNLOAD: fileId => `${PROJECT_PATH}/files/download/${fileId}`,
    GET_BY_REQUEST_ID: requestId =>
      `${PROJECT_PATH}/files/by-request/${requestId}`,
    // Task file upload endpoints
    UPLOAD_TASK_FILE: `${PROJECT_PATH}/files/upload`,
    GET_BY_ASSIGNMENT_ID: assignmentId =>
      `${PROJECT_PATH}/files/by-assignment/${assignmentId}`,
    DELETE: fileId => `${PROJECT_PATH}/files/${fileId}`,
    // Manager file management endpoints
    APPROVE: fileId => `${PROJECT_PATH}/files/${fileId}/approve`,
    REJECT: fileId => `${PROJECT_PATH}/files/${fileId}/reject`,
    DELIVER: fileId => `${PROJECT_PATH}/files/${fileId}/deliver`,
    GET_FILE_INFO: fileId => `${PROJECT_PATH}/files/${fileId}`,
  },

  CONTRACTS: {
    BASE: `${PROJECT_PATH}/contracts`,
    // POST /api/v1/projects/contracts/from-request/{requestId}
    CREATE_FROM_REQUEST: requestId =>
      `${PROJECT_PATH}/contracts/from-request/${requestId}`,
    // GET /api/v1/projects/contracts/{contractId}
    GET_BY_ID: contractId => `${PROJECT_PATH}/contracts/${contractId}`,
    // PUT /api/v1/projects/contracts/{contractId}
    UPDATE: contractId => `${PROJECT_PATH}/contracts/${contractId}`,
    // GET /api/v1/projects/contracts/by-request/{requestId}
    GET_BY_REQUEST_ID: requestId =>
      `${PROJECT_PATH}/contracts/by-request/${requestId}`,
    // GET /api/v1/projects/contracts/my-contracts
    MY_CONTRACTS: `${PROJECT_PATH}/contracts/my-contracts`,
    // GET /api/v1/projects/contracts/my-managed-contracts
    MY_MANAGED_CONTRACTS: `${PROJECT_PATH}/contracts/my-managed-contracts`,
    // POST /api/v1/projects/contracts/{contractId}/send
    SEND: contractId => `${PROJECT_PATH}/contracts/${contractId}/send`,
    // POST /api/v1/projects/contracts/{contractId}/approve
    APPROVE: contractId => `${PROJECT_PATH}/contracts/${contractId}/approve`,
    // POST /api/v1/projects/contracts/{contractId}/start-work
    START_WORK: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/start-work`,
    // POST /api/v1/projects/contracts/{contractId}/sign
    SIGN: contractId => `${PROJECT_PATH}/contracts/${contractId}/sign`,
    // POST /api/v1/projects/contracts/{contractId}/request-change
    REQUEST_CHANGE: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/request-change`,
    // POST /api/v1/projects/contracts/{contractId}/cancel
    CANCEL: contractId => `${PROJECT_PATH}/contracts/${contractId}/cancel`,
    // POST /api/v1/projects/contracts/{contractId}/cancel-by-manager
    CANCEL_BY_MANAGER: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/cancel-by-manager`,
    // POST /api/v1/projects/contracts/{contractId}/init-esign
    INIT_ESIGN: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/init-esign`,
    // POST /api/v1/projects/contracts/{contractId}/verify-otp
    VERIFY_OTP: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/verify-otp`,
    // GET /api/v1/projects/contracts/{contractId}/signature-image
    SIGNATURE_IMAGE: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/signature-image`,
    // POST /api/v1/projects/contracts/{contractId}/upload-pdf
    UPLOAD_PDF: contractId =>
      `${PROJECT_PATH}/contracts/${contractId}/upload-pdf`,
    // GET /api/v1/projects/contracts/{contractId}/milestones/{milestoneId}
    GET_MILESTONE_BY_ID: (contractId, milestoneId) =>
      `${PROJECT_PATH}/contracts/${contractId}/milestones/${milestoneId}`,
  },

  // === Task Assignment Management ===
  TASK_ASSIGNMENTS: {
    // Manager endpoints
    BASE: `${PROJECT_PATH}/task-assignments`,
    RESOLVE_ISSUE: (contractId, assignmentId) =>
      `${PROJECT_PATH}/task-assignments/${assignmentId}/resolve-issue?contractId=${contractId}`,
    CANCEL_BY_MANAGER: (contractId, assignmentId) =>
      `${PROJECT_PATH}/task-assignments/${assignmentId}/cancel?contractId=${contractId}`,
    // Specialist endpoints
    MY_TASKS: `${PROJECT_PATH}/specialist/task-assignments`,
    MY_TASK_DETAIL: assignmentId =>
      `${PROJECT_PATH}/specialist/task-assignments/${assignmentId}`,
    ACCEPT: assignmentId =>
      `${PROJECT_PATH}/specialist/task-assignments/${assignmentId}/accept`,
    START: assignmentId =>
      `${PROJECT_PATH}/specialist/task-assignments/${assignmentId}/start`,
    CANCEL: assignmentId =>
      `${PROJECT_PATH}/specialist/task-assignments/${assignmentId}/cancel`,
    REPORT_ISSUE: assignmentId =>
      `${PROJECT_PATH}/specialist/task-assignments/${assignmentId}/report-issue`,
    SUBMIT_FOR_REVIEW: assignmentId =>
      `${PROJECT_PATH}/specialist/task-assignments/${assignmentId}/submit-for-review`,
  },

  // === Billing Service (Quản lý Thanh toán) ===
  PAYMENT: {
    CREATE_ORDER: `${BILLING_PATH}/payments/orders`,
    GET_ORDER: orderId => `${BILLING_PATH}/payments/orders/${orderId}`,
    GET_PENDING_ORDER: `${BILLING_PATH}/payments/orders/pending`,
    CANCEL_ORDER: orderId => `${BILLING_PATH}/payments/orders/${orderId}`,
    REFRESH_STATUS: orderId =>
      `${BILLING_PATH}/payments/orders/refresh/${orderId}`,
  },

  // === Wallet Management ===
  WALLET: {
    // GET /api/v1/billing/wallets/me
    GET_OR_CREATE_MY_WALLET: `${BILLING_PATH}/wallets/me`,
    // GET /api/v1/billing/wallets/{walletId}
    GET_BY_ID: walletId => `${BILLING_PATH}/wallets/${walletId}`,
    // POST /api/v1/billing/wallets/{walletId}/topup
    TOPUP: walletId => `${BILLING_PATH}/wallets/${walletId}/topup`,
    // POST /api/v1/billing/wallets/{walletId}/debit/deposit
    PAY_DEPOSIT: walletId =>
      `${BILLING_PATH}/wallets/${walletId}/debit/deposit`,
    // POST /api/v1/billing/wallets/{walletId}/debit/milestone
    PAY_MILESTONE: walletId =>
      `${BILLING_PATH}/wallets/${walletId}/debit/milestone`,
    // GET /api/v1/billing/wallets/{walletId}/transactions
    GET_TRANSACTIONS: walletId =>
      `${BILLING_PATH}/wallets/${walletId}/transactions`,
    // GET /api/v1/billing/wallets/me/transactions
    GET_MY_TRANSACTIONS: `${BILLING_PATH}/wallets/me/transactions`,
    // === Admin Wallet Management ===
    // GET /api/v1/billing/admin/wallets
    ADMIN_GET_ALL: `${BILLING_PATH}/admin/wallets`,
    // GET /api/v1/billing/admin/wallets/{walletId}
    ADMIN_GET_BY_ID: walletId => `${BILLING_PATH}/admin/wallets/${walletId}`,
    // GET /api/v1/billing/admin/wallets/{walletId}/transactions
    ADMIN_GET_TRANSACTIONS: walletId =>
      `${BILLING_PATH}/admin/wallets/${walletId}/transactions`,
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
    // GET /notation-instruments/by-ids?ids=id1&ids=id2
    GET_BY_IDS: `${REQUEST_PATH}/notation-instruments/by-ids`,
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
    GET_ROOM_BY_CONTEXT: `${CHAT_PATH}/chat-rooms/by-context`,
    CREATE_ROOM: `${CHAT_PATH}/chat-rooms`,
    ADD_PARTICIPANT: roomId => `${CHAT_PATH}/chat-rooms/${roomId}/participants`,
    REMOVE_PARTICIPANT: (roomId, userId) =>
      `${CHAT_PATH}/chat-rooms/${roomId}/participants/${userId}`,

    // Messages (read-only via REST, send via WebSocket)
    GET_MESSAGES: roomId => `${CHAT_PATH}/messages/room/${roomId}`,
    GET_RECENT_MESSAGES: (roomId, sinceTimestamp) =>
      `${CHAT_PATH}/messages/room/${roomId}/recent?sinceTimestamp=${sinceTimestamp}`,
    GET_UNREAD_COUNT: roomId =>
      `${CHAT_PATH}/messages/room/${roomId}/unread-count`,
    MARK_AS_READ: roomId => `${CHAT_PATH}/messages/room/${roomId}/mark-read`,

    // WebSocket (for real-time messaging)
    WS_ENDPOINT: `${CHAT_PATH}/ws`,
  },

  // === Pricing Management ===
  PRICING: {
    // GET /pricing-matrix
    GET_ALL: `${REQUEST_PATH}/pricing-matrix`,
    // GET /pricing-matrix/{serviceType}
    GET_BY_SERVICE_TYPE: serviceType =>
      `${REQUEST_PATH}/pricing-matrix/${serviceType}`,
    // GET /pricing-matrix/calculate/{serviceType}?durationMinutes=X
    CALCULATE: (serviceType, durationMinutes) =>
      `${REQUEST_PATH}/pricing-matrix/calculate/${serviceType}?durationMinutes=${durationMinutes}`,
  },

  // === Notification Service (Quản lý Thông báo) ===
  NOTIFICATIONS: {
    // GET /api/v1/notifications/notifications (Gateway: /api/v1/notifications → Service: /notifications)
    GET_ALL_NOTIFICATIONS: `${NOTIFICATIONS_PATH}/notifications`,
    // GET /api/v1/notifications/notifications/latest (Gateway: /api/v1/notifications → Service: /notifications/latest)
    GET_LATEST: `${NOTIFICATIONS_PATH}/notifications/latest`,
    // GET /api/v1/notifications/notifications/unread-count (Gateway: /api/v1/notifications → Service: /notifications/unread-count)
    GET_UNREAD_COUNT: `${NOTIFICATIONS_PATH}/notifications/unread-count`,
    // POST /api/v1/notifications/notifications/{notificationId}/read (Gateway: /api/v1/notifications → Service: /notifications/{id}/read)
    MARK_AS_READ: notificationId =>
      `${NOTIFICATIONS_PATH}/notifications/${notificationId}/read`,
    // POST /api/v1/notifications/notifications/mark-all-read (Gateway: /api/v1/notifications → Service: /notifications/mark-all-read)
    MARK_ALL_AS_READ: `${NOTIFICATIONS_PATH}/notifications/mark-all-read`,
    // WebSocket (for real-time notifications)
    // Frontend: /api/v1/notifications/notifications-ws → Gateway strip → /notifications-ws → Backend: /notifications-ws
    WS_ENDPOINT: `${NOTIFICATIONS_PATH}/notifications-ws`,
  },

  // === Specialist Service (Quản lý Specialist, Skills, Demos) ===
  SPECIALISTS: {
    // Admin Specialist Management
    ADMIN: {
      // POST /admin/specialists
      CREATE: `${SPECIALIST_PATH}/admin/specialists`,
      // GET /admin/specialists
      GET_ALL: `${SPECIALIST_PATH}/admin/specialists`,
      // GET /admin/specialists/{id}
      GET_BY_ID: id => `${SPECIALIST_PATH}/admin/specialists/${id}`,
      // GET /admin/specialists/user/{userId}
      GET_BY_USER_ID: userId =>
        `${SPECIALIST_PATH}/admin/specialists/user/${userId}`,
      // PUT /admin/specialists/{id}/status
      UPDATE_STATUS: id => `${SPECIALIST_PATH}/admin/specialists/${id}/status`,
      // PUT /admin/specialists/{id}/settings
      UPDATE_SETTINGS: id =>
        `${SPECIALIST_PATH}/admin/specialists/${id}/settings`,
      // GET /admin/specialists/filter?specialization=&status=
      FILTER: `${SPECIALIST_PATH}/admin/specialists/filter`,
    },
    // Admin Skill Management
    ADMIN_SKILLS: {
      // POST /admin/skills
      CREATE: `${SPECIALIST_PATH}/admin/skills`,
      // GET /admin/skills
      GET_ALL: `${SPECIALIST_PATH}/admin/skills`,
      // GET /admin/skills/{id}
      GET_BY_ID: id => `${SPECIALIST_PATH}/admin/skills/${id}`,
      // PUT /admin/skills/{id}
      UPDATE: id => `${SPECIALIST_PATH}/admin/skills/${id}`,
      // DELETE /admin/skills/{id}
      DELETE: id => `${SPECIALIST_PATH}/admin/skills/${id}`,
    },
    // Admin Demo Management
    ADMIN_DEMOS: {
      // GET /admin/demos
      GET_ALL: `${SPECIALIST_PATH}/admin/demos`,
      // GET /admin/demos/{demoId}
      GET_BY_ID: demoId => `${SPECIALIST_PATH}/admin/demos/${demoId}`,
      // PUT /admin/demos/{demoId}/visibility
      UPDATE_VISIBILITY: demoId =>
        `${SPECIALIST_PATH}/admin/demos/${demoId}/visibility`,
    },
    // Specialist Profile Management (Self-service)
    MANAGER: {
      // GET /manager/specialists?specialization=
      GET_AVAILABLE: `${SPECIALIST_PATH}/manager/specialists`,
    },
    PROFILE: {
      // GET /specialists/me
      GET_MY_PROFILE: `${SPECIALIST_PATH}/specialists/me`,
      // GET /specialists/me/detail
      GET_MY_PROFILE_DETAIL: `${SPECIALIST_PATH}/specialists/me/detail`,
      // PUT /specialists/me
      UPDATE_MY_PROFILE: `${SPECIALIST_PATH}/specialists/me`,
      // GET /specialists/me/skills/available
      GET_AVAILABLE_SKILLS: `${SPECIALIST_PATH}/specialists/me/skills/available`,
      // GET /specialists/me/skills
      GET_MY_SKILLS: `${SPECIALIST_PATH}/specialists/me/skills`,
      // POST /specialists/me/skills
      ADD_SKILL: `${SPECIALIST_PATH}/specialists/me/skills`,
      // PUT /specialists/me/skills/{skillId}
      UPDATE_SKILL: skillId =>
        `${SPECIALIST_PATH}/specialists/me/skills/${skillId}`,
      // DELETE /specialists/me/skills/{skillId}
      DELETE_SKILL: skillId =>
        `${SPECIALIST_PATH}/specialists/me/skills/${skillId}`,
      // GET /specialists/me/demos
      GET_MY_DEMOS: `${SPECIALIST_PATH}/specialists/me/demos`,
      // POST /specialists/me/demos
      CREATE_DEMO: `${SPECIALIST_PATH}/specialists/me/demos`,
      // PUT /specialists/me/demos/{demoId}
      UPDATE_DEMO: demoId =>
        `${SPECIALIST_PATH}/specialists/me/demos/${demoId}`,
      // DELETE /specialists/me/demos/{demoId}
      DELETE_DEMO: demoId =>
        `${SPECIALIST_PATH}/specialists/me/demos/${demoId}`,
    },
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

// Export default để đảm bảo module được nhận diện
export default {
  API_CONFIG,
  API_ENDPOINTS,
};
