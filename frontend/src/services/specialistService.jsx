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
 * Lấy tất cả specialists cho Manager (có thể filter)
 * @param {Object} filters - Filters: specialization, skillNames, milestoneId, contractId, mainInstrumentName
 */
export const getAllSpecialists = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    // Xử lý từng filter
    if (filters.specialization) {
      params.append('specialization', filters.specialization);
    }

    // Xử lý skillNames array: Spring Boot nhận format ?skillNames=value1&skillNames=value2
    if (Array.isArray(filters.skillNames) && filters.skillNames.length > 0) {
      filters.skillNames.forEach(skillName => {
        if (skillName) {
          params.append('skillNames', skillName);
        }
      });
    }

    // Thêm milestoneId và contractId để tính tasksInSlaWindow theo milestone
    if (filters.milestoneId) {
      params.append('milestoneId', filters.milestoneId);
    }
    if (filters.contractId) {
      params.append('contractId', filters.contractId);
    }
    
    // Thêm mainInstrumentName để filter specialist phải match với main instrument
    if (filters.mainInstrumentName) {
      params.append('mainInstrumentName', filters.mainInstrumentName);
    }

    const queryString = params.toString();
    const url = `${API_ENDPOINTS.SPECIALISTS.MANAGER.GET_AVAILABLE}${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: 'Lỗi khi lấy danh sách specialist' }
    );
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
    throw (
      error.response?.data || { message: 'Lỗi khi lấy thông tin specialist' }
    );
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
    throw (
      error.response?.data || { message: 'Lỗi khi lấy thông tin specialist' }
    );
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
    throw (
      error.response?.data || { message: 'Lỗi khi cập nhật demo visibility' }
    );
  }
};

// ===== SPECIALIST PROFILE MANAGEMENT (Self-service) =====

/**
 * Lấy profile của specialist hiện tại
 */
export const getMyProfile = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PROFILE.GET_MY_PROFILE
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy profile' };
  }
};

/**
 * Lấy profile đầy đủ của specialist hiện tại
 */
export const getMyProfileDetail = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PROFILE.GET_MY_PROFILE_DETAIL
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy profile detail' };
  }
};

/**
 * Cập nhật profile của specialist hiện tại
 */
export const updateMyProfile = async profileData => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.PROFILE.UPDATE_MY_PROFILE,
      profileData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật profile' };
  }
};

/**
 * Lấy danh sách skills có sẵn
 */
export const getAvailableSkills = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PROFILE.GET_AVAILABLE_SKILLS
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách skills' };
  }
};

/**
 * Lấy danh sách skills của specialist hiện tại
 */
export const getMySkills = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PROFILE.GET_MY_SKILLS
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy skills' };
  }
};

/**
 * Thêm skill cho specialist hiện tại
 */
export const addSkill = async skillData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.SPECIALISTS.PROFILE.ADD_SKILL,
      skillData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi thêm skill' };
  }
};

/**
 * Cập nhật skill của specialist hiện tại
 */
export const updateMySkill = async (skillId, skillData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.PROFILE.UPDATE_SKILL(skillId),
      skillData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật skill' };
  }
};

/**
 * Xóa skill của specialist hiện tại
 */
export const deleteMySkill = async skillId => {
  try {
    const response = await axiosInstance.delete(
      API_ENDPOINTS.SPECIALISTS.PROFILE.DELETE_SKILL(skillId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xóa skill' };
  }
};

/**
 * Lấy danh sách demos của specialist hiện tại
 */
export const getMyDemos = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SPECIALISTS.PROFILE.GET_MY_DEMOS
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy demos' };
  }
};

/**
 * Tạo demo mới cho specialist hiện tại
 */
export const createMyDemo = async demoData => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.SPECIALISTS.PROFILE.CREATE_DEMO,
      demoData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo demo' };
  }
};

/**
 * Cập nhật demo của specialist hiện tại
 */
export const updateMyDemo = async (demoId, demoData) => {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.SPECIALISTS.PROFILE.UPDATE_DEMO(demoId),
      demoData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi cập nhật demo' };
  }
};

/**
 * Xóa demo của specialist hiện tại
 */
export const deleteMyDemo = async demoId => {
  try {
    const response = await axiosInstance.delete(
      API_ENDPOINTS.SPECIALISTS.PROFILE.DELETE_DEMO(demoId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi xóa demo' };
  }
};
