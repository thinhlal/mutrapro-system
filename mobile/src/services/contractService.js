// src/services/contractService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy danh sách contracts theo requestId
 * GET /contracts/by-request/{requestId}
 *
 * @param {string} requestId - ID của service request
 * @returns {Promise} ApiResponse với danh sách contracts
 */
export const getContractsByRequestId = async (requestId) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.CONTRACTS.BASE}/by-request/${requestId}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách contracts' };
  }
};

/**
 * Lấy chi tiết contract theo ID
 * GET /contracts/{contractId}
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse với chi tiết contract
 */
export const getContractById = async (contractId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.GET_BY_ID(contractId)
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Get Contract Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi lấy chi tiết contract',
      error: error.response?.statusText || 'Unknown error',
      status: error.response?.status
    };
  }
};

/**
 * Customer approve contract
 * POST /contracts/{contractId}/approve
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse với contract đã approve
 */
export const approveContract = async (contractId) => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.CONTRACTS.BASE}/${contractId}/approve`
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Approve Contract Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi approve contract',
      error: error.response?.statusText || 'Unknown error'
    };
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
      `${API_ENDPOINTS.CONTRACTS.BASE}/${contractId}/request-change`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi yêu cầu chỉnh sửa contract' };
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
      `${API_ENDPOINTS.CONTRACTS.BASE}/${contractId}/cancel`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi hủy contract' };
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
      `${API_ENDPOINTS.CONTRACTS.BASE}/${contractId}/init-esign`,
      { signatureBase64 }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi khởi tạo chữ ký điện tử' };
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
      `${API_ENDPOINTS.CONTRACTS.BASE}/${contractId}/verify-otp`,
      { sessionId, otpCode }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xác thực OTP' };
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
    const response = await axiosInstance.get(API_ENDPOINTS.CONTRACTS.MY_CONTRACTS);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách contracts' };
  }
};

/**
 * Lấy tất cả contracts (cho customer - tương đương my-contracts)
 * GET /contracts/my-contracts
 * 
 * Note: getAllContracts và getMyContracts có thể dùng chung endpoint
 * 
 * @returns {Promise} ApiResponse với danh sách contracts
 */
export const getAllContracts = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.CONTRACTS.MY_CONTRACTS);
    return response.data;
  } catch (error) {
    console.error('❌ [Get All Contracts Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi lấy danh sách contracts',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

