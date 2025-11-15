import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

// ===== ADMIN SPECIALIST MANAGEMENT =====

/**
 * Tạo specialist mới
 */
export const createSpecialist = async specialistData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.SPECIALISTS.ADMIN.CREATE,
      specialistData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo specialist' };
  }
};

/**
 * Lấy tất cả specialists
 */
export const getAllSpecialists = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN.GET_ALL
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách specialist' };
  }
};

/**
 * Lấy specialist theo ID
 */
export const getSpecialistById = async specialistId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN.GET_BY_ID(specialistId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin specialist' };
  }
};

/**
 * Lấy specialist theo user ID
 */
export const getSpecialistByUserId = async userId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN.GET_BY_USER_ID(userId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin specialist' };
  }
};

/**
 * Cập nhật status của specialist
 */
export const updateSpecialistStatus = async (specialistId, status) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.ADMIN.UPDATE_STATUS(specialistId),
      { status }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật status' };
  }
};

/**
 * Cập nhật settings của specialist (max_concurrent_tasks)
 */
export const updateSpecialistSettings = async (specialistId, settings) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.ADMIN.UPDATE_SETTINGS(specialistId),
      settings
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật settings' };
  }
};

/**
 * Filter specialists theo specialization và status
 */
export const filterSpecialists = async (specialization, status) => {
  try {
    const params = new URLSearchParams();
    if (specialization) params.append('specialization', specialization);
    if (status) params.append('status', status);
    
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.SPECIALISTS.ADMIN.FILTER}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi filter specialists' };
  }
};

// ===== ADMIN SKILL MANAGEMENT =====

/**
 * Tạo skill mới
 */
export const createSkill = async skillData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.SPECIALISTS.ADMIN_SKILLS.CREATE,
      skillData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo skill' };
  }
};

/**
 * Lấy tất cả skills
 */
export const getAllSkills = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN_SKILLS.GET_ALL
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách skills' };
  }
};

/**
 * Lấy skill theo ID
 */
export const getSkillById = async skillId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN_SKILLS.GET_BY_ID(skillId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin skill' };
  }
};

/**
 * Cập nhật skill
 */
export const updateSkill = async (skillId, skillData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.ADMIN_SKILLS.UPDATE(skillId),
      skillData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật skill' };
  }
};

/**
 * Xóa skill
 */
export const deleteSkill = async skillId => {
  try {
    const response = await axiosInstance.delete(
      API_ENDPOINTS.SPECIALISTS.ADMIN_SKILLS.DELETE(skillId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xóa skill' };
  }
};

// ===== ADMIN DEMO MANAGEMENT =====

/**
 * Lấy tất cả demos
 */
export const getAllDemos = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN_DEMOS.GET_ALL
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách demos' };
  }
};

/**
 * Lấy demo theo ID
 */
export const getDemoById = async demoId => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.ADMIN_DEMOS.GET_BY_ID(demoId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin demo' };
  }
};

/**
 * Cập nhật visibility của demo
 */
export const updateDemoVisibility = async (demoId, visibilityData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.ADMIN_DEMOS.UPDATE_VISIBILITY(demoId),
      visibilityData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật demo visibility' };
  }
};

