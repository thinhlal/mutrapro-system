import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy thông tin submission (specialist hoặc manager)
 * GET /submissions/{submissionId}
 * @param {string} submissionId - ID của submission
 * @returns {Promise} Response từ API
 */
export const getSubmission = async submissionId => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.SUBMISSIONS.GET(submissionId));
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy thông tin submission',
      }
    );
  }
};

/**
 * Lấy danh sách submissions theo assignmentId
 * GET /submissions/by-assignment/{assignmentId}
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} Response từ API
 */
export const getSubmissionsByAssignmentId = async assignmentId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SUBMISSIONS.GET_BY_ASSIGNMENT(assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách submissions',
      }
    );
  }
};

/**
 * Manager review submission (approve/reject)
 * POST /submissions/{submissionId}/review
 * @param {string} submissionId - ID của submission
 * @param {string} action - "approve" hoặc "reject"
 * @param {string} reason - Lý do reject (required nếu action = "reject")
 * @returns {Promise} Response từ API
 */
export const reviewSubmission = async (submissionId, action, reason = '') => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.SUBMISSIONS.REVIEW(submissionId), {
      action,
      reason,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi review submission',
      }
    );
  }
};

