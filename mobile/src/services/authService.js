import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';
import axiosInstancePublic from '../utils/axiosInstancePublic';

/**
 * Login service
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{accessToken: string, user: object}>}
 */
export const login = async (email, password) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password },
      { withCredentials: true }
    );

    const payload = response?.data;
    const auth = payload?.data || {};

    const accessToken = auth.accessToken;
    const user = {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      fullName: auth.fullName,
      isNoPassword: auth.isNoPassword === true,
    };

    return { accessToken, user };
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi đăng nhập' };
  }
};

/**
 * Register service
 * @param {object} registerData - { fullName, email, password, phone, address, role }
 * @returns {Promise<object>}
 */
export const register = async (registerData) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.REGISTER,
      registerData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi đăng ký' };
  }
};

/**
 * Logout service
 * @param {string} token - Access token
 * @returns {Promise<object>}
 */
export const logout = async (token) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.LOGOUT,
      { token },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi đăng xuất' };
  }
};

/**
 * Refresh access token
 * @returns {Promise<object>}
 */
export const refreshToken = async () => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.REFRESH,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi làm mới token' };
  }
};

/**
 * Introspect token
 * @param {string} token 
 * @returns {Promise<object>}
 */
export const introspect = async (token) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.AUTH.INTROSPECT,
      { token },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi xác thực token' };
  }
};

/**
 * Forgot password - Request password reset
 * @param {string} email 
 * @returns {Promise<object>}
 */
export const forgotPassword = async (email) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi yêu cầu đặt lại mật khẩu' };
  }
};

/**
 * Reset password with token
 * @param {object} data - { token, newPassword }
 * @returns {Promise<object>}
 */
export const resetPassword = async (data) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      data
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi đặt lại mật khẩu' };
  }
};

/**
 * Create password for OAuth accounts
 * @param {object} data - { email, password }
 * @returns {Promise<object>}
 */
export const createPassword = async (data) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.AUTH.CREATE_PASSWORD,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi tạo mật khẩu' };
  }
};

