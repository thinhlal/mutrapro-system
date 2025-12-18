import { getItem } from '../services/localStorageService';

/**
 * Convert notification actionUrl based on user role
 * - If actionUrl is /chat/:roomId and user is MANAGER, convert to /manager/chat/:roomId
 * - If actionUrl is /transcription/my-tasks, /arrangement/my-tasks, or /recording-artist/my-tasks
 *   but doesn't match user's role, convert to match user's specialist role route
 * - Otherwise, return original actionUrl
 * @param {string} actionUrl - The action URL from notification
 * @returns {string} - The converted action URL based on user role
 */
export const convertNotificationActionUrl = actionUrl => {
  if (!actionUrl) return actionUrl;

  // Get user role from localStorage
  const userData = getItem('user');
  const userRole = userData?.role?.toUpperCase();

  // If actionUrl starts with /chat/ and user is MANAGER, convert to /manager/chat/
  if (actionUrl.startsWith('/chat/') && userRole === 'MANAGER') {
    return actionUrl.replace('/chat/', '/manager/chat/');
  }

  // Convert specialist routes based on user role
  // Map specialist roles to their corresponding route prefixes
  const roleToRoutePrefix = {
    TRANSCRIPTION: '/transcription',
    ARRANGEMENT: '/arrangement',
    RECORDING_ARTIST: '/recording-artist',
  };

  // Check if actionUrl is a specialist my-tasks route
  if (actionUrl.includes('/my-tasks')) {
    // If user has a specialist role
    if (userRole && roleToRoutePrefix[userRole]) {
      // Extract the path after the route prefix (e.g., /my-tasks, /my-tasks/:taskId)
      let pathAfterRoute = '';
      let shouldConvert = false;

      if (actionUrl.startsWith('/transcription/')) {
        pathAfterRoute = actionUrl.replace('/transcription', '');
        shouldConvert = userRole !== 'TRANSCRIPTION';
      } else if (actionUrl.startsWith('/arrangement/')) {
        pathAfterRoute = actionUrl.replace('/arrangement', '');
        shouldConvert = userRole !== 'ARRANGEMENT';
      } else if (actionUrl.startsWith('/recording-artist/')) {
        pathAfterRoute = actionUrl.replace('/recording-artist', '');
        shouldConvert = userRole !== 'RECORDING_ARTIST';
      }

      // If the route doesn't match user's role, convert it to match user's role
      // This handles cases where old notifications have wrong actionUrl
      if (shouldConvert && pathAfterRoute) {
        const convertedUrl = roleToRoutePrefix[userRole] + pathAfterRoute;
        console.log(
          `[NotificationUtils] Converting actionUrl from ${actionUrl} to ${convertedUrl} (userRole: ${userRole})`
        );
        return convertedUrl;
      }
    }
  }

  // Return original actionUrl for other cases
  return actionUrl;
};
