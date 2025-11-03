// src/utils/axiosInstance.jsx
import axios from "axios";
import { API_CONFIG } from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext"; // Import Zustand store

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL, //  'http://localhost:8080'
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Interceptor (Trái tim của file này) ---
// Tự động thêm token vào header cho MỌI request
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ state của Zustand
    const token = useAuth.getState().accessToken;

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// (Bạn có thể thêm logic interceptor để xử lý refresh token ở đây nếu muốn)

export default axiosInstance;
