// src/services/serviceRequestService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Tạo service request mới
 * POST /requests
 * Content-Type: multipart/form-data
 *
 * @param {Object} requestData - Dữ liệu request
 * @param {string} requestData.requestType - 'transcription' | 'arrangement' | 'arrangement_with_recording' | 'recording'
 * @param {string} requestData.title - Title
 * @param {string} requestData.description - Description
 * @param {string} requestData.contactName - Contact name
 * @param {string} requestData.contactPhone - Contact phone
 * @param {string} requestData.contactEmail - Contact email
 * @param {number} requestData.tempoPercentage - Tempo speed (%) (optional, default 100)
 * @param {number} requestData.durationMinutes - Duration (minutes)
 * @param {Array<string>} requestData.instrumentIds - Instrument IDs
 * @param {boolean} requestData.hasVocalist - Has vocalist (optional)
 * @param {number} requestData.externalGuestCount - Guest count (optional)
 * @param {Array<string>} requestData.genres - Genres (optional, for arrangement)
 * @param {string} requestData.purpose - Purpose (optional, for arrangement)
 * @param {Array<Object>} requestData.files - Files to upload (with uri property)
 *
 * @returns {Promise} ApiResponse
 */
export const createServiceRequest = async (requestData) => {
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

    // Music options - genres và purpose riêng
    if (requestData.genres && requestData.genres.length > 0) {
      requestData.genres.forEach((genre) => {
        formData.append('genres', genre);
      });
    }

    if (requestData.purpose) {
      formData.append('purpose', requestData.purpose);
    }

    // Thêm instrumentIds (array)
    if (requestData.instrumentIds && requestData.instrumentIds.length > 0) {
      requestData.instrumentIds.forEach((id) => {
        formData.append('instrumentIds', id);
      });
    }

    // Thêm mainInstrumentId (cho arrangement)
    if (requestData.mainInstrumentId) {
      formData.append('mainInstrumentId', requestData.mainInstrumentId);
    }

    // Thêm preferredSpecialists (cho arrangement_with_recording)
    if (
      requestData.preferredSpecialists &&
      requestData.preferredSpecialists.length > 0
    ) {
      // Convert array of objects to JSON string
      formData.append(
        'preferredSpecialists',
        JSON.stringify(requestData.preferredSpecialists)
      );
    }

    // Thêm files - React Native format
    if (requestData.files && requestData.files.length > 0) {
      requestData.files.forEach((file) => {
        formData.append('files', {
          uri: file.uri,
          type: file.type || 'audio/mpeg',
          name: file.name || 'audio.mp3',
        });
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
    throw error.response?.data || { message: 'Error creating service request' };
  }
};

/**
 * Lấy danh sách requests mà user hiện tại đã tạo
 * GET /requests/my-requests?status=&page=&size=&sort=
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.status - Trạng thái
 * @param {number} filters.page - Trang (default: 0)
 * @param {number} filters.size - Số lượng (default: 10)
 * @param {string} filters.sort - Sắp xếp (default: createdAt,desc)
 *
 * @returns {Promise} ApiResponse với Page chứa danh sách requests của user
 */
export const getMyRequests = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.page !== undefined) params.append('page', filters.page);
    if (filters.size !== undefined) params.append('size', filters.size);
    if (filters.sort) params.append('sort', filters.sort);

    const url = `${API_ENDPOINTS.SERVICE_REQUESTS.MY_REQUESTS}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Error getting your requests list',
    };
  }
};

/**
 * Lấy chi tiết một service request
 * GET /requests/{requestId}
 *
 * @param {string} requestId - ID của request
 * @returns {Promise} ApiResponse với chi tiết request
 */
export const getServiceRequestById = async (requestId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SERVICE_REQUESTS.GET_BY_ID(requestId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error getting request details' };
  }
};

