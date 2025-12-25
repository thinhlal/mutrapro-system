// src/services/userService.jsx
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';
import axiosInstancePublic from '../utils/axiosInstancePublic';

/**
 * Get all users (SYSTEM_ADMIN only)
 * Endpoint: GET /api/users
 */
export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.USER.GET_ALL);
    return response.data; // ApiResponse<List<FullUserResponse>>
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách users' };
  }
};

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
    console.log('getUserProfile', userId);
    const response = await axiosInstance.get(API_ENDPOINTS.USER.FULL(userId));
    console.log('getUserProfile', response.data);
    return response.data; // ApiResponse<FullUserResponse>
  } catch (error) {
    console.log(error);
    throw (
      error.response?.data || { message: 'Lỗi khi lấy thông tin người dùng' }
    );
  }
};

export const updateFullUser = async (userId, payload) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.USER.FULL_UPDATE(userId),
      payload
    );
    return response.data; // ApiResponse<FullUserResponse>
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi cập nhật thông tin đầy đủ' }
    );
  }
};

/**
 * Update user profile (alias for updateFullUser)
 * Endpoint: PUT /api/users/{id}/full
 */
export const updateUserProfile = updateFullUser;

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
 * Create new user (Admin only) - Full user with email and password
 * Endpoint: POST /admin/users
 */
export const createFullUser = async userData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ADMIN_USER.CREATE,
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

/**
 * Search users with filters and pagination (Admin only)
 * Endpoint: POST /admin/users/search
 *
 * @param {Object} filters - Search filters
 * @param {string} filters.keyword - Search keyword (email, fullName, phone)
 * @param {string} filters.role - Filter by role
 * @param {boolean} filters.emailVerified - Filter by email verified status
 * @param {string} filters.authProvider - Filter by auth provider (LOCAL, GOOGLE)
 * @param {number} filters.page - Page number (default: 0)
 * @param {number} filters.size - Page size (default: 20)
 * @param {string} filters.sortBy - Sort field (default: createdAt)
 * @param {string} filters.sortDirection - Sort direction: ASC or DESC (default: DESC)
 * @returns {Promise} ApiResponse với UserPageResponse
 */
export const searchUsers = async (filters = {}) => {
  try {
    const searchRequest = {
      keyword: filters.keyword || null,
      role: filters.role || null,
      emailVerified: filters.emailVerified !== undefined ? filters.emailVerified : null,
      authProvider: filters.authProvider || null,
      page: filters.page !== undefined ? filters.page : 0,
      size: filters.size !== undefined ? filters.size : 20,
      sortBy: filters.sortBy || 'createdAt',
      sortDirection: filters.sortDirection || 'DESC',
    };

    const response = await axiosInstance.post(
      API_ENDPOINTS.ADMIN_USER.SEARCH,
      searchRequest
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tìm kiếm users' };
  }
};
