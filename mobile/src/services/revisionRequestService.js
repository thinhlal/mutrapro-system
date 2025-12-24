// src/services/revisionRequestService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Get revision statistics for a contract (free/paid revisions used)
 * GET /revision-requests/contract/{contractId}/stats
 * @param {string} contractId - ID của contract
 * @returns {Promise} Response từ API
 */
export const getContractRevisionStats = async (contractId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.REVISION_REQUESTS.GET_CONTRACT_STATS(contractId)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: 'Failed to load revision statistics',
      }
    );
  }
};

