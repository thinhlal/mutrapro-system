import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Tạo contract từ service request
 * POST /contracts/from-request/{requestId}
 *
 * @param {string} requestId - ID của service request
 * @param {Object} contractData - Thông tin contract
 * @param {string} contractData.contractType - Loại contract: transcription, arrangement, recording, bundle
 * @param {number} contractData.totalPrice - Tổng giá
 * @param {string} contractData.currency - Loại tiền: VND, USD, EUR
 * @param {number} contractData.depositPercent - Phần trăm đặt cọc (mặc định 40)
 * @param {number} contractData.slaDays - Số ngày SLA
 * @param {string} contractData.expectedStartDate - Ngày bắt đầu dự kiến (ISO string)
 * @param {string} contractData.termsAndConditions - Điều khoản và điều kiện
 * @param {string} contractData.specialClauses - Điều khoản đặc biệt
 * @param {string} contractData.notes - Ghi chú
 * @param {number} contractData.freeRevisionsIncluded - Số lần revision miễn phí (mặc định 1)
 * @param {number} contractData.additionalRevisionFeeVnd - Phí revision thêm (VND)
 * @param {number} contractData.revisionDeadlineDays - Số ngày sau khi giao hàng để revision miễn phí (mặc định 30/45/60 theo contract type)
 * @returns {Promise} ApiResponse với contract đã tạo
 */
export const createContractFromRequest = async (requestId, contractData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.CREATE_FROM_REQUEST(requestId),
      contractData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo contract' };
  }
};

/**
 * Lấy chi tiết contract theo ID
 * GET /contracts/{contractId}
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse với chi tiết contract
 */
export const getContractById = async contractId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.GET_BY_ID(contractId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy chi tiết contract' };
  }
};

/**
 * Quote số tiền cần thanh toán cho milestone (bao gồm late discount nếu trễ)
 * GET /contracts/{contractId}/milestones/{milestoneId}/payment-quote
 */
export const getMilestonePaymentQuote = async (contractId, milestoneId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.GET_MILESTONE_PAYMENT_QUOTE(
        contractId,
        milestoneId
      )
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thông tin quote thanh toán milestone',
      }
    );
  }
};

/**
 * Cập nhật contract (chỉ cho DRAFT contracts)
 * PUT /contracts/{contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {Object} contractData - Thông tin contract cần update (tương tự createContractFromRequest)
 * @returns {Promise} ApiResponse với contract đã update
 */
export const updateContract = async (contractId, contractData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.CONTRACTS.UPDATE(contractId),
      contractData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when updating contract' };
  }
};

/**
 * Lấy danh sách contracts theo requestId
 * GET /contracts/by-request/{requestId}
 *
 * @param {string} requestId - ID của service request
 * @returns {Promise} ApiResponse với danh sách contracts
 */
export const getContractsByRequestId = async requestId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.GET_BY_REQUEST_ID(requestId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when loading contracts list' }
    );
  }
};

/**
 * Lấy danh sách contracts của user hiện tại
 * GET /contracts/my-contracts
 *
 * @returns {Promise} ApiResponse với danh sách contracts
 */
export const getMyContracts = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.MY_CONTRACTS
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when loading contracts list' }
    );
  }
};

/**
 * Lấy danh sách contracts được quản lý bởi manager hiện tại
 * GET /contracts/my-managed-contracts
 *
 * @returns {Promise} ApiResponse với danh sách contracts
 */
export const getMyManagedContracts = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.MY_MANAGED_CONTRACTS
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when loading contracts list' }
    );
  }
};

/**
 * Lấy tất cả contracts (dùng endpoint my-managed-contracts cho manager/admin) với pagination
 * GET /contracts/my-managed-contracts
 *
 * @param {Object} filters - Filter parameters
 * @param {string} filters.search - Search by contract number or customer name
 * @param {string} filters.contractType - Filter by contract type
 * @param {string} filters.status - Filter by status
 * @param {string} filters.currency - Filter by currency
 * @param {number} filters.page - Page number (0-indexed, default: 0)
 * @param {number} filters.size - Page size (default: 10)
 * @returns {Promise} ApiResponse với PageResponse chứa danh sách contracts
 */
export const getAllContracts = async (filters = {}) => {
  try {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.contractType) params.contractType = filters.contractType;
    if (filters.status) params.status = filters.status;
    if (filters.currency) params.currency = filters.currency;
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.size !== undefined) params.size = filters.size;

    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.MY_MANAGED_CONTRACTS,
      { params }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when loading contracts list' }
    );
  }
};

