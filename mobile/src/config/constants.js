// User Roles
export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  SPECIALIST: 'SPECIALIST',
  MANAGER: 'MANAGER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@mutrapro_access_token',
  REFRESH_TOKEN: '@mutrapro_refresh_token',
  USER_DATA: '@mutrapro_user_data',
  REMEMBER_ME: '@mutrapro_remember_me',
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[0-9]{10,11}$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MAX_LENGTH: 50,
  OTP_LENGTH: 6,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Cannot connect to server. Please check your network connection.',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  PASSWORD_MISMATCH: 'Passwords do not match',
  REQUIRED_FIELD: 'This field is required',
  LOGIN_FAILED: 'Email or password is incorrect',
  REGISTER_FAILED: 'Registration failed. Please try again.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful! Please check your email to verify.',
  VERIFY_EMAIL_SUCCESS: 'Email verification successful!',
  UPDATE_PROFILE_SUCCESS: 'Profile updated successfully!',
  PASSWORD_RESET_SUCCESS: 'Password reset successful!',
};

// Colors
export const COLORS = {
  primary: '#ec8a1c',
  primaryDark: '#5639CC',
  primaryLight: '#8B74FF',
  secondary: '#FF6B9D',
  background: '#F8F9FA',
  white: '#FFFFFF',
  black: '#000000',
  text: '#212529',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  info: '#17A2B8',
  gray: {
    100: '#F8F9FA',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  },
};

// Font Sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

// Screen Names
export const SCREEN_NAMES = {
  // Auth Stack
  LOGIN: 'Login',
  REGISTER: 'Register',
  VERIFY_EMAIL: 'VerifyEmail',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  
  // Main Stack
  HOME: 'Home',
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
  MY_REQUESTS: 'MyRequests',
  REQUEST_DETAIL: 'RequestDetail',
  CREATE_REQUEST: 'CreateRequest',
  MY_CONTRACTS: 'MyContracts',
  CONTRACT_DETAIL: 'ContractDetail',
  WALLET: 'Wallet',
  NOTIFICATIONS: 'Notifications',
  SETTINGS: 'Settings',
};

