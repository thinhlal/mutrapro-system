// Utility functions for time/duration formatting

/**
 * Convert minutes (decimal) to mm:ss format
 * @param {number} minutes - Duration in minutes (e.g., 4.38)
 * @returns {string} Formatted duration as mm:ss (e.g., "04:23")
 */
export const formatDurationMMSS = minutes => {
  if (!minutes || minutes <= 0) return '00:00';

  const totalSeconds = Math.round(minutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Convert seconds to mm:ss format
 * @param {number} seconds - Duration in seconds (default: 0)
 * @returns {string} Formatted duration as mm:ss (e.g., "04:23")
 */
export const formatSecondsToMMSS = (seconds = 0) => {
  const s = Math.floor(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
