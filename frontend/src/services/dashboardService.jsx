import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get all user dashboard statistics (statistics và statistics over time)
 * GET /admin/dashboard/users?days=30
 *
 * @param {number} days - Number of days to look back for statistics over time (default: 30)
 * @returns {Promise} ApiResponse với UserDashboardStatisticsResponse
 */
export const getUserStatistics = async (days = 30) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_DASHBOARD.USERS(days));
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
 * Get all wallet dashboard statistics (statistics, topup volume, và revenue statistics)
 * GET /admin/wallets/statistics?days=7
 *
 * @param {number} days - Number of days to look back for topup volume and revenue statistics (default: 7)
 * @returns {Promise} ApiResponse với WalletDashboardStatisticsResponse
 */
export const getWalletStatistics = async (days = 7) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_WALLET.GET_STATISTICS(days));
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
 * Get all request module statistics (requests và notation instruments)
 * GET /admin/requests/statistics
 *
 * @returns {Promise} ApiResponse với RequestModuleStatisticsResponse
 */
export const getRequestStatistics = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_REQUESTS.GET_ALL_STATISTICS);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê requests',
      }
    );
  }
};

/**
 * Get all project statistics (contracts, tasks, equipment, studio bookings, revision requests)
 * GET /admin/statistics
 *
 * @returns {Promise} ApiResponse với AllProjectStatisticsResponse
 */
export const getProjectStatistics = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_PROJECT.GET_ALL_STATISTICS);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê project',
      }
    );
  }
};

/**
 * Get latest service requests for dashboard
 * GET /requests/requests?page=0&size=10&sort=createdAt,desc
 *
 * @param {number} size - Number of requests to fetch (default: 10)
 * @returns {Promise} ApiResponse với PageResponse<ServiceRequestResponse>
 */
export const getLatestServiceRequests = async (size = 10) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.SERVICE_REQUESTS.GET_ALL}?page=0&size=${size}&sort=createdAt,desc`
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách service requests',
      }
    );
  }
};

/**
 * Get latest contracts for dashboard
 * GET /contracts/my-managed-contracts?page=0&size=10
 *
 * @param {number} size - Number of contracts to fetch (default: 10)
 * @returns {Promise} ApiResponse với PageResponse<ContractResponse>
 */
export const getLatestContracts = async (size = 10) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.CONTRACTS.MY_MANAGED_CONTRACTS}?page=0&size=${size}`
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách contracts',
      }
    );
  }
};

/**
 * Get all module statistics for dashboard (equipment, studio bookings, revision requests)
 * GET /admin/module-statistics
 *
 * @returns {Promise} ApiResponse với ModuleStatisticsResponse
 */
export const getAllModuleStatistics = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ADMIN_PROJECT.GET_ALL_MODULE_STATISTICS
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê module statistics',
      }
    );
  }
};

/**
 * Get all specialist module statistics for dashboard (specialists và skills)
 * GET /admin/specialists/statistics
 *
 * @returns {Promise} ApiResponse với SpecialistModuleStatisticsResponse
 */
export const getAllSpecialistModuleStatistics = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN_STATISTICS
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê specialist module statistics',
      }
    );
  }
};
