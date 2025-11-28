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
    
    console.log('[Mobile Service] Notifications raw response:', JSON.stringify(response.data).substring(0, 300));
    
    // Handle multiple response formats:
    // Format 1: { data: [...] } - array directly in data
    // Format 2: { content: [...] } - paginated at root
    // Format 3: { data: { content: [...] } } - paginated nested in data
    // Format 4: [...] - direct array
    let notifications = [];
    let pagination = null;
    
    if (response.data) {
      // Check if response.data is direct array
      if (Array.isArray(response.data)) {
        notifications = response.data;
      }
      // Check if response.data.data exists
      else if (response.data.data) {
        // Check if response.data.data is array
        if (Array.isArray(response.data.data)) {
          notifications = response.data.data;
        }
        // Check if response.data.data.content is array (nested paginated)
        else if (Array.isArray(response.data.data.content)) {
          notifications = response.data.data.content;
          pagination = {
            totalElements: response.data.data.totalElements || notifications.length,
            totalPages: response.data.data.totalPages,
            size: response.data.data.size,
            number: response.data.data.number,
          };
        }
      }
      // Check if response.data.content is array (paginated at root)
      else if (Array.isArray(response.data.content)) {
        notifications = response.data.content;
        pagination = {
          totalElements: response.data.totalElements || notifications.length,
          totalPages: response.data.totalPages,
          size: response.data.size,
          number: response.data.number,
        };
      }
    }
    
    console.log('[Mobile Service] Parsed notifications count:', notifications.length);
    if (notifications.length > 0) {
      console.log('[Mobile Service] First notification:', JSON.stringify(notifications[0]).substring(0, 150));
    }
    
    return {
      status: 'success',
      data: notifications,
      pagination: pagination || response.data.pagination || {
        totalElements: notifications.length,
      },
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
    
    // Handle both response formats:
    // Format 1: { count: 5 }
    // Format 2: { data: { count: 5 } }
    let count = 0;
    if (response.data) {
      if (typeof response.data === 'number') {
        // Direct number
        count = response.data;
      } else if (response.data.count !== undefined) {
        // Format 1: { count: 5 }
        count = response.data.count;
      } else if (response.data.data && response.data.data.count !== undefined) {
        // Format 2: { data: { count: 5 } }
        count = response.data.data.count;
      }
    }
    
    console.log('[Mobile Service] Unread count raw response:', JSON.stringify(response.data).substring(0, 200));
    console.log('[Mobile Service] Parsed count:', count);
    
    return {
      status: 'success',
      data: count,
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

