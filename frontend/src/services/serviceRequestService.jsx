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

    // Recording-specific fields
    if (requestData.requestType === 'recording') {
      if (requestData.bookingDate) {
        formData.append('bookingDate', requestData.bookingDate);
      }
      if (requestData.bookingStartTime) {
        formData.append('bookingStartTime', requestData.bookingStartTime);
      }
      if (requestData.bookingEndTime) {
        formData.append('bookingEndTime', requestData.bookingEndTime);
      }
      if (requestData.vocalistId) {
        formData.append('vocalistId', requestData.vocalistId);
      }
      if (requestData.instrumentalistIds && requestData.instrumentalistIds.length > 0) {
        requestData.instrumentalistIds.forEach(id => {
          formData.append('instrumentalistIds', id);
        });
      }
      if (requestData.equipmentIds && requestData.equipmentIds.length > 0) {
        requestData.equipmentIds.forEach(id => {
          formData.append('equipmentIds', id);
        });
      }
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
 * GET /requests?status=&managerUserId=&requestType=&page=&size=&sort=
 *
 * Lưu ý: Mặc định chỉ lấy những request chưa assign (managerUserId IS NULL)
 * Để lấy request đã assign, truyền managerUserId vào filter
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.status - Trạng thái: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
 * @param {string} filters.managerUserId - ID của manager được assign (nếu có thì lấy request đã assign cho manager này)
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
    if (filters.managerUserId)
      params.append('managerUserId', filters.managerUserId);
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
        managerId: managerId,
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi assign request' };
  }
};

/**
 * Lấy các requests đã được assign cho user hiện tại
 * Sử dụng getAllServiceRequests với filter managerUserId = current user ID
 *
 * @param {string} userId - ID của user hiện tại (manager)
 * @param {Object} additionalFilters - Các filter bổ sung
 * @returns {Promise} ApiResponse với danh sách requests đã assign
 */
export const getMyAssignedRequests = async (userId, additionalFilters = {}) => {
  try {
    return await getAllServiceRequests({
      managerUserId: userId,
      ...additionalFilters,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy danh sách requests mà user hiện tại đã tạo
 * GET /requests/my-requests?status=&page=&size=&sort=
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.status - Trạng thái: pending, contract_sent, contract_approved, contract_signed, in_progress, completed, cancelled, rejected
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
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách requests của bạn',
      }
    );
  }
};

/**
 * Lấy danh sách notation instruments
 * GET /notation-instruments?usage=&includeInactive=
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.usage - Filter theo usage: transcription, arrangement, both
 * @param {boolean} filters.includeInactive - Lấy cả inactive instruments
 *
 * @returns {Promise} ApiResponse với danh sách instruments
 */
export const getNotationInstruments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.usage) params.append('usage', filters.usage);
    if (filters.includeInactive !== undefined)
      params.append('includeInactive', filters.includeInactive);

    const url = `${API_ENDPOINTS.NOTATION_INSTRUMENTS.GET_ALL}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy danh sách instruments' }
    );
  }
};

/**
 * Lấy danh sách notation instruments theo list IDs
 * GET /notation-instruments/by-ids?ids=id1&ids=id2
 *
 * @param {Array<string>} instrumentIds - Danh sách IDs của instruments
 *
 * @returns {Promise} ApiResponse với danh sách instruments
 */
export const getNotationInstrumentsByIds = async instrumentIds => {
  try {
    if (!instrumentIds || instrumentIds.length === 0) {
      return { status: 'success', data: [] };
    }

    const params = new URLSearchParams();
    instrumentIds.forEach(id => {
      params.append('ids', id);
    });

    const url = `${API_ENDPOINTS.NOTATION_INSTRUMENTS.GET_BY_IDS}?${params.toString()}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách instruments theo IDs',
      }
    );
  }
};

/**
 * Tính giá từ pricing matrix
 * GET /pricing-matrix/calculate/{serviceType}?durationMinutes=X
 *
 * @param {string} serviceType - Loại service: transcription, arrangement, arrangement_with_recording
 * @param {Object} params - Tham số tính giá
 * @param {number} params.durationMinutes - Thời lượng (phút) - chỉ cho transcription
 * @param {number} params.numberOfSongs - Số bài - chỉ cho arrangement
 * @param {number} params.artistFee - Phí ca sĩ - chỉ cho arrangement_with_recording
 *
 * @returns {Promise} ApiResponse với PriceCalculationResponse
 */
export const calculatePricing = async (serviceType, params = {}) => {
  try {
    const { durationMinutes, numberOfSongs, artistFee } = params;
    let url;
    const urlParams = new URLSearchParams();

    // Extract REQUEST_PATH from existing endpoint
    const requestPath = API_ENDPOINTS.SERVICE_REQUESTS.GET_ALL.replace(
      '/requests',
      ''
    );

    if (serviceType === 'transcription') {
      url = `${requestPath}/pricing-matrix/calculate/transcription`;
      if (durationMinutes !== undefined && durationMinutes !== null) {
        urlParams.append('durationMinutes', durationMinutes);
      }
    } else if (serviceType === 'arrangement') {
      url = `${requestPath}/pricing-matrix/calculate/arrangement`;
      if (numberOfSongs !== undefined && numberOfSongs !== null) {
        urlParams.append('numberOfSongs', numberOfSongs);
      }
    } else if (
      serviceType === 'arrangement_with_recording' ||
      serviceType === 'arrangement-with-recording'
    ) {
      url = `${requestPath}/pricing-matrix/calculate/arrangement-with-recording`;
      if (numberOfSongs !== undefined && numberOfSongs !== null) {
        urlParams.append('numberOfSongs', numberOfSongs);
      }
      if (artistFee !== undefined && artistFee !== null) {
        urlParams.append('artistFee', artistFee);
      }
    } else {
      throw new Error(
        `Invalid service type for pricing calculation: ${serviceType}`
      );
    }

    if (urlParams.toString()) {
      url += `?${urlParams.toString()}`;
    }

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('Error calculating pricing:', error);
    throw error.response?.data || { message: 'Lỗi khi tính giá' };
  }
};
