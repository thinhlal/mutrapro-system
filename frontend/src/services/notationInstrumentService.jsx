// src/services/notationInstrumentService.jsx
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get all notation instruments (with optional usage filter)
 * @param {string} usage - Filter by usage: transcription|arrangement|both
 * @param {boolean} includeInactive - Include inactive instruments (for admin)
 */
export const getAllNotationInstruments = async (
  usage = null,
  includeInactive = true
) => {
  try {
    const params = { includeInactive };
    if (usage) {
      params.usage = usage;
    }
    const response = await axiosInstance.get(
      API_ENDPOINTS.NOTATION_INSTRUMENTS.GET_ALL,
      { params }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách nhạc cụ' };
  }
};

/**
 * Create new notation instrument
 * @param {FormData} formData - Form data with instrumentName, usage, image
 */
export const createNotationInstrument = async formData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.NOTATION_INSTRUMENTS.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo nhạc cụ' };
  }
};

/**
 * Update notation instrument
 * @param {string} instrumentId - ID of instrument
 * @param {FormData} formData - Form data with fields to update
 */
export const updateNotationInstrument = async (instrumentId, formData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.NOTATION_INSTRUMENTS.UPDATE(instrumentId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật nhạc cụ' };
  }
};

/**
 * Upload image for notation instrument
 * @param {string} instrumentId - ID of instrument
 * @param {File} imageFile - Image file to upload
 */
export const uploadInstrumentImage = async (instrumentId, imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await axiosInstance.post(
      API_ENDPOINTS.NOTATION_INSTRUMENTS.UPLOAD_IMAGE(instrumentId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi upload hình ảnh' };
  }
};
