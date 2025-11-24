import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

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
 */
export const getChatMessages = async (roomId, params = {}) => {
  try {
    const { page = 0, size = 50 } = params;
    
    const response = await axiosInstance.get(
      API_ENDPOINTS.CHAT.GET_MESSAGES(roomId),
      {
        params: { page, size },
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
};
