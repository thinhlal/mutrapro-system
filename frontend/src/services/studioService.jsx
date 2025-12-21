import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy tất cả studios (Admin only)
 * GET /api/v1/projects/admin/studios
 */
export const getAllStudios = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.STUDIOS.GET_ALL);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách studios' };
  }
};

/**
 * Lấy thông tin studio active (Admin only)
 * GET /api/v1/projects/admin/studios/active
 */
export const getActiveStudioAdmin = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.STUDIOS.GET_ACTIVE);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin studio active' };
  }
};

/**
 * Lấy thông tin studio active (Public - cho customer)
 * GET /api/v1/projects/studio-bookings/active-studio
 */
export const getActiveStudio = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.STUDIOS.GET_ACTIVE_PUBLIC);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin studio' };
  }
};

/**
 * Cập nhật studio (Admin only)
 * PUT /api/v1/projects/admin/studios/{studioId}
 */
export const updateStudio = async (studioId, data) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.STUDIOS.UPDATE(studioId),
      data
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật studio' };
  }
};

