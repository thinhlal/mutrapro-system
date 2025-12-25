import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get user statistics for admin dashboard
 * GET /admin/dashboard/users
 *
 * @returns {Promise} ApiResponse với AdminDashboardOverviewResponse (chỉ có userStats)
 */
export const getUserStatistics = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_DASHBOARD.USERS);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê users',
      }
    );
  }
};

/**
 * Get wallet statistics from billing-service
 * GET /admin/wallets/statistics
 *
 * @returns {Promise} ApiResponse với WalletStatisticsResponse
 */
export const getWalletStatistics = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_WALLET.GET_STATISTICS);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê ví',
      }
    );
  }
};

/**
 * Get request statistics
 * GET /admin/requests/statistics
 *
 * @returns {Promise} ApiResponse với RequestStatisticsResponse
 */
export const getRequestStatistics = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.SERVICE_REQUESTS.ADMIN_STATISTICS);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê requests',
      }
    );
  }
};