/**
 * Manager gửi contract cho customer
 * POST /contracts/{contractId}/send
 *
 * @param {string} contractId - ID của contract
 * @param {number} expiresInDays - Số ngày hết hạn (mặc định 7 ngày)
 * @returns {Promise} ApiResponse với contract đã gửi
 */
export const sendContractToCustomer = async (contractId, expiresInDays = 7) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.SEND(contractId),
      null,
      { params: { expiresInDays } }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when sending contract to customer' }
    );
  }
};

/**
 * Customer approve contract
 * POST /contracts/{contractId}/approve
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse với contract đã approve
 */
export const approveContract = async contractId => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.APPROVE(contractId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when approving contract' };
  }
};

/**
 * Manager start contract work (sau khi đã assign xong)
 * POST /contracts/{contractId}/start-work
 *
 * @param {string} contractId
 * @param {{startAt?: string}} payload - Optional custom start time (ISO string)
 */
export const startContractWork = async (contractId, payload) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.START_WORK(contractId),
      payload || null
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when starting contract work' }
    );
  }
};

/**
 * Initialize E-signature process - send signature and get OTP
 * POST /contracts/{contractId}/init-esign
 *
 * @param {string} contractId - ID của contract
 * @param {string} signatureBase64 - Base64 encoded signature image
 * @returns {Promise} ApiResponse with session info
 */
export const initESign = async (contractId, signatureBase64) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.INIT_ESIGN(contractId),
      { signatureBase64 }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when initializing e-signature' }
    );
  }
};

/**
 * Verify OTP and complete E-signature
 * POST /contracts/{contractId}/verify-otp
 *
 * @param {string} contractId - ID của contract
 * @param {string} sessionId - Session ID from init-esign
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise} ApiResponse with signed contract
 */
export const verifyOTPAndSign = async (contractId, sessionId, otpCode) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.VERIFY_OTP(contractId),
      { sessionId, otpCode }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when verifying OTP' };
  }
};

/**
 * Customer request change contract
 * POST /contracts/{contractId}/request-change
 *
 * @param {string} contractId - ID của contract
 * @param {string} reason - Lý do yêu cầu chỉnh sửa
 * @returns {Promise} ApiResponse với contract đã request change
 */
export const requestChangeContract = async (contractId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.REQUEST_CHANGE(contractId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Error when requesting contract change' }
    );
  }
};

/**
 * Customer cancel contract
 * POST /contracts/{contractId}/cancel
 *
 * @param {string} contractId - ID của contract
 * @param {string} reason - Lý do hủy contract
 * @returns {Promise} ApiResponse với contract đã hủy
 */
export const cancelContract = async (contractId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.CANCEL(contractId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when canceling contract' };
  }
};

/**
 * Cancel contract by manager
 * POST /contracts/{contractId}/cancel-by-manager
 *
 * @param {string} contractId - ID của contract
 * @param {string} reason - Lý do hủy contract
 * @returns {Promise} ApiResponse với contract đã hủy
 */
export const cancelContractByManager = async (contractId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.CANCEL_BY_MANAGER(contractId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when canceling contract by manager' };
  }
};

/**
 * Get contract signature image as base64 (proxy from S3 to avoid CORS)
 * GET /contracts/{contractId}/signature-image
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse with base64 image data URL
 */
export const getSignatureImage = async contractId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.SIGNATURE_IMAGE(contractId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when getting signature image' };
  }
};

/**
 * Upload signed contract PDF file
 * POST /contracts/{contractId}/upload-pdf
 *
 * @param {string} contractId - ID của contract
 * @param {Blob} pdfBlob - PDF file blob
 * @param {string} fileName - PDF file name
 * @returns {Promise} ApiResponse with file ID
 */
export const uploadContractPdf = async (contractId, pdfBlob, fileName) => {
  try {
    // FormData dùng để gửi multipart/form-data (bắt buộc khi upload file)
    const formData = new FormData();
    formData.append('file', pdfBlob, fileName);

    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.UPLOAD_PDF(contractId),
      formData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when uploading PDF contract' };
  }
};

/**
 * Lấy chi tiết milestone theo contractId và milestoneId
 * GET /contracts/{contractId}/milestones/{milestoneId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} milestoneId - ID của milestone
 * @returns {Promise} ApiResponse với chi tiết milestone
 */
export const getMilestoneById = async (contractId, milestoneId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.GET_MILESTONE_BY_ID(contractId, milestoneId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error when getting milestone details' };
  }
};
