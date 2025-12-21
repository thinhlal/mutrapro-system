// src/services/equipmentService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get all equipment (optionally filter by skillId)
 * @param {string} skillId - Filter by skill_id
 * @param {boolean} includeInactive - Include inactive equipment (for admin)
 * @param {boolean} includeUnavailable - Include unavailable equipment (when skillId is provided)
 */
export const getAllEquipment = async (
  skillId = null,
  includeInactive = false,
  includeUnavailable = false
) => {
  try {
    const params = { includeInactive, includeUnavailable };
    if (skillId) {
      params.skillId = skillId;
    }
    const response = await axiosInstance.get(API_ENDPOINTS.EQUIPMENT.GET_ALL, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load equipment' };
  }
};

