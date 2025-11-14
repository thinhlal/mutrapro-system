import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy hoặc tạo ví của user hiện tại
 * GET /wallets/me
 *
 * @returns {Promise} ApiResponse với thông tin ví
 */
export const getOrCreateMyWallet = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.WALLET.GET_OR_CREATE_MY_WALLET);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin ví' };
  }
};

/**
 * Lấy chi tiết ví theo ID
 * GET /wallets/{walletId}
 *
 * @param {string} walletId - ID của ví
 * @returns {Promise} ApiResponse với thông tin ví
 */
export const getWalletById = async walletId => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.WALLET.GET_BY_ID(walletId));
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin ví' };
  }
};

/**
 * Nạp tiền vào ví
 * POST /wallets/{walletId}/topup
 *
 * @param {string} walletId - ID của ví
 * @param {Object} topupData - Thông tin nạp tiền
 * @param {number} topupData.amount - Số tiền nạp (tối thiểu 1000 VND)
 * @param {string} topupData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @returns {Promise} ApiResponse với thông tin giao dịch
 */
export const topupWallet = async (walletId, topupData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.TOPUP(walletId),
      topupData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi nạp tiền vào ví' };
  }
};

/**
 * Trừ tiền từ ví
 * POST /wallets/{walletId}/debit
 *
 * @param {string} walletId - ID của ví
 * @param {Object} debitData - Thông tin trừ tiền
 * @param {number} debitData.amount - Số tiền trừ
 * @param {string} debitData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} debitData.paymentId - ID thanh toán (optional)
 * @param {string} debitData.contractId - ID hợp đồng (optional)
 * @param {string} debitData.installmentId - ID kỳ trả góp (optional)
 * @param {string} debitData.bookingId - ID đặt chỗ (optional)
 * @returns {Promise} ApiResponse với thông tin giao dịch
 */
export const debitWallet = async (walletId, debitData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.DEBIT(walletId),
      debitData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi trừ tiền từ ví' };
  }
};

/**
 * Lấy danh sách giao dịch của ví
 * GET /wallets/{walletId}/transactions
 *
 * @param {string} walletId - ID của ví
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.txType - Loại giao dịch: topup, payment, refund, withdrawal, adjustment
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
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.WALLET.GET_TRANSACTIONS(walletId)}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách giao dịch' };
  }
};

/**
 * Lấy danh sách giao dịch của ví hiện tại
 * GET /wallets/me/transactions
 *
 * @param {Object} filters - Các filter tùy chọn (tương tự getWalletTransactions)
 * @returns {Promise} ApiResponse với PageResponse chứa danh sách giao dịch
 */
export const getMyWalletTransactions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.txType) params.append('txType', filters.txType);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.WALLET.GET_MY_TRANSACTIONS}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách giao dịch' };
  }
};

