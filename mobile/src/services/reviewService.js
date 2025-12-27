// src/services/reviewService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Tạo review cho task assignment
 * POST /reviews/assignments/{assignmentId}
 *
 * @param {string} assignmentId - ID của task assignment
 * @param {Object} reviewData - Thông tin review
 * @param {number} reviewData.rating - Rating từ 1-5
 * @param {string} reviewData.comment - Comment (optional)
 * @returns {Promise} ApiResponse với review đã tạo
 */
export const createTaskReview = async (assignmentId, reviewData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.REVIEWS.CREATE_TASK_REVIEW(assignmentId),
      reviewData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Error creating review for task assignment',
      }
    );
  }
};

/**
 * Lấy review của task assignment (của customer hiện tại)
 * GET /reviews/assignments/{assignmentId}
 *
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} ApiResponse với review
 */
export const getTaskReview = async assignmentId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVIEWS.GET_TASK_REVIEW(assignmentId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Error getting review for task assignment',
      }
    );
  }
};

/**
 * Tạo review cho request (tổng thể)
 * POST /reviews/requests/{requestId}
 *
 * @param {string} requestId - ID của service request
 * @param {Object} reviewData - Thông tin review
 * @param {number} reviewData.rating - Rating từ 1-5
 * @param {string} reviewData.comment - Comment (optional)
 * @returns {Promise} ApiResponse với review đã tạo
 */
export const createRequestReview = async (requestId, reviewData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.REVIEWS.CREATE_REQUEST_REVIEW(requestId),
      reviewData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Error creating review for request',
      }
    );
  }
};

/**
 * Tạo review cho participant (artist trong recording booking)
 * POST /reviews/participants/{participantId}
 *
 * @param {string} participantId - ID của participant
 * @param {Object} reviewData - Thông tin review
 * @param {number} reviewData.rating - Rating từ 1-5
 * @param {string} reviewData.comment - Comment (optional)
 * @returns {Promise} ApiResponse với review đã tạo
 */
export const createParticipantReview = async (participantId, reviewData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.REVIEWS.CREATE_PARTICIPANT_REVIEW(participantId),
      reviewData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Error creating review for participant',
      }
    );
  }
};

/**
 * Lấy tất cả reviews của specialist (public)
 * GET /reviews/specialists/{specialistId}
 *
 * @param {string} specialistId - ID của specialist
 * @param {Object} params - Query parameters (page, size, sort)
 * @returns {Promise} ApiResponse với danh sách reviews (paged)
 */
export const getSpecialistReviews = async (specialistId, params = {}) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVIEWS.GET_SPECIALIST_REVIEWS(specialistId),
      { params }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Error getting reviews for specialist',
      }
    );
  }
};

/**
 * Lấy tất cả reviews của request (chỉ customer của request)
 * GET /reviews/requests/{requestId}
 *
 * @param {string} requestId - ID của service request
 * @returns {Promise} ApiResponse với danh sách reviews
 */
export const getRequestReviews = async requestId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVIEWS.GET_REQUEST_REVIEWS(requestId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Error getting reviews for request',
      }
    );
  }
};

/**
 * Lấy average rating của specialist (internal API)
 * GET /reviews/specialists/{specialistId}/average-rating
 *
 * @param {string} specialistId - ID của specialist
 * @returns {Promise<number|null>} Average rating (1-5) hoặc null nếu chưa có review
 */
export const getSpecialistAverageRating = async specialistId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVIEWS.GET_SPECIALIST_AVERAGE_RATING(specialistId)
    );

    // Backend trả về Double trực tiếp (không wrap trong ApiResponse)
    // Axios sẽ parse JSON number thành JavaScript number
    const rating = response.data;

    // Handle null/undefined - nếu chưa có review, backend trả về null
    if (rating === null || rating === undefined) {
      return null;
    }

    // Convert to number nếu cần (có thể là string từ JSON)
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;

    // Validate range
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      console.warn(
        `Invalid rating value: ${rating} for specialist ${specialistId}`
      );
      return null;
    }

    return numRating;
  } catch (error) {
    console.error('Error getting specialist average rating:', error);
    // Nếu 404 hoặc không có review, trả về null thay vì throw error
    if (error.response?.status === 404) {
      return null;
    }
    throw (
      error.response?.data || {
        message: 'Error getting average rating for specialist',
      }
    );
  }
};

