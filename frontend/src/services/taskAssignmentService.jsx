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

// ===== SPECIALIST TASK ASSIGNMENT FUNCTIONS =====

/**
 * Lấy danh sách task assignments của specialist hiện tại
 * GET /specialist/task-assignments
 *
 * @returns {Promise} ApiResponse với danh sách task assignments
 */
export const getMyTaskAssignments = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.TASK_ASSIGNMENTS.MY_TASKS
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
 * Specialist accept task (assigned → in_progress)
 * POST /specialist/task-assignments/{assignmentId}/accept
 *
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse với task assignment đã accept
 */
export const acceptTaskAssignment = async assignmentId => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.ACCEPT(assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi accept task assignment',
      }
    );
  }
};

/**
 * Specialist cancel task (assigned → cancelled)
 * POST /specialist/task-assignments/{assignmentId}/cancel
 *
 * @param {string} assignmentId - ID của task assignment
 * @param {string} reason - Lý do cancel (required)
 * @returns {Promise} ApiResponse với task assignment đã cancel
 */
export const cancelTaskAssignment = async (assignmentId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.CANCEL(assignmentId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi cancel task assignment',
      }
    );
  }
};

/**
 * Specialist request reassign task (in_progress → reassign_requested)
 * POST /specialist/task-assignments/{assignmentId}/request-reassign
 *
 * @param {string} assignmentId - ID của task assignment
 * @param {string} reason - Lý do request reassign (required)
 * @returns {Promise} ApiResponse với task assignment đã request reassign
 */
export const requestReassign = async (assignmentId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.REQUEST_REASSIGN(assignmentId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi request reassign task assignment',
      }
    );
  }
};

/**
 * Lấy chi tiết task assignment của specialist hiện tại
 * GET /specialist/task-assignments/{assignmentId}
 *
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse với chi tiết task assignment
 */
export const getMyTaskAssignmentById = async assignmentId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.TASK_ASSIGNMENTS.MY_TASK_DETAIL(assignmentId)
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

/**
 * Manager approve reassign request
 * POST /task-assignments/{assignmentId}/approve-reassign?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @param {string} reason - Lý do approve (required)
 * @returns {Promise} ApiResponse với task assignment đã approve
 */
export const approveReassign = async (contractId, assignmentId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.APPROVE_REASSIGN(contractId, assignmentId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi approve reassign request',
      }
    );
  }
};

/**
 * Manager reject reassign request
 * POST /task-assignments/{assignmentId}/reject-reassign?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @param {string} reason - Lý do reject (required)
 * @returns {Promise} ApiResponse với task assignment đã reject
 */
export const rejectReassign = async (contractId, assignmentId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.REJECT_REASSIGN(contractId, assignmentId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi reject reassign request',
      }
    );
  }
};

