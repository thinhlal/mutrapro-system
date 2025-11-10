// src/services/serviceRequestService.jsx
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Tạo service request mới
 * POST /requests
 * Content-Type: multipart/form-data
 * 
 * @param {Object} requestData - Dữ liệu request
 * @param {string} requestData.requestType - 'transcription' | 'arrangement' | 'arrangement_with_recording' | 'recording'
 * @param {string} requestData.title - Tiêu đề
 * @param {string} requestData.description - Mô tả yêu cầu
 * @param {string} requestData.contactName - Tên liên hệ
 * @param {string} requestData.contactPhone - Số điện thoại
 * @param {string} requestData.contactEmail - Email liên hệ
 * @param {number} requestData.tempoPercentage - Tốc độ tempo (%) (optional, default 100)
 * @param {number} requestData.durationMinutes - Thời lượng (phút)
 * @param {Array<string>} requestData.instrumentIds - Danh sách ID nhạc cụ
 * @param {boolean} requestData.hasVocalist - Có ca sĩ không (optional)
 * @param {number} requestData.externalGuestCount - Số lượng khách mời (optional)
 * @param {any} requestData.musicOptions - Các tùy chọn khác (optional)
 * @param {Array<File>} requestData.files - Danh sách files upload
 * 
 * @returns {Promise} ApiResponse
 */
export const createServiceRequest = async requestData => {
  try {
    const formData = new FormData();

    // Required fields
    formData.append('requestType', requestData.requestType);
    formData.append('title', requestData.title);
    formData.append('description', requestData.description);
    formData.append('contactName', requestData.contactName);
    formData.append('contactPhone', requestData.contactPhone);
    formData.append('contactEmail', requestData.contactEmail);
    formData.append('durationMinutes', requestData.durationMinutes || 0);

    // Optional fields
    if (requestData.tempoPercentage !== undefined) {
      formData.append('tempoPercentage', requestData.tempoPercentage);
    }
    
    if (requestData.hasVocalist !== undefined) {
      formData.append('hasVocalist', requestData.hasVocalist);
    }
    
    if (requestData.externalGuestCount !== undefined) {
      formData.append('externalGuestCount', requestData.externalGuestCount);
    }
    
    if (requestData.musicOptions) {
      formData.append('musicOptions', JSON.stringify(requestData.musicOptions));
    }

    // Thêm instrumentIds (array)
    if (requestData.instrumentIds && requestData.instrumentIds.length > 0) {
      requestData.instrumentIds.forEach(id => {
        formData.append('instrumentIds', id);
      });
    }

    // Thêm files
    if (requestData.files && requestData.files.length > 0) {
      requestData.files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await axiosInstance.post(
      API_ENDPOINTS.SERVICE_REQUESTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo service request' };
  }
};

/**
 * Lấy tất cả service requests với filter
 * GET /requests?status=&assignedTo=&requestType=&page=&size=&sort=
 * 
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.status - Trạng thái: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
 * @param {string} filters.assignedTo - ID của người được assign
 * @param {string} filters.requestType - Loại: transcription, arrangement
 * @param {number} filters.page - Trang (default: 0)
 * @param {number} filters.size - Số lượng (default: 20)
 * @param {string} filters.sort - Sắp xếp (default: createdAt,desc)
 * 
 * @returns {Promise} ApiResponse với danh sách requests
 */
export const getAllServiceRequests = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.requestType) params.append('requestType', filters.requestType);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.SERVICE_REQUESTS.GET_ALL}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách requests' };
  }
};

/**
 * Lấy chi tiết một service request
 * GET /requests/{requestId}
 * 
 * @param {string} requestId - ID của request
 * @returns {Promise} ApiResponse với chi tiết request
 */
export const getServiceRequestById = async requestId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SERVICE_REQUESTS.GET_BY_ID(requestId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy chi tiết request' };
  }
};

/**
 * Manager/Admin nhận trách nhiệm về một service request
 * PUT /requests/{requestId}/assign
 * 
 * @param {string} requestId - ID của request
 * @param {string} managerId - ID của manager
 * @returns {Promise} ApiResponse
 */
export const assignServiceRequest = async (requestId, managerId) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SERVICE_REQUESTS.ASSIGN(requestId),
      {
        managerId: managerId
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi assign request' };
  }
};

/**
 * Lấy các requests đã được assign cho user hiện tại
 * Sử dụng getAllServiceRequests với filter assignedTo = current user ID
 * 
 * @param {string} userId - ID của user hiện tại
 * @param {Object} additionalFilters - Các filter bổ sung
 * @returns {Promise} ApiResponse với danh sách requests đã assign
 */
export const getMyAssignedRequests = async (userId, additionalFilters = {}) => {
  try {
    return await getAllServiceRequests({
      assignedTo: userId,
      ...additionalFilters,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy danh sách requests mà user hiện tại đã tạo
 * GET /requests/my-requests?status=
 * 
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.status - Trạng thái: pending, contract_sent, contract_signed, approved, in_progress, completed, cancelled, rejected
 * 
 * @returns {Promise} ApiResponse với danh sách requests của user
 */
export const getMyRequests = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);

    const url = `${API_ENDPOINTS.SERVICE_REQUESTS.MY_REQUESTS}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách requests của bạn' };
  }
};

