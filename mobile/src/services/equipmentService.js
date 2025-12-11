// src/services/equipmentService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get all equipment (optionally filter by skillId)
 */
export const getAllEquipment = async (skillId = null, includeInactive = false, includeUnavailable = false) => {
  try {
    const params = new URLSearchParams();
    if (skillId) params.append('skillId', skillId);
    if (includeInactive) params.append('includeInactive', includeInactive);
    if (includeUnavailable) params.append('includeUnavailable', includeUnavailable);

    const url = `${API_ENDPOINTS.EQUIPMENT?.GET_ALL || API_ENDPOINTS.REQUESTS?.EQUIPMENT || '/api/v1/requests/equipment'}${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to load equipment' };
  }
};

