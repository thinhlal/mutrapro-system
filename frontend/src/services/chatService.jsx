import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Chat Service - REST API for Chat Service
 */

// ==================== Chat Rooms ====================

/**
 * Get all chat rooms for current user
 */
export const getChatRooms = async () => {
  const response = await axiosInstance.get(API_ENDPOINTS.CHAT.GET_ALL_ROOMS);
  return response.data;
};

/**
 * Get chat room by ID
 */
export const getChatRoomById = async roomId => {
  const response = await axiosInstance.get(API_ENDPOINTS.CHAT.GET_ROOM(roomId));
  return response.data;
};

/**
 * Get chat room by context (roomType and contextId)
 */
export const getChatRoomByContext = async (roomType, contextId) => {
  const response = await axiosInstance.get(
    API_ENDPOINTS.CHAT.GET_ROOM_BY_CONTEXT,
    {
      params: { roomType, contextId },
    }
  );
  return response.data;
};

/**
 * Create a new chat room (manual - for SUPPORT_CHAT or DIRECT_MESSAGE only)
 */
export const createChatRoom = async data => {
  const response = await axiosInstance.post(
    API_ENDPOINTS.CHAT.CREATE_ROOM,
    data
  );
  return response.data;
};

/**
 * Add participant to chat room
 */
export const addParticipant = async (roomId, data) => {
  const response = await axiosInstance.post(
    API_ENDPOINTS.CHAT.ADD_PARTICIPANT(roomId),
    data
  );
  return response.data;
};

/**
 * Remove participant from chat room
 */
export const removeParticipant = async (roomId, userId) => {
  const response = await axiosInstance.delete(
    API_ENDPOINTS.CHAT.REMOVE_PARTICIPANT(roomId, userId)
  );
  return response.data;
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
export const getMessages = async (
  roomId,
  page = 0,
  size = 50,
  contextType = null,
  contextId = null
) => {
  const params = { page, size };
  if (contextType) params.contextType = contextType;
  if (contextId) params.contextId = contextId;

  const response = await axiosInstance.get(
    API_ENDPOINTS.CHAT.GET_MESSAGES(roomId),
    { params }
  );
  return response.data;
};

/**
 * Get recent messages since a specific timestamp (for sync after reconnect)
 */
export const getRecentMessages = async (roomId, sinceTimestamp) => {
  const response = await axiosInstance.get(
    API_ENDPOINTS.CHAT.GET_RECENT_MESSAGES(roomId, sinceTimestamp)
  );
  return response.data;
};

/**
 * Get unread message count for a chat room
 */
export const getUnreadCount = async roomId => {
  const response = await axiosInstance.get(
    API_ENDPOINTS.CHAT.GET_UNREAD_COUNT(roomId)
  );
  return response.data;
};

/**
 * Mark messages as read in a chat room
 */
export const markAsRead = async roomId => {
  const response = await axiosInstance.post(
    API_ENDPOINTS.CHAT.MARK_AS_READ(roomId)
  );
  return response.data;
};

export default {
  getChatRooms,
  getChatRoomById,
  getChatRoomByContext,
  createChatRoom,
  addParticipant,
  removeParticipant,
  getMessages,
  getRecentMessages,
  getUnreadCount,
  markAsRead,
};
