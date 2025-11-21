import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

// Create axios instance for public endpoints (no authentication required)
const axiosInstancePublic = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstancePublic.interceptors.request.use(
  (config) => {
    if (API_CONFIG.IS_DEV) {
      console.log('📤 [Public API Request]', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('❌ [Public Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstancePublic.interceptors.response.use(
  (response) => {
    if (API_CONFIG.IS_DEV) {
      console.log('✅ [Public API Response]', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    console.error('❌ [Public Response Error]', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default axiosInstancePublic;

