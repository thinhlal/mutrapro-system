import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS, API_CONFIG } from '../config/apiConfig';
import { getItem } from '../utils/storage';
import { STORAGE_KEYS } from '../config/constants';

/**
 * Chat Service - REST API for Chat Service (Mobile)
 * Updated to match backend chat-service endpoints
 */

// ==================== Chat Rooms ====================

/**
 * Get all chat rooms for current user
 */
export const getChatRooms = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.CHAT.GET_ALL_ROOMS);
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error fetching chat rooms:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch chat rooms',
      data: [],
    };
  }
};

/**
 * Get chat room by ID
 */
export const getChatRoomById = async (roomId) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.CHAT.GET_ROOM(roomId));
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error fetching chat room:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch chat room',
      data: null,
    };
  }
};

/**
 * Get chat room by context (roomType and contextId)
 * Used for REQUEST_CHAT rooms
 */
export const getChatRoomByContext = async (roomType, contextId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CHAT.GET_ROOM_BY_CONTEXT,
      {
        params: { roomType, contextId },
      }
    );
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error fetching chat room by context:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch chat room',
      data: null,
    };
  }
};

/**
 * Create a new chat room (manual - for SUPPORT_CHAT or DIRECT_MESSAGE only)
 */
export const createChatRoom = async (data) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CHAT.CREATE_ROOM,
      data
    );
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error creating chat room:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to create chat room',
      data: null,
    };
  }
};

// ==================== Messages ====================

/**
 * Get messages in a chat room with pagination
 * Note: To send messages, use WebSocket via websocketService.sendMessage()
 * @param {string} roomId - Chat room ID
 * @param {number} page - Page number (default: 0)
 * @param {number} size - Page size (default: 50)
 * @param {string} contextType - Optional: Filter by context type (GENERAL, MILESTONE, REVISION_REQUEST, etc.)
 * @param {string} contextId - Optional: Filter by context ID (milestoneId, revisionRequestId, etc.)
 */
export const getChatMessages = async (roomId, params = {}) => {
  try {
    const { page = 0, size = 50, contextType = null, contextId = null } = params;
    
    const requestParams = { page, size };
    if (contextType) requestParams.contextType = contextType;
    if (contextId) requestParams.contextId = contextId;
    
    const response = await axiosInstance.get(
      API_ENDPOINTS.CHAT.GET_MESSAGES(roomId),
      {
        params: requestParams,
      }
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error fetching messages:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch messages',
      data: { content: [], last: true },
    };
  }
};

/**
 * Get recent messages since a specific timestamp (for sync after reconnect)
 */
export const getRecentMessages = async (roomId, sinceTimestamp) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CHAT.GET_RECENT_MESSAGES(roomId, sinceTimestamp)
    );
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error fetching recent messages:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch recent messages',
      data: [],
    };
  }
};

/**
 * Get unread message count for a chat room
 */
export const getUnreadCount = async (roomId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.CHAT.GET_UNREAD_COUNT(roomId)
    );
    return {
      status: 'success',
      data: response.data.data || response.data.count || 0,
    };
  } catch (error) {
    console.error('[Mobile] Error fetching unread count:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch unread count',
      data: 0,
    };
  }
};

/**
 * Mark messages as read in a chat room
 */
export const markAsRead = async (roomId) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CHAT.MARK_AS_READ(roomId)
    );
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error marking as read:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to mark as read',
      data: null,
    };
  }
};

/**
 * Upload file for chat
 * @param {Object} file - File object (from React Native ImagePicker or DocumentPicker)
 * @param {string} roomId - Chat room ID
 * @returns {Promise<{status: string, data: {fileKey: string, fileName: string, fileSize: number, mimeType: string, fileType: string}}>}
 */
export const uploadFile = async (file, roomId) => {
  try {
    const formData = new FormData();
    
    // React Native FormData format
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || file.fileName || 'file',
    });
    formData.append('roomId', roomId);
    
    const response = await axiosInstance.post(
      API_ENDPOINTS.CHAT.UPLOAD_FILE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Mobile] Error uploading file:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to upload file',
      data: null,
    };
  }
};

/**
 * Download file from chat (requires authentication)
 * @param {string} fileKey - S3 file key (from message metadata)
 * @param {string} roomId - Chat room ID
 * @returns {Promise<Blob>} File blob
 */
export const downloadFile = async (fileKey, roomId) => {
  try {
    // For React Native, we need to use fetch instead of axios for blob response
    const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    // Construct full URL
    const baseURL = API_CONFIG.BASE_URL;
    const endpoint = API_ENDPOINTS.CHAT.DOWNLOAD_FILE;
    const url = `${baseURL}${endpoint}?fileKey=${encodeURIComponent(fileKey)}&roomId=${encodeURIComponent(roomId)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Download failed: ${response.status} - ${errorText}`);
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[Mobile] Error downloading file:', error);
    throw error;
  }
};

// Export all functions
export default {
  getChatRooms,
  getChatRoomById,
  getChatRoomByContext,
  createChatRoom,
  getChatMessages,
  getRecentMessages,
  getUnreadCount,
  markAsRead,
  uploadFile,
  downloadFile,
};
