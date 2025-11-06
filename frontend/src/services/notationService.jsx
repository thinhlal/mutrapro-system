
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get all notation instruments
 * Endpoint: GET /api/v1/requests/notation-instruments
 * Requires authentication
 */
export const getNotationInstruments = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REQUEST.NOTATION_INSTRUMENTS
    );
    return response.data; // ApiResponse<InstrumentResponse[]>
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách nhạc cụ' };
  }
};

