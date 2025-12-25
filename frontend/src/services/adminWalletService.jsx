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

    const url = `${API_ENDPOINTS.ADMIN_WALLET.GET_ALL}${params.toString() ? `?${params.toString()}` : ''}`;
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
      API_ENDPOINTS.ADMIN_WALLET.GET_BY_ID(walletId)
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
 * @param {string} filters.search - Tìm kiếm theo Transaction ID, Contract ID, Milestone ID, Booking ID
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

    const url = `${API_ENDPOINTS.ADMIN_WALLET.GET_TRANSACTIONS(walletId)}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy danh sách giao dịch' }
    );
  }
};

/**
 * Lấy danh sách withdrawal requests (Admin/Manager only)
 * GET /admin/wallets/withdrawal-requests
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.status - Filter theo status: PENDING_REVIEW, APPROVED, PROCESSING, COMPLETED, REJECTED, FAILED
 * @param {number} filters.page - Trang (default: 0)
 * @param {number} filters.size - Số lượng (default: 20)
 * @returns {Promise} ApiResponse với PageResponse chứa danh sách withdrawal requests
 */
export const getWithdrawalRequests = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);

    const url = `${API_ENDPOINTS.ADMIN_WALLET.GET_WITHDRAWAL_REQUESTS}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách withdrawal requests',
      }
    );
  }
};

/**
 * Duyệt withdrawal request (Admin/Manager only)
 * POST /admin/wallets/withdrawal-requests/{id}/approve
 *
 * @param {string} withdrawalRequestId - ID của withdrawal request
 * @param {string} adminNote - Ghi chú của admin (optional)
 * @returns {Promise} ApiResponse với WithdrawalRequestResponse
 */
export const approveWithdrawal = async (
  withdrawalRequestId,
  adminNote = null
) => {
  try {
    const params = new URLSearchParams();
    if (adminNote) params.append('adminNote', adminNote);

    const url = `${API_ENDPOINTS.ADMIN_WALLET.APPROVE_WITHDRAWAL(withdrawalRequestId)}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axiosInstance.post(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi duyệt withdrawal request' }
    );
  }
};

/**
 * Từ chối withdrawal request (Admin/Manager only)
 * POST /admin/wallets/withdrawal-requests/{id}/reject
 *
 * @param {string} withdrawalRequestId - ID của withdrawal request
 * @param {string} rejectionReason - Lý do từ chối (required)
 * @param {string} adminNote - Ghi chú của admin (optional)
 * @returns {Promise} ApiResponse với WithdrawalRequestResponse
 */
export const rejectWithdrawal = async (
  withdrawalRequestId,
  rejectionReason,
  adminNote = null
) => {
  try {
    const params = new URLSearchParams();
    params.append('rejectionReason', rejectionReason);
    if (adminNote) params.append('adminNote', adminNote);

    const url = `${API_ENDPOINTS.ADMIN_WALLET.REJECT_WITHDRAWAL(withdrawalRequestId)}?${params.toString()}`;
    const response = await axiosInstance.post(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi từ chối withdrawal request' }
    );
  }
};

/**
 * Hoàn thành chuyển tiền (Admin/Manager only)
 * POST /admin/wallets/withdrawal-requests/{id}/complete
 *
 * @param {string} withdrawalRequestId - ID của withdrawal request
 * @param {Object} data - Thông tin chuyển tiền
 * @param {number} data.paidAmount - Số tiền thực tế đã chuyển (optional)
 * @param {string} data.provider - Nhà cung cấp dịch vụ chuyển tiền (optional)
 * @param {string} data.bankRef - Mã tham chiếu từ ngân hàng (optional)
 * @param {string} data.txnCode - Mã giao dịch từ provider (optional)
 * @param {File} data.proofFile - File ảnh/biên lai chuyển tiền (optional)
 * @returns {Promise} ApiResponse với WalletTransactionResponse
 */
export const completeWithdrawal = async (withdrawalRequestId, data = {}) => {
  try {
    const formData = new FormData();
    if (data.paidAmount !== undefined)
      formData.append('paidAmount', data.paidAmount);
    if (data.provider) formData.append('provider', data.provider);
    if (data.bankRef) formData.append('bankRef', data.bankRef);
    if (data.txnCode) formData.append('txnCode', data.txnCode);
    if (data.proofFile) {
      // Ensure we're sending the actual File object
      const fileToSend = data.proofFile.originFileObj || data.proofFile;
      formData.append('proofFile', fileToSend);
    } else {
      console.log('No proof file provided');
    }

    const response = await axiosInstance.post(
      API_ENDPOINTS.ADMIN_WALLET.COMPLETE_WITHDRAWAL(withdrawalRequestId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi hoàn thành withdrawal' };
  }
};

/**
 * Đánh dấu chuyển tiền thất bại (Admin/Manager only)
 * POST /admin/wallets/withdrawal-requests/{id}/fail
 *
 * @param {string} withdrawalRequestId - ID của withdrawal request
 * @param {string} failureReason - Lý do thất bại (required)
 * @returns {Promise} ApiResponse với WithdrawalRequestResponse
 */
export const failWithdrawal = async (withdrawalRequestId, failureReason) => {
  try {
    const params = new URLSearchParams();
    params.append('failureReason', failureReason);

    const url = `${API_ENDPOINTS.ADMIN_WALLET.FAIL_WITHDRAWAL(withdrawalRequestId)}?${params.toString()}`;
    const response = await axiosInstance.post(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi đánh dấu withdrawal thất bại',
      }
    );
  }
};

/**
 * Download proof file của withdrawal request (Admin/Manager only)
 * GET /admin/wallets/withdrawal-requests/{id}/proof
 *
 * @param {string} withdrawalRequestId - ID của withdrawal request
 * @returns {Promise} Blob của file ảnh
 */
export const downloadProofFile = async withdrawalRequestId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ADMIN_WALLET.DOWNLOAD_PROOF(withdrawalRequestId),
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tải proof file' };
  }
};

/**
 * Điều chỉnh số dư ví (Admin only)
 * POST /admin/wallets/{walletId}/adjust
 *
 * @param {string} walletId - ID của ví
 * @param {Object} data - Thông tin điều chỉnh
 * @param {number} data.amount - Số tiền điều chỉnh (dương = thêm, âm = trừ)
 * @param {string} data.reason - Lý do điều chỉnh (required)
 * @returns {Promise} ApiResponse với WalletTransactionResponse
 */
export const adjustWalletBalance = async (walletId, data) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ADMIN_WALLET.ADJUST_BALANCE(walletId),
      data
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi điều chỉnh số dư ví' };
  }
};
