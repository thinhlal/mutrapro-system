import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy tất cả wallets (Admin only)
 * GET /admin/wallets
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.userId - Filter theo userId
 * @param {number} filters.page - Trang (default: 0)
 * @param {number} filters.size - Số lượng (default: 20)
 * @param {string} filters.sort - Sắp xếp (default: createdAt,desc)
 * @returns {Promise} ApiResponse với PageResponse chứa danh sách wallets
 */
export const getAllWallets = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.WALLET.ADMIN_GET_ALL}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách wallets' };
  }
};

/**
 * Lấy chi tiết wallet theo ID (Admin only)
 * GET /admin/wallets/{walletId}
 *
 * @param {string} walletId - ID của ví
 * @returns {Promise} ApiResponse với thông tin ví
 */
export const getWalletById = async walletId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.WALLET.ADMIN_GET_BY_ID(walletId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin ví' };
  }
};

/**
 * Lấy danh sách giao dịch của wallet (Admin only)
 * GET /admin/wallets/{walletId}/transactions
 *
 * @param {string} walletId - ID của ví
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.txType - Loại giao dịch: topup, payment, refund, withdrawal, adjustment
 * @param {string} filters.search - Tìm kiếm theo Transaction ID, Contract ID, Installment ID, Booking ID
 * @param {string} filters.fromDate - Ngày bắt đầu (ISO format)
 * @param {string} filters.toDate - Ngày kết thúc (ISO format)
 * @param {number} filters.page - Trang (default: 0)
 * @param {number} filters.size - Số lượng (default: 20)
 * @param {string} filters.sort - Sắp xếp (default: createdAt,desc)
 * @returns {Promise} ApiResponse với PageResponse chứa danh sách giao dịch
 */
export const getWalletTransactions = async (walletId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.txType) params.append('txType', filters.txType);
    if (filters.search) params.append('search', filters.search);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.WALLET.ADMIN_GET_TRANSACTIONS(walletId)}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách giao dịch' };
  }
};

