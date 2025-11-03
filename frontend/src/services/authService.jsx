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
    const response = await axiosInstancePublic.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    // Backend trả về theo cấu trúc ApiResponse<T>
    //
    // Chúng ta trả về response.data để store xử lý
    return response.data;
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
export const register = async (registerData) => {
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
 * DÙNG axiosInstance (vì user phải đăng nhập rồi mới logout).
 * Backend (Identity Service) yêu
 *
 */
export const logout = async (token) => {
   try {
    // Token (accessToken) sẽ được gửi trong body
    //
    const response = await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, {
       token
    }); 
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi logout' };
  }
};

// ... (Thêm các service khác như introspect, refresh token... tương tự)