// src/services/walletService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get or create current user's wallet
 * GET /wallets/me
 * 
 * @returns {Promise} ApiResponse with wallet data
 */
export const getOrCreateMyWallet = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.WALLET.GET_OR_CREATE_MY_WALLET);
    return response.data;
  } catch (error) {
    console.error('❌ [Get Wallet Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi lấy thông tin wallet',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Top up wallet
 * POST /wallets/{walletId}/topup
 * 
 * @param {string} walletId - ID của wallet
 * @param {Object} data - Top-up data
 * @param {number} data.amount - Số tiền nạp
 * @param {string} data.currency - Loại tiền tệ (VND, USD, etc.)
 * @returns {Promise} ApiResponse with updated wallet
 */
export const topupWallet = async (walletId, data) => {
  try {
    console.log('💰 [Topup] Calling API:', API_ENDPOINTS.WALLET.TOPUP(walletId));
    console.log('💰 [Topup] Data:', data);
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.TOPUP(walletId),
      data
    );
    console.log('✅ [Topup] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Topup Wallet Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi nạp tiền',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Get wallet transactions with filters
 * GET /wallets/me/transactions?txType=&fromDate=&toDate=&page=&size=&sort=
 * 
 * @param {Object} filters - Filter parameters
 * @param {string} filters.txType - Transaction type (topup, payment, refund, withdrawal, adjustment)
 * @param {string} filters.fromDate - Start date (ISO string)
 * @param {string} filters.toDate - End date (ISO string)
 * @param {number} filters.page - Page number (default: 0)
 * @param {number} filters.size - Page size (default: 20)
 * @param {string} filters.sort - Sort order (default: createdAt,desc)
 * @returns {Promise} ApiResponse with paginated transactions
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
    console.error('❌ [Get Transactions Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi lấy danh sách giao dịch',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

