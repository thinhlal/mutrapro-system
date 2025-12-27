/**
 * Contract Type and Request Type Constants
 * Mapping từ backend enum sang frontend display
 */

// Contract Type Labels
export const CONTRACT_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording',
  recording: 'Recording',
  bundle: 'Bundle (Transcription + Arrangement + Recording)',
};

// Contract Type Colors (Ant Design Tag colors)
export const CONTRACT_TYPE_COLORS = {
  transcription: 'blue',
  arrangement: 'green',
  arrangement_with_recording: 'purple',
  recording: 'orange',
  bundle: 'cyan',
};

// Request Type Labels (same as Contract Type for now)
export const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording',
  recording: 'Recording',
  bundle: 'Bundle (Transcription + Arrangement + Recording)',
};

// Request Type Colors
export const REQUEST_TYPE_COLORS = {
  transcription: 'blue',
  arrangement: 'green',
  arrangement_with_recording: 'purple',
  recording: 'orange',
  bundle: 'cyan',
};

/**
 * Get contract type label
 * @param {string} contractType - Contract type from backend
 * @returns {string} Display label
 */
export const getContractTypeLabel = (contractType) => {
  if (!contractType) return 'N/A';
  return CONTRACT_TYPE_LABELS[contractType] || contractType.toUpperCase();
};

/**
 * Get contract type color
 * @param {string} contractType - Contract type from backend
 * @returns {string} Ant Design Tag color
 */
export const getContractTypeColor = (contractType) => {
  if (!contractType) return 'default';
  return CONTRACT_TYPE_COLORS[contractType] || 'default';
};

/**
 * Get request type label
 * @param {string} requestType - Request type from backend (can be requestType or serviceType)
 * @returns {string} Display label
 */
export const getRequestTypeLabel = (requestType) => {
  if (!requestType) return 'N/A';
  return REQUEST_TYPE_LABELS[requestType] || requestType.toUpperCase();
};

/**
 * Get request type color
 * @param {string} requestType - Request type from backend
 * @returns {string} Ant Design Tag color
 */
export const getRequestTypeColor = (requestType) => {
  if (!requestType) return 'default';
  return REQUEST_TYPE_COLORS[requestType] || 'default';
};

