import { VALIDATION, ERROR_MESSAGES } from '../config/constants';

/**
 * Validate email format
 * @param {string} email 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate password
 * @param {string} password 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validatePassword = (password) => {
  if (!password || password.length === 0) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_PASSWORD };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate confirm password
 * @param {string} password 
 * @param {string} confirmPassword 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: ERROR_MESSAGES.PASSWORD_MISMATCH };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate required field
 * @param {string} value 
 * @param {string} fieldName 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validateRequired = (value, fieldName = 'Trường này') => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate phone number
 * @param {string} phone 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim().length === 0) {
    return { isValid: true, error: null }; // Phone is optional
  }
  
  if (!VALIDATION.PHONE_REGEX.test(phone)) {
    return { isValid: false, error: 'Số điện thoại không hợp lệ' };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate OTP code
 * @param {string} code 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validateOTP = (code) => {
  if (!code || code.length === 0) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  if (code.length !== VALIDATION.OTP_LENGTH) {
    return { isValid: false, error: `Mã OTP phải có ${VALIDATION.OTP_LENGTH} chữ số` };
  }
  
  if (!/^\d+$/.test(code)) {
    return { isValid: false, error: 'Mã OTP chỉ bao gồm số' };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate name
 * @param {string} name 
 * @returns {object} { isValid: boolean, error: string }
 */
export const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }
  
  if (name.trim().length > VALIDATION.NAME_MAX_LENGTH) {
    return { isValid: false, error: `Tên không được vượt quá ${VALIDATION.NAME_MAX_LENGTH} ký tự` };
  }
  
  return { isValid: true, error: null };
};

