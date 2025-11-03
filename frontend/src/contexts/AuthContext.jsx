// src/contexts/AuthContext.jsx
import { create } from 'zustand';
import * as authService from '../services/authService';
import * as localStorageService from '../services/localStorageService';
// (Bạn sẽ cần tạo file userService.jsx và import nó ở đây)
// import * as userService from '../services/userService'; 

const AUTH_STORAGE_KEY = 'auth';

// Hàm nội bộ để lấy thông tin user đầy đủ
// (Đây là hàm bạn sẽ cần gọi sau khi login)
const fetchFullUserProfile = async (userId) => {
  // try {
  //   // Giả sử bạn có hàm userService.getProfile(userId)
  //   const response = await userService.getProfile(userId); 
  //   return response.data; // Trả về { fullName, phone, address, ... }
  // } catch (error) {
  //   console.error("Không thể lấy user profile:", error);
  //   return null; // Trả về null nếu lỗi
  // }
  
  // Tạm thời hardcode, bạn sẽ cần implement hàm gọi API thật
  console.log("Sẽ cần gọi API profile cho userId:", userId);
  return { fullName: "Loading..." }; // Dữ liệu tạm
};


export const useAuth = create((set, get) => ({
  // --- State ---
  isAuthenticated: localStorageService.getItem(AUTH_STORAGE_KEY)?.isAuthenticated || false,
  user: localStorageService.getItem(AUTH_STORAGE_KEY)?.user || null,
  accessToken: localStorageService.getItem(AUTH_STORAGE_KEY)?.accessToken || null,
  loading: false,
  error: null,

  // --- Actions ---
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.login(email, password);
      const { data } = response; // data là AuthenticationResponse

      // Lấy thông tin cơ bản từ login
      const baseUserData = {
        userId: data.userId, // <--- LẤY ID TỪ RESPONSE
        email: data.email,
        role: data.role,
      };

      // *** GỌI API PROFILE ĐỂ LẤY THÔNG TIN ĐẦY ĐỦ ***
      // const fullProfile = await fetchFullUserProfile(data.userId);

      // Gộp thông tin
      const finalUserData = {
        ...baseUserData,
        // ...fullProfile, // (fullName, phone, address... từ API profile)
      };

      set({
        isAuthenticated: true,
        user: finalUserData, // Lưu user đầy đủ
        accessToken: data.accessToken,
        loading: false,
      });

      localStorageService.setItem(AUTH_STORAGE_KEY, {
        isAuthenticated: true,
        user: finalUserData,
        accessToken: data.accessToken,
      });
      
      return response;

    } catch (error) {
      set({ loading: false, error: error.message || 'Đăng nhập thất bại' });
      throw error;
    }
  },

  register: async (registerData) => {
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
      if(token) {
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
        error: null
      });
      localStorageService.removeItem(AUTH_STORAGE_KEY);
    }
  },
}));