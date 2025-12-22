// src/services/studioBookingService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get active studio information
 * GET /projects/studio-bookings/active-studio
 */
export const getActiveStudio = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_ACTIVE_STUDIO
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load studio information' };
  }
};

/**
 * Get available studio slots for a given date (YYYY-MM-DD)
 */
export const getAvailableSlots = async (date) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_AVAILABLE_SLOTS(date)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load available slots' };
  }
};

/**
 * Get available artists (vocal/instrument) for a service request slot
 * roleType: 'VOCAL' | 'INSTRUMENT' | null
 * skillId: optional for instrumentalists
 * genres: optional array for vocalists
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
    const url = API_ENDPOINTS.STUDIO_BOOKINGS.GET_AVAILABLE_ARTISTS_FOR_REQUEST(
      date,
      startTime,
      endTime,
      skillId,
      roleType,
      genres
    );
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Failed to load available artists',
      }
    );
  }
};

/**
 * Create booking from a service request (Recording flow)
 */
export const createBookingFromServiceRequest = async (requestId, bookingData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.STUDIO_BOOKINGS.CREATE_FROM_SERVICE_REQUEST(requestId),
      bookingData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Failed to create booking from request',
      }
    );
  }
};

/**
 * Get booking by service request id
 */
export const getBookingByRequestId = async (requestId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.STUDIO_BOOKINGS.GET_BY_REQUEST_ID(requestId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load booking info' };
  }
};

