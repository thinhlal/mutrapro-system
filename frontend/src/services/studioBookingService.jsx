import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Tạo booking cho recording milestone
 * POST /api/v1/projects/studio-bookings/recording-milestone
 */
export const createBookingForRecordingMilestone = async bookingData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.STUDIO_BOOKINGS.CREATE_FOR_RECORDING_MILESTONE,
      bookingData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo studio booking' };
  }
};

/**
 * Lấy available time slots của studio trong một ngày
 * GET /api/v1/projects/studio-bookings/available-slots?date={date}
 * Backend tự động lấy studio active (single studio system)
 */
export const getAvailableSlots = async (date) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_AVAILABLE_SLOTS(date)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy available slots' };
  }
};

/**
 * Lấy available artists cho một slot cụ thể
 * GET /api/v1/projects/studio-bookings/available-artists?milestoneId={milestoneId}&date={date}&startTime={startTime}&endTime={endTime}&genres={genres}&preferredSpecialistIds={ids}
 * 
 * @param {string} milestoneId - ID của milestone
 * @param {string} date - Ngày booking (YYYY-MM-DD)
 * @param {string} startTime - Thời gian bắt đầu (HH:mm:ss)
 * @param {string} endTime - Thời gian kết thúc (HH:mm:ss)
 * @param {Array<string>} genres - Optional - Danh sách genres để filter vocalists
 * @param {Array<string>} preferredSpecialistIds - Optional - Danh sách preferred specialist IDs
 */
export const getAvailableArtists = async (
  milestoneId,
  date,
  startTime,
  endTime,
  genres = null,
  preferredSpecialistIds = null
) => {
  try {
    let url = API_ENDPOINTS.STUDIO_BOOKINGS.GET_AVAILABLE_ARTISTS(
      milestoneId,
      date,
      startTime,
      endTime
    );
    
    const params = new URLSearchParams();
    
    // Thêm genres vào query params nếu có
    if (genres && genres.length > 0) {
      genres.forEach(genre => params.append('genres', genre));
    }
    
    // Thêm preferredSpecialistIds vào query params nếu có
    if (preferredSpecialistIds && preferredSpecialistIds.length > 0) {
      preferredSpecialistIds.forEach(id => params.append('preferredSpecialistIds', id));
    }
    
    if (params.toString()) {
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy available artists' };
  }
};

/**
 * Lấy danh sách studio bookings
 * GET /api/v1/projects/studio-bookings?contractId={contractId}&milestoneId={milestoneId}&status={status}
 * 
 * @param {string} contractId - Optional - Filter theo contract
 * @param {string} milestoneId - Optional - Filter theo milestone
 * @param {string} status - Optional - Filter theo status
 */
export const getStudioBookings = async (contractId = null, milestoneId = null, status = null) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.LIST(contractId, milestoneId, status)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách studio bookings' };
  }
};

/**
 * Lấy chi tiết một studio booking
 * GET /api/v1/projects/studio-bookings/{bookingId}
 * 
 * @param {string} bookingId - ID của booking
 */
export const getStudioBookingById = async (bookingId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_BY_ID(bookingId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy chi tiết studio booking' };
  }
};

