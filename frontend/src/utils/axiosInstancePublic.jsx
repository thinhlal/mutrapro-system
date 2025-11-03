// src/utils/axiosInstancePublic.jsx
import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

const axiosInstancePublic = axios.create({
  baseURL: API_CONFIG.BASE_URL, // 'http://localhost:8080'
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies (for refresh token)
});

export default axiosInstancePublic;
