import { getItem } from '../services/localStorageService';

/**
 * Convert notification actionUrl based on user role
 * - If actionUrl is /chat/:roomId and user is MANAGER, convert to /manager/chat/:roomId
 * - Otherwise, return original actionUrl
 * @param {string} actionUrl - The action URL from notification
 * @returns {string} - The converted action URL based on user role
 */
export const convertNotificationActionUrl = actionUrl => {
  if (!actionUrl) return actionUrl;

  // Get user role from localStorage
  const userData = getItem('user');
  const userRole = userData?.role;

  // If actionUrl starts with /chat/ and user is MANAGER, convert to /manager/chat/
  if (actionUrl.startsWith('/chat/') && userRole === 'MANAGER') {
    return actionUrl.replace('/chat/', '/manager/chat/');
  }

  // Return original actionUrl for other cases
  return actionUrl;
};

