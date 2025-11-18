import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy danh sách task assignments theo contract
 * GET /task-assignments?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse với danh sách task assignments
 */
export const getTaskAssignmentsByContract = async contractId => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}?contractId=${contractId}`
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách task assignments',
      }
    );
  }
};

/**
 * Lấy danh sách task assignments theo milestone
 * GET /task-assignments/milestones/{milestoneId}?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} milestoneId - ID của milestone
 * @returns {Promise} ApiResponse với danh sách task assignments
 */
export const getTaskAssignmentsByMilestone = async (
  contractId,
  milestoneId
) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}/milestones/${milestoneId}?contractId=${contractId}`
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách task assignments',
      }
    );
  }
};

/**
 * Tạo task assignment mới
 * POST /task-assignments?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {Object} assignmentData - Thông tin task assignment
 * @param {string} assignmentData.specialistId - ID của specialist
 * @param {string} assignmentData.taskType - Loại task: transcription, arrangement, recording
 * @param {string} assignmentData.milestoneId - ID của milestone (optional)
 * @param {string} assignmentData.notes - Ghi chú (optional)
 * @returns {Promise} ApiResponse với task assignment đã tạo
 */
export const createTaskAssignment = async (contractId, assignmentData) => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}?contractId=${contractId}`,
      assignmentData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi tạo task assignment',
      }
    );
  }
};

/**
 * Cập nhật task assignment
 * PUT /task-assignments/{assignmentId}?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @param {Object} assignmentData - Thông tin cần cập nhật
 * @returns {Promise} ApiResponse với task assignment đã cập nhật
 */
export const updateTaskAssignment = async (
  contractId,
  assignmentId,
  assignmentData
) => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}/${assignmentId}?contractId=${contractId}`,
      assignmentData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi cập nhật task assignment',
      }
    );
  }
};

/**
 * Xóa task assignment
 * DELETE /task-assignments/{assignmentId}?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse
 */
export const deleteTaskAssignment = async (contractId, assignmentId) => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}/${assignmentId}?contractId=${contractId}`
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi xóa task assignment',
      }
    );
  }
};

/**
 * Lấy chi tiết task assignment
 * GET /task-assignments/{assignmentId}?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse với chi tiết task assignment
 */
export const getTaskAssignmentById = async (contractId, assignmentId) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}/${assignmentId}?contractId=${contractId}`
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy chi tiết task assignment',
      }
    );
  }
};

