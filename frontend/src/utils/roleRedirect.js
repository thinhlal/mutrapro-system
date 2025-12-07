/**
 * Get the redirect path based on user role
 * @param {string} role - User role (CUSTOMER, MANAGER, SYSTEM_ADMIN)
 * @param {string} fallback - Fallback path if role doesn't match
 * @returns {string} The redirect path
 */
export const getRoleBasedRedirectPath = (role, fallback = '/') => {
  // Normalize role to uppercase for case-insensitive comparison
  const roleUpper = role?.toUpperCase();
  
  switch (roleUpper) {
    case 'SYSTEM_ADMIN':
      return '/admin/dashboard';
    case 'MANAGER':
      return '/manager/dashboard';
    case 'TRANSCRIPTION':
      return '/transcription/my-tasks';
    case 'ARRANGEMENT':
      return '/arrangement/my-tasks';
    case 'RECORDING_ARTIST':
      return '/recording-artist/profile';
    case 'CUSTOMER':
      return '/';
    default:
      return fallback;
  }
};

/**
 * Check if user should be redirected based on their role
 * @param {Object} user - User object with role
 * @returns {string|null} Redirect path or null if no redirect needed
 */
export const getRedirectPathForUser = user => {
  if (!user || !user.role) return null;

  return getRoleBasedRedirectPath(user.role);
};
