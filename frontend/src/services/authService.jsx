// src/services/authService.jsx
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';
import axiosInstancePublic from '../utils/axiosInstancePublic';

/**
 * Dịch vụ xử lý đăng nhập.
 * DÙNG axiosInstancePublic vì user chưa đăng nhập.
 * Backend (Identity Service) yêu cầu: { email, password }
 *
 */
export const login = async (email, password) => {
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.LOGIN,
      {
        email,
        password,
      },
      {
        withCredentials: true,
      }
    );

    // Chuẩn hoá theo response thực tế:
    // axios -> response.data = { status, statusCode, message, timestamp, data: { accessToken, tokenType, expiresIn, email, role } }
    const payload = response?.data;
    const auth = payload?.data || {};

    const accessToken = auth.accessToken;
    const user = {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      fullName: auth.fullName,
    };

    return { accessToken, user };
  } catch (error) {
    // Ném lỗi để Zustand store có thể bắt và xử lý
    throw error.response?.data || { message: 'Lỗi máy chủ' };
  }
};

/**
 * Dịch vụ xử lý đăng ký.
 * DÙNG axiosInstancePublic.
 * Backend (Identity Service) yêu cầu: { fullName, phone, address, email, password, role }
 *
 */
export const register = async registerData => {
  // registerData là một object chứa { fullName, email, password, phone, ... }
  try {
    const response = await axiosInstancePublic.post(
      API_ENDPOINTS.AUTH.REGISTER,
      registerData
    );
    // Trả về response.data (là ApiResponse<RegisterResponse>)
    //
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi đăng ký' };
  }
};

/**
 * Dịch vụ xử lý logout.
 * DÙNG axiosInstancePublic (vì user phải đăng nhập rồi mới logout).
 * Backend (Identity Service) yêu cầu token trong body
 */
export const logout = async token => {
  try {
    // Token (accessToken) sẽ được gửi trong body
    const response = await axiosInstancePublic.post(API_ENDPOINTS.AUTH.LOGOUT, {
      token,
    }, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi logout' };
  }
};

/**
 * Dịch vụ refresh access token.
 * DÙNG axiosInstancePublic vì token hiện tại có thể đã hết hạn.
 * Refresh token được gửi tự động qua HTTP-only cookie.
 */
export const refreshToken = async () => {
  try {
    const response = await axiosInstancePublic.post(API_ENDPOINTS.AUTH.REFRESH, {}, {
      withCredentials: true,
    });
    // Backend trả về response.data là ApiResponse<AuthenticationResponse>
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi refresh token' };
  }
};

/**
 * Introspect token để kiểm tra tính hợp lệ
 */
export const introspect = async token => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.AUTH.INTROSPECT, {
      token,
    }, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi introspect token' };
  }
};
