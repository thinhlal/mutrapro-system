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
 * Get request statistics over time (by date and status) for Pipeline Flow chart
 * GET /admin/requests/statistics/over-time?days=7
 *
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise} ApiResponse với RequestStatisticsByDateResponse
 */
export const getRequestStatisticsOverTime = async (days = 7) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_REQUESTS.GET_STATISTICS_OVER_TIME(days));
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê requests theo thời gian',
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
 * Get workload distribution (open tasks count by specialist) for Manager Dashboard
 * GET /admin/statistics/workload-distribution
 *
 * @returns {Promise} ApiResponse với WorkloadDistributionResponse
 */
export const getWorkloadDistribution = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_PROJECT.GET_WORKLOAD_DISTRIBUTION);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy phân bố workload',
      }
    );
  }
};

/**
 * Get on-time completion rate over time for Manager Dashboard
 * GET /admin/statistics/completion-rate?days=7
 *
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise} ApiResponse với CompletionRateResponse
 */
export const getCompletionRateOverTime = async (days = 7) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.ADMIN_PROJECT.GET_COMPLETION_RATE(days));
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy tỷ lệ hoàn thành đúng hạn',
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
        message: 'Error when loading contracts list',
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
        message: 'Error when loading module statistics',
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
        message: 'Error when loading specialist module statistics',
      }
    );
  }
};
