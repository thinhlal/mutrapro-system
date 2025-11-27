import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Upload file output cho task assignment (specialist)
 * @param {string} assignmentId - ID của task assignment
 * @param {File} file - File object từ input
 * @param {string} description - Mô tả/ghi chú cho file (optional)
 * @param {string} contentType - Loại nội dung: notation, audio, documentation, etc. (optional, default: notation)
 * @returns {Promise} Response từ API
 */
export const uploadTaskFile = async (assignmentId, file, description = '', contentType = 'notation') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', assignmentId);
    if (description) {
      formData.append('description', description);
    }
    formData.append('contentType', contentType);

    const response = await axiosInstance.post(API_ENDPOINTS.FILES.UPLOAD_TASK_FILE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi upload file',
      }
    );
  }
};

/**
 * Lấy danh sách files theo assignmentId
 * @param {string} assignmentId - ID của task assignment
 * @returns {Promise} Response từ API
 */
export const getFilesByAssignmentId = async (assignmentId) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.FILES.GET_BY_ASSIGNMENT_ID(assignmentId));
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách files',
      }
    );
  }
};

/**
 * Lấy danh sách files theo requestId
 * @param {string} requestId - ID của service request
 * @returns {Promise} Response từ API
 */
export const getFilesByRequestId = async (requestId) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.FILES.GET_BY_REQUEST_ID(requestId));
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách files',
      }
    );
  }
};

