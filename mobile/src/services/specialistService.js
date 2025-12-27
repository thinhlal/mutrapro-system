// src/services/specialistService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy danh sách vocalists với filter
 * GET /api/v1/specialists/public/specialists/vocalists?gender=&genres=
 *
 * @param {string|null} gender - 'FEMALE' | 'MALE' | null (all)
 * @param {Array<string>|null} genres - Array of genre values (e.g., ['Pop', 'Rock'])
 * @returns {Promise} ApiResponse với danh sách vocalists
 */
export const getVocalists = async (gender = null, genres = null) => {
  try {
    const params = new URLSearchParams();
    if (gender) {
      params.append('gender', gender);
    }
    if (genres && genres.length > 0) {
      // Spring Boot sẽ tự động parse multiple params với cùng tên thành List
      genres.forEach((genre) => params.append('genres', genre));
    }

    const url = `${API_ENDPOINTS.SPECIALISTS.PUBLIC.GET_VOCALISTS}${
      params.toString() ? '?' + params.toString() : ''
    }`;

    console.log('🎤 [Get Vocalists] Calling API:', url);
    const response = await axiosInstance.get(url);
    console.log('✅ [Get Vocalists] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Get Vocalists Error]', error.response?.data || error.message);
    throw (
      error.response?.data || { message: 'Error getting vocalists list' }
    );
  }
};

/**
 * Lấy chi tiết specialist (public - cho customer xem)
 * GET /api/v1/specialists/public/specialists/{specialistId}
 *
 * @param {string} specialistId - ID của specialist
 * @returns {Promise} ApiResponse với thông tin specialist
 */
export const getSpecialistDetail = async (specialistId) => {
  try {
    console.log('🎤 [Get Specialist Detail] Calling API:', API_ENDPOINTS.SPECIALISTS.PUBLIC.GET_SPECIALIST_DETAIL(specialistId));
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PUBLIC.GET_SPECIALIST_DETAIL(specialistId)
    );
    console.log('✅ [Get Specialist Detail] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Get Specialist Detail Error]', error.response?.data || error.message);
    throw (
      error.response?.data || { message: 'Error getting specialist information' }
    );
  }
};

