// src/services/fileSubmissionService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy danh sách delivered submissions theo milestoneId (cho customer)
 * GET /submissions/by-milestone/{milestoneId}?contractId={contractId}
 * 
 * @param {string} milestoneId - ID của milestone
 * @param {string} contractId - ID của contract
 * @returns {Promise} ApiResponse với thông tin contract, milestone, submissions và revision requests
 */
export const getDeliveredSubmissionsByMilestone = async (milestoneId, contractId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SUBMISSIONS.GET_DELIVERED_BY_MILESTONE(milestoneId, contractId)
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Get Deliveries Error]', error.response?.data || error.message);
    throw error.response?.data || {
      message: error.message || 'Error getting delivered submissions list',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Customer review submission (accept hoặc request revision)
 * POST /submissions/{submissionId}/customer-review
 * 
 * @param {string} submissionId - ID của submission
 * @param {string} action - "accept" hoặc "request_revision"
 * @param {string} title - Tiêu đề yêu cầu revision (required nếu action = "request_revision")
 * @param {string} description - Mô tả chi tiết yêu cầu revision (required nếu action = "request_revision")
 * @returns {Promise} ApiResponse
 */
export const customerReviewSubmission = async (
  submissionId,
  action,
  title = '',
  description = ''
) => {
  try {
    console.log('📝 [Customer Review] Calling API:', API_ENDPOINTS.SUBMISSIONS.CUSTOMER_REVIEW(submissionId));
    console.log('📝 [Customer Review] Data:', { action, title, description });
    const response = await axiosInstance.post(
      API_ENDPOINTS.SUBMISSIONS.CUSTOMER_REVIEW(submissionId),
      {
        action,
        title,
        description,
      }
    );
    console.log('✅ [Customer Review] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Customer Review Error]', error.response?.data || error.message);
    throw error.response?.data || {
      message: error.message || 'Error reviewing submission',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

/**
 * Lấy thông tin submission
 * GET /submissions/{submissionId}
 * 
 * @param {string} submissionId - ID của submission
 * @returns {Promise} ApiResponse với thông tin submission
 */
export const getSubmission = async (submissionId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SUBMISSIONS.GET(submissionId)
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Get Submission Error]', error.response?.data || error.message);
    throw error.response?.data || {
      message: error.message || 'Error getting submission information',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

