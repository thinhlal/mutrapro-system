import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';
import axiosInstancePublic from '../utils/axiosInstancePublic';

/**
 * Get all users (SYSTEM_ADMIN only)
 * @returns {Promise<object>}
 */
export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.USER.GET_ALL);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error getting users list' };
  }
};

/**
 * Get user profile (full info)
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export const getUserProfile = async (userId) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.USER.FULL(userId));
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error getting user information' };
  }
};

/**
 * Update user profile
 * @param {string} userId 
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export const updateFullUser = async (userId, payload) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.USER.FULL_UPDATE(userId),
      payload
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error updating information' };
  }
};

/**
 * Verify email with OTP
 * @param {string} email 
 * @param {string} code 
 * @returns {Promise<object>}
 */
export const verifyEmail = async (email, code) => {
  try {
    // Backend yêu cầu code và email qua query parameters, không phải body
    const response = await axiosInstancePublic.post(
      `${API_ENDPOINTS.USER.VERIFY_EMAIL}?code=${code}&email=${encodeURIComponent(email)}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error verifying email' };
  }
};

/**
 * Resend verification email
 * @param {string} email 
 * @returns {Promise<object>}
 */
export const resendVerification = async (email) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.USER.RESEND_VERIFICATION,
      { email }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error resending verification email' };
  }
};

/**
 * Check verification status
 * @param {string} email 
 * @returns {Promise<object>}
 */
export const checkVerificationStatus = async (email) => {
  try {
    const response = await axiosInstancePublic.get(
      `${API_ENDPOINTS.USER.VERIFICATION_STATUS}?email=${encodeURIComponent(email)}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error checking verification status' };
  }
};

/**
 * Delete user
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export const deleteUser = async (userId) => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.USER.CREATE}/${userId}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error deleting user' };
  }
};

/**
 * Create user
 * @param {object} userData 
 * @returns {Promise<object>}
 */
export const createUser = async (userData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.USER.CREATE,
      userData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error creating user' };
  }
};

