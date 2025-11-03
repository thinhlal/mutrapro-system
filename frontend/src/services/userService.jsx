// src/services/userService.jsx
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';
import axiosInstancePublic from '../utils/axiosInstancePublic';

/**
 * Get user by ID (basic info from users_auth table)
 * Endpoint: GET /api/users/{id}
 */
export const getUserById = async userId => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.USER.CREATE}/${userId}`
    );
    return response.data; // ApiResponse<UserResponse>
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin user' };
  }
};

/**
 * Get user profile (detailed info from users table)
 * Endpoint: GET /api/users/{id}/profile
 */
export const getUserProfile = async userId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.USER.PROFILE(userId)
    );
    return response.data; // ApiResponse<UserProfileResponse>
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy thông tin người dùng' }
    );
  }
};

/**
 * Update user basic info
 * Endpoint: PUT /api/users/{id}
 */
export const updateUser = async (userId, userData) => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.USER.CREATE}/${userId}`,
      userData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật user' };
  }
};

/**
 * Update user profile (detailed info)
 * Endpoint: PUT /api/users/{id}/profile
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.USER.PROFILE(userId),
      profileData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật thông tin' };
  }
};

/**
 * Delete user
 * Endpoint: DELETE /api/users/{id}
 */
export const deleteUser = async userId => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.USER.CREATE}/${userId}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xóa user' };
  }
};

/**
 * Create new user (admin only)
 * Endpoint: POST /api/users
 */
export const createUser = async userData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.USER.CREATE,
      userData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo user' };
  }
};

/**
 * Verify email with OTP
 * Endpoint: POST /users/verify-email (public)
 */
export const verifyEmail = async verificationData => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.USER.VERIFY_EMAIL,
      verificationData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xác thực email' };
  }
};

/**
 * Resend verification email
 * Endpoint: POST /users/resend-verification (public)
 */
export const resendVerification = async email => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.USER.RESEND_VERIFICATION,
      { email }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi gửi lại email xác thực' };
  }
};
