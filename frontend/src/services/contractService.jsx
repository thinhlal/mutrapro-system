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
 * @param {boolean} contractData.autoDueDate - Tự động tính due date
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
    throw error.response?.data || { message: 'Lỗi khi cập nhật contract' };
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
      error.response?.data || { message: 'Lỗi khi lấy danh sách contracts' }
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
      error.response?.data || { message: 'Lỗi khi lấy danh sách contracts' }
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
      error.response?.data || { message: 'Lỗi khi lấy danh sách contracts' }
    );
  }
};

/**
 * Lấy tất cả contracts (dùng endpoint my-managed-contracts cho manager/admin)
 * GET /contracts/my-managed-contracts
 *
 * @returns {Promise} ApiResponse với danh sách contracts
 */
export const getAllContracts = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CONTRACTS.MY_MANAGED_CONTRACTS
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy danh sách contracts' }
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
      error.response?.data || { message: 'Lỗi khi gửi contract cho customer' }
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
    throw error.response?.data || { message: 'Lỗi khi approve contract' };
  }
};

export const signContract = async contractId => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONTRACTS.SIGN(contractId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi ký contract' };
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
      error.response?.data || { message: 'Lỗi khi yêu cầu chỉnh sửa contract' }
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
    throw error.response?.data || { message: 'Lỗi khi hủy contract' };
  }
};
