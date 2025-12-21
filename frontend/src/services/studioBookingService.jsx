import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy thông tin studio active
 * GET /api/v1/projects/studio-bookings/active-studio
 */
export const getActiveStudio = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_ACTIVE_STUDIO
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin studio' };
  }
};

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
export const getAvailableSlots = async date => {
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
      preferredSpecialistIds.forEach(id =>
        params.append('preferredSpecialistIds', id)
      );
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
export const getStudioBookings = async (
  contractId = null,
  milestoneId = null,
  status = null
) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.LIST(contractId, milestoneId, status)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách studio bookings',
      }
    );
  }
};

/**
 * Lấy chi tiết một studio booking
 * GET /api/v1/projects/studio-bookings/{bookingId}
 *
 * @param {string} bookingId - ID của booking
 */
export const getStudioBookingById = async bookingId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_BY_ID(bookingId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy chi tiết studio booking' }
    );
  }
};

/**
 * Lấy danh sách studio bookings của recording artist hiện tại
 * GET /api/v1/projects/studio-bookings/my-bookings
 */
export const getMyStudioBookings = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.MY_BOOKINGS
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy danh sách studio bookings',
      }
    );
  }
};

/**
 * Tạo studio booking từ service request (Luồng 3: Recording)
 * POST /api/v1/projects/studio-bookings/from-request/{requestId}
 *
 * @param {string} requestId - ID của service request
 * @param {Object} bookingData - Dữ liệu booking
 * @param {string} bookingData.bookingDate - Ngày booking (YYYY-MM-DD)
 * @param {string} bookingData.startTime - Thời gian bắt đầu (HH:mm:ss)
 * @param {string} bookingData.endTime - Thời gian kết thúc (HH:mm:ss)
 * @param {number} bookingData.durationHours - Thời lượng (giờ)
 * @param {Array} bookingData.participants - Danh sách participants
 * @param {Array} bookingData.requiredEquipment - Danh sách equipment cần thuê
 * @param {number} bookingData.externalGuestCount - Số lượng khách mời (optional)
 * @param {string} bookingData.purpose - Mục đích (optional)
 * @param {string} bookingData.specialInstructions - Hướng dẫn đặc biệt (optional)
 * @param {string} bookingData.notes - Ghi chú (optional)
 */
export const createBookingFromServiceRequest = async (
  requestId,
  bookingData
) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.STUDIO_BOOKINGS.CREATE_FROM_SERVICE_REQUEST(requestId),
      bookingData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi tạo studio booking từ service request',
      }
    );
  }
};

/**
 * Lấy available artists/instrumentalists cho luồng 3 (Booking từ Service Request)
 * GET /api/v1/projects/studio-bookings/available-artists-for-request?date={date}&startTime={startTime}&endTime={endTime}&skillId={skillId}&roleType={roleType}&genres={genres}
 *
 * @param {string} date - Ngày booking (YYYY-MM-DD)
 * @param {string} startTime - Thời gian bắt đầu (HH:mm:ss)
 * @param {string} endTime - Thời gian kết thúc (HH:mm:ss)
 * @param {string} skillId - Optional - Skill ID để filter instrumentalists
 * @param {string} roleType - Optional - VOCAL hoặc INSTRUMENT
 * @param {Array<string>} genres - Optional - Genres để filter vocalists
 */
export const getAvailableArtistsForRequest = async (
  date,
  startTime,
  endTime,
  skillId = null,
  roleType = null,
  genres = null
) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_AVAILABLE_ARTISTS_FOR_REQUEST(
        date,
        startTime,
        endTime,
        skillId,
        roleType,
        genres
      )
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Lỗi khi lấy available artists cho request',
      }
    );
  }
};

/**
 * Lấy booking information theo requestId
 * GET /api/v1/project/bookings/by-request/{requestId}
 */
export const getBookingByRequestId = async requestId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_BY_REQUEST_ID(requestId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy booking information' }
    );
  }
};
