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

/**
 * Download file by fileId
 * @param {string} fileId - ID của file
 * @param {string} fileName - Tên file để download (optional)
 * @returns {Promise} Download file
 */
export const downloadFile = async (fileId, fileName = null) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.FILES.DOWNLOAD(fileId), {
      responseType: 'blob', // Quan trọng: phải set responseType là 'blob' để nhận file binary
    });
    
    // Tạo blob URL và trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Lấy tên file từ Content-Disposition header hoặc dùng fileName parameter
    const contentDisposition = response.headers['content-disposition'];
    let downloadFileName = fileName;
    
    if (!downloadFileName && contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch && fileNameMatch[1]) {
        downloadFileName = fileNameMatch[1].replace(/['"]/g, '');
      }
    }
    
    link.download = downloadFileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi download file',
      }
    );
  }
};

