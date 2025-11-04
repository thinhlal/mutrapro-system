import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';
import { getItem } from '../services/localStorageService';
import { setItem, removeItem } from '../services/localStorageService';

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - CHỈ LOG LỖI, KHÔNG LOG SUCCESS
axiosInstance.interceptors.request.use(
  config => {
    const token = getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    // CHỈ log request setup errors (rất hiếm)
    console.error('Request setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - CHỈ LOG API ERRORS
axiosInstance.interceptors.response.use(
  // SUCCESS responses - KHÔNG LOG GÌ CẢaaaaaaaaaaaaaaa
  response => response,

  // ERROR responses - CHỈ LOG ERRORS CẦN THIẾT
  async error => {
    const originalRequest = error.config;

    // 1. Log SERVER ERRORS (5xx) - Server có vấn đề
    if (error.response?.status >= 500) {
      console.error(`Server Error ${error.response.status}:`, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response.status,
        data: error.response.data,
      });
    }

    // 2. Log NETWORK ERRORS - Không kết nối được
    else if (!error.response && error.request) {
      console.error('Network Error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        message: error.message,
      });
    }

    // 3. KHÔNG LOG client errors 4xx (trừ auth errors đặc biệt)
    // Vì 400, 404, 422 là business logic errors, không cần Sentry

    // 401 handling
    const SKIP_REFRESH_URLS = [
      API_ENDPOINTS.AUTH.REFRESH,
      API_ENDPOINTS.AUTH.LOGOUT,
    ];

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !SKIP_REFRESH_URLS.includes(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshResponse = await axiosInstance.post(
          API_ENDPOINTS.AUTH.REFRESH,
          {},
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        // ApiResponse format: { status: 'success'|'error', data: { accessToken, ... }, errorCode?, message? }
        if (
          refreshResponse?.data?.status === 'success' &&
          refreshResponse?.data?.data?.accessToken
        ) {
          const newToken = refreshResponse.data.data.accessToken;
          setItem('accessToken', newToken);
          // Cập nhật header Authorization cho request gốc
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Nếu request gốc gửi token trong body (vd: /auth/introspect, /auth/logout), cập nhật luôn
          if (
            originalRequest.data &&
            typeof originalRequest.data === 'object' &&
            Object.prototype.hasOwnProperty.call(originalRequest.data, 'token')
          ) {
            originalRequest.data = { ...originalRequest.data, token: newToken };
          }
          processQueue(null, newToken);
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('Auth refresh failed:', refreshError);
        removeItem('accessToken');
        processQueue(refreshError, null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
