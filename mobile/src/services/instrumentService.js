// src/services/instrumentService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy tất cả skills từ public endpoint
 * GET /public/skills
 * Filter skills với skillType = RECORDING_ARTIST và recordingCategory = INSTRUMENT
 *
 * @returns {Promise} ApiResponse với danh sách skills
 */
export const getAllRecordingInstrumentSkills = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PUBLIC.GET_ALL_SKILLS
    );

    if (response.data?.status === 'success' && response.data?.data) {
      // Filter skills with skillType = RECORDING_ARTIST and recordingCategory = INSTRUMENT
      const instrumentSkills = response.data.data.filter(
        skill =>
          skill.skillType === 'RECORDING_ARTIST' &&
          skill.recordingCategory === 'INSTRUMENT'
      );
      return {
        status: 'success',
        data: instrumentSkills,
      };
    }
    return { status: 'success', data: [] };
  } catch (error) {
    throw error.response?.data || { message: 'Error getting skills list' };
  }
};

/**
 * Lấy danh sách notation instruments
 * GET /notation-instruments?usage=&includeInactive=
 *
 * @param {Object} filters - Các filter tùy chọn
 * @param {string} filters.usage - Filter theo usage: transcription, arrangement, both
 * @param {boolean} filters.includeInactive - Lấy cả inactive instruments
 *
 * @returns {Promise} ApiResponse với danh sách instruments
 */
export const getNotationInstruments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.usage) params.append('usage', filters.usage);
    if (filters.includeInactive !== undefined)
      params.append('includeInactive', filters.includeInactive);

    const url = `${API_ENDPOINTS.NOTATION_INSTRUMENTS.GET_ALL}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error getting instruments list' };
  }
};

/**
 * Lấy danh sách notation instruments theo list IDs
 * GET /notation-instruments/by-ids?ids=id1&ids=id2
 *
 * @param {Array<string>} instrumentIds - Danh sách IDs của instruments
 *
 * @returns {Promise} ApiResponse với danh sách instruments
 */
export const getNotationInstrumentsByIds = async (instrumentIds) => {
  try {
    if (!instrumentIds || instrumentIds.length === 0) {
      return { status: 'success', data: [] };
    }

    const params = new URLSearchParams();
    instrumentIds.forEach((id) => {
      params.append('ids', id);
    });

    const url = `${API_ENDPOINTS.NOTATION_INSTRUMENTS.GET_BY_IDS}?${params.toString()}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Error getting instruments list by IDs',
    };
  }
};

