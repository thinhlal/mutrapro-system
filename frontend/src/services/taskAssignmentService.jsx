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

/**
 * Lấy danh sách tất cả task assignments với pagination và filters
 * GET /task-assignments/all
 */
export const getAllTaskAssignments = async params => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}/all`,
      { params }
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
 * Lấy danh sách milestone assignment slots cho manager gán task
 * GET /task-assignments/slots
 */
export const getMilestoneAssignmentSlots = async params => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TASK_ASSIGNMENTS.BASE}/slots`,
      { params }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách milestone slots',
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
 * Specialist start task (READY_TO_START → IN_PROGRESS)
 * POST /specialist/task-assignments/{assignmentId}/start
 */
export const startTaskAssignment = async assignmentId => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.START(assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi bắt đầu task assignment',
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
 * Specialist báo issue (không kịp deadline, có vấn đề)
 * POST /specialist/task-assignments/{assignmentId}/report-issue
 *
 * @param {string} assignmentId - ID của task assignment
 * @param {string} reason - Lý do báo issue (required)
 * @returns {Promise} ApiResponse với task assignment đã được đánh dấu có issue
 */
export const reportIssue = async (assignmentId, reason) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.REPORT_ISSUE(assignmentId),
      { reason }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi báo issue',
      }
    );
  }
};


/**
 * Manager resolve issue (clear hasIssue flag - cho specialist tiếp tục)
 * POST /task-assignments/{assignmentId}/resolve-issue?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse với task assignment đã resolve issue
 */
export const resolveIssue = async (contractId, assignmentId) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.RESOLVE_ISSUE(contractId, assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi resolve issue',
      }
    );
  }
};

/**
 * Manager cancel task (có thể cancel task ở bất kỳ status nào, trừ completed)
 * POST /task-assignments/{assignmentId}/cancel?contractId={contractId}
 *
 * @param {string} contractId - ID của contract
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse với task assignment đã cancel
 */
export const cancelTaskByManager = async (contractId, assignmentId) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.CANCEL_BY_MANAGER(contractId, assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi cancel task',
      }
    );
  }
};

/**
 * Specialist submit files for review - Backend tự động tạo submission package, add files và submit
 * POST /specialist/task-assignments/{assignmentId}/submit-for-review
 *
 * @param {string} assignmentId - ID của task assignment
 * @param {string[]} fileIds - Danh sách file IDs được chọn để submit
 * @returns {Promise} ApiResponse với FileSubmissionResponse
 */
export const submitFilesForReview = async (assignmentId, fileIds) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TASK_ASSIGNMENTS.SUBMIT_FOR_REVIEW(assignmentId),
      { fileIds }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi submit files for review',
      }
    );
  }
};

/**
 * Lấy chi tiết task assignment của specialist hiện tại
 * GET /specialist/task-assignments/{assignmentId}https://www.nimo.tv/lives
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
