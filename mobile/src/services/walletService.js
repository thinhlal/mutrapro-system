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
 * Pay deposit installment
 * POST /wallets/{walletId}/debit/deposit
 * 
 * @param {string} walletId - ID của wallet
 * @param {Object} depositData - Thông tin thanh toán DEPOSIT
 * @param {number} depositData.amount - Số tiền thanh toán
 * @param {string} depositData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} depositData.contractId - ID hợp đồng (bắt buộc)
 * @param {string} depositData.installmentId - ID installment DEPOSIT (bắt buộc)
 * @returns {Promise} ApiResponse with transaction data
 */
export const payDeposit = async (walletId, depositData) => {
  try {
    console.log('💳 [Pay Deposit] Calling API:', API_ENDPOINTS.WALLET.PAY_DEPOSIT(walletId));
    console.log('💳 [Pay Deposit] Data:', depositData);
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.PAY_DEPOSIT(walletId),
      depositData
    );
    console.log('✅ [Pay Deposit] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Pay Deposit Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi thanh toán DEPOSIT',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Pay milestone installment
 * POST /wallets/{walletId}/debit/milestone
 * 
 * @param {string} walletId - ID của wallet
 * @param {Object} milestoneData - Thông tin thanh toán Milestone
 * @param {number} milestoneData.amount - Số tiền thanh toán
 * @param {string} milestoneData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} milestoneData.contractId - ID hợp đồng (bắt buộc)
 * @param {string} milestoneData.milestoneId - ID milestone (bắt buộc)
 * @param {string} milestoneData.installmentId - ID installment (bắt buộc)
 * @param {number} milestoneData.orderIndex - Thứ tự milestone (1, 2, 3...) (optional)
 * @returns {Promise} ApiResponse with transaction data
 */
export const payMilestone = async (walletId, milestoneData) => {
  try {
    console.log('💳 [Pay Milestone] Calling API:', API_ENDPOINTS.WALLET.PAY_MILESTONE(walletId));
    console.log('💳 [Pay Milestone] Data:', milestoneData);
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.PAY_MILESTONE(walletId),
      milestoneData
    );
    console.log('✅ [Pay Milestone] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Pay Milestone Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi thanh toán Milestone',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Pay revision fee
 * POST /wallets/{walletId}/debit/revision-fee
 * 
 * @param {string} walletId - ID của wallet
 * @param {Object} revisionFeeData - Thông tin thanh toán Revision Fee
 * @param {number} revisionFeeData.amount - Số tiền thanh toán
 * @param {string} revisionFeeData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} revisionFeeData.contractId - ID hợp đồng (bắt buộc)
 * @param {string} revisionFeeData.milestoneId - ID milestone (optional)
 * @param {string} revisionFeeData.taskAssignmentId - ID task assignment (bắt buộc)
 * @param {string} revisionFeeData.submissionId - ID submission gốc (optional)
 * @param {number} revisionFeeData.revisionRound - Lần revision (optional)
 * @param {string} revisionFeeData.title - Tiêu đề revision request (optional)
 * @param {string} revisionFeeData.description - Mô tả revision request (optional)
 * @returns {Promise} ApiResponse with transaction data
 */
export const payRevisionFee = async (walletId, revisionFeeData) => {
  try {
    console.log('💳 [Pay Revision Fee] Calling API:', API_ENDPOINTS.WALLET.PAY_REVISION_FEE(walletId));
    console.log('💳 [Pay Revision Fee] Data:', revisionFeeData);
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.PAY_REVISION_FEE(walletId),
      revisionFeeData
    );
    console.log('✅ [Pay Revision Fee] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Pay Revision Fee Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi thanh toán Revision Fee',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Withdraw money from wallet
 * POST /wallets/{walletId}/withdraw
 * 
 * @param {string} walletId - ID của wallet
 * @param {Object} withdrawData - Thông tin rút tiền
 * @param {number} withdrawData.amount - Số tiền rút (tối thiểu 10,000 VND)
 * @param {string} withdrawData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} withdrawData.bankAccountNumber - Số tài khoản ngân hàng (bắt buộc)
 * @param {string} withdrawData.bankName - Tên ngân hàng (bắt buộc)
 * @param {string} withdrawData.accountHolderName - Tên chủ tài khoản (bắt buộc)
 * @param {string} withdrawData.note - Ghi chú (optional)
 * @returns {Promise} ApiResponse với thông tin giao dịch
 */
export const withdrawWallet = async (walletId, withdrawData) => {
  try {
    console.log('💸 [Withdraw] Calling API:', API_ENDPOINTS.WALLET.WITHDRAW(walletId));
    console.log('💸 [Withdraw] Data:', withdrawData);
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.WITHDRAW(walletId),
      withdrawData
    );
    console.log('✅ [Withdraw] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Withdraw Wallet Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi rút tiền từ ví',
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

/**
 * Get withdrawal requests of current user
 * GET /wallets/me/withdrawal-requests
 * 
 * @param {Object} filters - Filter parameters
 * @param {string} filters.status - Filter theo status: PENDING_REVIEW, APPROVED, PROCESSING, COMPLETED, REJECTED, FAILED
 * @param {number} filters.page - Page number (default: 0)
 * @param {number} filters.size - Page size (default: 20)
 * @param {string} filters.sort - Sort order (default: createdAt,desc)
 * @returns {Promise} ApiResponse với PageResponse chứa danh sách withdrawal requests
 */
export const getMyWithdrawalRequests = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.WALLET.GET_MY_WITHDRAWAL_REQUESTS}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('❌ [Get Withdrawal Requests Error]', error.response?.data || error.message);
    throw error.response?.data || {
      message: error.message || 'Lỗi khi lấy danh sách withdrawal requests',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

