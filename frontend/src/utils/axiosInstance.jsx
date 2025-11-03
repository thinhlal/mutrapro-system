// src/utils/axiosInstance.jsx
import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';
import { useAuth } from '../contexts/AuthContext';

const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies with requests
});

// Queue to store failed requests while refreshing token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// --- REQUEST INTERCEPTOR ---
// Automatically add Bearer token to all requests
axiosInstance.interceptors.request.use(
  config => {
    const token = useAuth.getState().accessToken;

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// --- RESPONSE INTERCEPTOR ---
// Handle token refresh on 401 errors
axiosInstance.interceptors.response.use(
  response => {
    // Success response, return as is
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // If error is not 401 or request is already retried, reject immediately
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Don't retry refresh endpoint itself
    if (originalRequest.url?.includes(API_ENDPOINTS.AUTH.REFRESH)) {
      // Refresh token failed, logout user
      useAuth.getState().logout();
      return Promise.reject(error);
    }

    // Don't retry login/register endpoints
    if (
      originalRequest.url?.includes(API_ENDPOINTS.AUTH.LOGIN) ||
      originalRequest.url?.includes(API_ENDPOINTS.AUTH.REGISTER)
    ) {
      return Promise.reject(error);
    }

    // Mark request as retried to avoid infinite loop
    originalRequest._retry = true;

    if (isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    try {
      // Attempt to refresh token
      const newToken = await useAuth.getState().refreshAccessToken();

      // Process queued requests with new token
      processQueue(null, newToken);

      // Retry original request with new token
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Refresh failed, process queue with error and logout
      processQueue(refreshError, null);
      useAuth.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default axiosInstance;
