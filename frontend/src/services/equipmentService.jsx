// src/services/equipmentService.jsx
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get all equipment (with optional skillId filter)
 * @param {string} skillId - Filter by skill_id
 * @param {boolean} includeInactive - Include inactive equipment (for admin)
 * @param {boolean} includeUnavailable - Include unavailable equipment (when skillId is provided)
 */
export const getAllEquipment = async (
  skillId = null,
  includeInactive = true,
  includeUnavailable = false
) => {
  try {
    const params = { includeInactive, includeUnavailable };
    if (skillId) {
      params.skillId = skillId;
    }
    const response = await axiosInstance.get(
      API_ENDPOINTS.EQUIPMENT.GET_ALL,
      { params }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách thiết bị' };
  }
};

/**
 * Get available equipment (only active and available)
 */
export const getAvailableEquipment = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.EQUIPMENT.GET_AVAILABLE
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách thiết bị available' };
  }
};

/**
 * Get equipment by ID (with skill mappings)
 * @param {string} equipmentId - ID of equipment
 */
export const getEquipmentById = async equipmentId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.EQUIPMENT.GET_BY_ID(equipmentId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin thiết bị' };
  }
};

/**
 * Get equipment by list IDs
 * @param {string[]} equipmentIds - List of equipment IDs
 */
export const getEquipmentByIds = async equipmentIds => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.EQUIPMENT.GET_BY_IDS,
      { params: { ids: equipmentIds } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách thiết bị' };
  }
};

/**
 * Create new equipment
 * @param {FormData} formData - Form data with equipmentName, brand, model, rentalFee, etc.
 */
export const createEquipment = async formData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.EQUIPMENT.CREATE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo thiết bị' };
  }
};

/**
 * Update equipment
 * @param {string} equipmentId - ID of equipment
 * @param {FormData} formData - Form data with fields to update
 */
export const updateEquipment = async (equipmentId, formData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.EQUIPMENT.UPDATE(equipmentId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật thiết bị' };
  }
};

/**
 * Upload image for equipment
 * @param {string} equipmentId - ID of equipment
 * @param {File} imageFile - Image file to upload
 */
export const uploadEquipmentImage = async (equipmentId, imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await axiosInstance.post(
      API_ENDPOINTS.EQUIPMENT.UPLOAD_IMAGE(equipmentId),
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

