import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Notification Service - REST API for Notifications
 */

/**
 * Get all notifications (paginated)
 */
export const getNotifications = async (page = 0, size = 20) => {
  const response = await axiosInstance.get(API_ENDPOINTS.NOTIFICATIONS.GET_ALL_NOTIFICATIONS, {
    params: { page, size }
  });
  return response.data;
};

/**
 * Get latest notifications (for dropdown)
 */
export const getLatestNotifications = async (limit = 10) => {
  const response = await axiosInstance.get(API_ENDPOINTS.NOTIFICATIONS.GET_LATEST, {
    params: { limit }
  });
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  const response = await axiosInstance.get(API_ENDPOINTS.NOTIFICATIONS.GET_UNREAD_COUNT);
  return response.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  const response = await axiosInstance.post(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId));
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await axiosInstance.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ);
  return response.data;
};

export default {
  getNotifications,
  getLatestNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

