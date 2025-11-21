import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';
import { STORAGE_KEYS } from '../config/constants';
import { getItem, setItem, removeItem } from './storage';

// Create axios instance with credentials
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add access token to all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (API_CONFIG.IS_DEV) {
      console.log('📤 [API Request]', config.method?.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    if (API_CONFIG.IS_DEV) {
      console.log('✅ [API Response]', response.config.url, response.status);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      console.error('❌ [Response Error]', error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
    
    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    try {
      // Try to refresh token
      const refreshResponse = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
        {},
        { withCredentials: true }
      );
      
      if (refreshResponse.data?.data?.accessToken) {
        const newToken = refreshResponse.data.data.accessToken;
        await setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
        
        // Update authorization header
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        processQueue(null, newToken);
        
        return axiosInstance(originalRequest);
      }
    } catch (refreshError) {
      processQueue(refreshError, null);
      
      // Clear user data and redirect to login
      await removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await removeItem(STORAGE_KEYS.USER_DATA);
      
      // Emit logout event (AuthContext will handle navigation)
      // Note: In mobile, we'll handle this in AuthContext
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

