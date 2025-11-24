import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Notification Service
 * Handles all notification-related API calls
 */

/**
 * Get all notifications for the current user
 * @param {Object} params - Query parameters
 * @param {string} params.filter - Filter by status: 'all', 'read', 'unread'
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise} API response with notifications array
 */
export const getNotifications = async (params = {}) => {
  try {
    const { filter = 'all', page = 1, limit = 20 } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filter !== 'all') {
      queryParams.append('status', filter);
    }

    const response = await axiosInstance.get(
      `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL_NOTIFICATIONS}?${queryParams.toString()}`
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch notifications',
      data: [], // Return empty array instead of null
    };
  }
};

/**
 * Get notification by ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise} API response with notification details
 */
export const getNotificationById = async (notificationId) => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL_NOTIFICATIONS}/${notificationId}`
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error fetching notification:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch notification',
      data: null,
    };
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise} API response
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId)
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to mark notification as read',
      data: null,
    };
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise} API response
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to mark all notifications as read',
      data: null,
    };
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise} API response
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL_NOTIFICATIONS}/${notificationId}`
    );
    
    return {
      status: 'success',
      data: response.data,
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to delete notification',
      data: null,
    };
  }
};

/**
 * Get unread notification count
 * @returns {Promise} API response with count
 */
export const getUnreadNotificationCount = async () => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.NOTIFICATIONS.GET_UNREAD_COUNT
    );
    
    return {
      status: 'success',
      data: response.data.count || 0,
    };
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch unread count',
      data: 0,
    };
  }
};

/**
 * Update notification preferences
 * @param {Object} preferences - Notification preferences
 * @returns {Promise} API response
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL_NOTIFICATIONS}/preferences`,
      preferences
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to update preferences',
      data: null,
    };
  }
};

/**
 * Get notification preferences
 * @returns {Promise} API response with preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL_NOTIFICATIONS}/preferences`
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch preferences',
      data: null,
    };
  }
};

