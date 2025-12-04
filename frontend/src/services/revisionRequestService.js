import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Get all revision requests by task assignment ID
 * GET /revision-requests/by-assignment/{assignmentId}
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} Response từ API
 */
export const getRevisionRequestsByAssignment = async assignmentId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVISION_REQUESTS.BY_ASSIGNMENT(assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách revision requests',
      }
    );
  }
};

/**
 * Manager review revision request (approve/reject)
 * POST /revision-requests/{revisionRequestId}/review
 * @param {string} revisionRequestId - ID của revision request
 * @param {string} action - "approve" hoặc "reject"
 * @param {string} managerNote - Ghi chú của manager (optional)
 * @returns {Promise} Response từ API
 */
export const reviewRevisionRequest = async (
  revisionRequestId,
  action,
  managerNote = ''
) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.REVISION_REQUESTS.REVIEW(revisionRequestId),
      {
        action,
        managerNote,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi review revision request',
      }
    );
  }
};

/**
 * Get all revision requests for current manager (with optional status filter)
 * GET /revision-requests/manager/my-requests?status={status}
 * @param {string} status - Optional status filter (e.g., 'PENDING_MANAGER_REVIEW', 'IN_REVISION')
 * @returns {Promise} Response từ API
 */
export const getMyRevisionRequests = async (status = null) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVISION_REQUESTS.GET_MY_REQUESTS(status)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách revision requests',
      }
    );
  }
};

/**
 * Get revision statistics for a contract (free/paid revisions used)
 * GET /revision-requests/contract/{contractId}/stats
 * @param {string} contractId - ID của contract
 * @returns {Promise} Response từ API
 */
export const getContractRevisionStats = async contractId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVISION_REQUESTS.GET_CONTRACT_STATS(contractId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thống kê revision',
      }
    );
  }
};
