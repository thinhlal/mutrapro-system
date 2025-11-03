// src/contexts/AuthContext.jsx
import { create } from 'zustand';
import * as authService from '../services/authService';
import * as userService from '../services/userService';
import * as localStorageService from '../services/localStorageService';
import { decodeJWT, isTokenExpired } from '../utils/jwtUtils';

const AUTH_STORAGE_KEY = 'auth';
const USER_STORAGE_KEY = 'user';

/**
 * Hàm nội bộ để lấy thông tin user đầy đủ từ backend
 */
const fetchFullUserProfile = async userId => {
  try {
    const response = await userService.getUserProfile(userId);
    return response.data; // UserProfileResponse
  } catch (error) {
    console.error('Không thể lấy user profile:', error);
    return null;
  }
};

// Initialize state from localStorage
const initializeAuth = () => {
  const storedUser = localStorageService.getItem(USER_STORAGE_KEY);
  return {
    isAuthenticated: !!storedUser,
    user: storedUser || null,
    accessToken: null, // Never store in localStorage for security
    loading: false,
    error: null,
  };
};

export const useAuth = create((set, get) => ({
  // --- State ---
  ...initializeAuth(),

  // --- Actions ---
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.login(email, password);
      const { data } = response; // data là AuthenticationResponse
      // data contains: { accessToken, tokenType, expiresIn, email, role }

      // Decode JWT token để lấy thông tin
      const decodedToken = decodeJWT(data.accessToken);

      if (!decodedToken) {
        throw new Error('Invalid token received from server');
      }

      // Extract user info from token
      // JWT payload contains: { sub: email, scope: role, exp, iat, jti, iss }
      const baseUserData = {
        email: decodedToken.sub || data.email,
        role: decodedToken.scope || data.role,
        tokenExpiry: decodedToken.exp,
      };

      // *** TÙY CHỌN: GỌI API PROFILE ĐỂ LẤY THÔNG TIN ĐẦY ĐỦ ***
      // Nếu cần thông tin như fullName, phone, address, có thể gọi API profile
      // Tuy nhiên, cần userId để gọi API này
      // Vì backend không trả userId trong AuthenticationResponse,
      // ta có thể skip bước này và lấy profile khi cần thiết

      // For now, use basic user data from token
      const finalUserData = {
        ...baseUserData,
      };

      set({
        isAuthenticated: true,
        user: finalUserData,
        accessToken: data.accessToken, // Store in memory only
        loading: false,
        error: null,
      });

      // IMPORTANT: Chỉ lưu user info vào localStorage, KHÔNG lưu token
      localStorageService.setItem(USER_STORAGE_KEY, finalUserData);

      // Remove old auth key if exists
      localStorageService.removeItem(AUTH_STORAGE_KEY);

      return response;
    } catch (error) {
      set({ loading: false, error: error.message || 'Đăng nhập thất bại' });
      throw error;
    }
  },

  register: async registerData => {
    set({ loading: true, error: null });
    try {
      const response = await authService.register(registerData);
      set({ loading: false });
      return response;
    } catch (error) {
      set({ loading: false, error: error.message || 'Đăng ký thất bại' });
      throw error;
    }
  },

  logout: async () => {
    const token = get().accessToken;
    set({ loading: true });
    try {
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Lỗi khi gọi API logout (blacklist):', error);
    } finally {
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
        error: null,
      });
      // Clear user info from localStorage
      localStorageService.removeItem(USER_STORAGE_KEY);
      localStorageService.removeItem(AUTH_STORAGE_KEY); // Remove old key if exists
    }
  },

  // Refresh access token using refresh token from cookie
  refreshAccessToken: async () => {
    try {
      const response = await authService.refreshToken();
      const { data } = response; // AuthenticationResponse

      if (!data || !data.accessToken) {
        throw new Error('Invalid refresh token response');
      }

      // Decode new token
      const decodedToken = decodeJWT(data.accessToken);

      if (!decodedToken) {
        throw new Error('Invalid token received from server');
      }

      // Update user info from new token
      const updatedUserData = {
        email: decodedToken.sub || data.email,
        role: decodedToken.scope || data.role,
        tokenExpiry: decodedToken.exp,
      };

      set({
        isAuthenticated: true,
        user: updatedUserData,
        accessToken: data.accessToken,
        error: null,
      });

      // Update localStorage
      localStorageService.setItem(USER_STORAGE_KEY, updatedUserData);

      return data.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Token refresh failed, logout user
      get().logout();
      throw error;
    }
  },

  // Set access token (used by axios interceptor after refresh)
  setAccessToken: token => {
    set({ accessToken: token });
  },

  // Check if token is expired and refresh if needed
  checkAndRefreshToken: async () => {
    const { accessToken, refreshAccessToken } = get();

    if (!accessToken) {
      return false;
    }

    if (isTokenExpired(accessToken)) {
      try {
        await refreshAccessToken();
        return true;
      } catch (error) {
        return false;
      }
    }

    return true;
  },
}));
