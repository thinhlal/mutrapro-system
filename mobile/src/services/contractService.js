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
    throw error.response?.data || { message: 'Error when loading contracts list' };
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
      message: error.message || 'Error when getting contract details',
      error: error.response?.statusText || 'Unknown error',
      status: error.response?.status
    };
  }
};

/**
 * Lấy chi tiết milestone theo ID
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
    console.error('❌ [Get Milestone Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Error when getting milestone details',
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
      message: error.message || 'Error when approving contract',
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
    throw error.response?.data || { message: 'Error when requesting contract change' };
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
    throw error.response?.data || { message: 'Error when canceling contract' };
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
    throw error.response?.data || { message: 'Error when initializing e-signature' };
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
    throw error.response?.data || { message: 'Error when verifying OTP' };
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
    throw error.response?.data || { message: 'Error when loading contracts list' };
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
      message: error.message || 'Error when loading contracts list',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Export contract as PDF
 * GET /contracts/{contractId}/export-pdf
 * 
 * @param {string} contractId - ID của contract
 * @returns {Promise} Blob response với PDF file
 */
export const exportContractPdf = async (contractId) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.CONTRACTS.BASE}/${contractId}/export-pdf`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Export Contract PDF Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Error when exporting PDF contract',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Get contract signature image as base64 (proxy from S3 to avoid CORS)
 * GET /contracts/{contractId}/signature-image
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse with base64 image data URL
 */
export const getSignatureImage = async (contractId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.SIGNATURE_IMAGE(contractId)
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Get Signature Image Error]', error.response?.data || error.message);
    throw error.response?.data || { message: 'Error when getting signature image' };
  }
};

