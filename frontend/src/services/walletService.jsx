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
    const response = await axiosInstance.get(
      API_ENDPOINTS.WALLET.GET_OR_CREATE_MY_WALLET
    );
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
    const response = await axiosInstance.get(
      API_ENDPOINTS.WALLET.GET_BY_ID(walletId)
    );
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
 * Thanh toán DEPOSIT
 * POST /wallets/{walletId}/debit/deposit
 *
 * @param {string} walletId - ID của ví
 * @param {Object} depositData - Thông tin thanh toán DEPOSIT
 * @param {number} depositData.amount - Số tiền thanh toán
 * @param {string} depositData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} depositData.contractId - ID hợp đồng (bắt buộc)
 * @param {string} depositData.installmentId - ID installment DEPOSIT (bắt buộc)
 * @returns {Promise} ApiResponse với thông tin giao dịch
 */
export const payDeposit = async (walletId, depositData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.PAY_DEPOSIT(walletId),
      depositData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi thanh toán DEPOSIT' };
  }
};

/**
 * Thanh toán Milestone
 * POST /wallets/{walletId}/debit/milestone
 *
 * @param {string} walletId - ID của ví
 * @param {Object} milestoneData - Thông tin thanh toán Milestone
 * @param {number} milestoneData.amount - Số tiền thanh toán
 * @param {string} milestoneData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} milestoneData.contractId - ID hợp đồng (bắt buộc)
 * @param {string} milestoneData.milestoneId - ID milestone (bắt buộc)
 * @param {string} milestoneData.installmentId - ID installment (bắt buộc)
 * @param {number} milestoneData.orderIndex - Thứ tự milestone (1, 2, 3...) (optional)
 * @returns {Promise} ApiResponse với thông tin giao dịch
 */
export const payMilestone = async (walletId, milestoneData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.PAY_MILESTONE(walletId),
      milestoneData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi thanh toán Milestone' };
  }
};

/**
 * Thanh toán Revision Fee
 * POST /wallets/{walletId}/debit/revision-fee
 *
 * @param {string} walletId - ID của ví
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
 * @param {string} revisionFeeData.requestedByUserId - ID customer (optional)
 * @returns {Promise} ApiResponse với thông tin giao dịch
 */
export const payRevisionFee = async (walletId, revisionFeeData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WALLET.PAY_REVISION_FEE(walletId),
      revisionFeeData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi thanh toán Revision Fee' }
    );
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
    throw (
      error.response?.data || { message: 'Lỗi khi lấy danh sách giao dịch' }
    );
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
    throw (
      error.response?.data || { message: 'Lỗi khi lấy danh sách giao dịch' }
    );
  }
};
