import api from './api';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Chat Service
 * Handles all chat-related API calls
 */

/**
 * Get all conversations for the current user
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise} API response with conversations array
 */
export const getChatConversations = async (params = {}) => {
  try {
    const { page = 1, limit = 20 } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await api.get(
      `${API_ENDPOINTS.CHAT.GET_CONVERSATIONS}?${queryParams.toString()}`
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch conversations',
      data: null,
    };
  }
};

/**
 * Get messages for a specific conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise} API response with messages array
 */
export const getChatMessages = async (conversationId, params = {}) => {
  try {
    const { page = 1, limit = 50 } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await api.get(
      `${API_ENDPOINTS.CHAT.GET_MESSAGES(conversationId)}?${queryParams.toString()}`
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch messages',
      data: null,
    };
  }
};

/**
 * Send a message in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} messageData - Message data
 * @param {string} messageData.text - Message text
 * @param {string} messageData.type - Message type (text, image, file, etc.)
 * @param {Array} messageData.attachments - Optional attachments
 * @returns {Promise} API response with sent message
 */
export const sendChatMessage = async (conversationId, messageData) => {
  try {
    const response = await api.post(
      API_ENDPOINTS.CHAT.SEND_MESSAGE(conversationId),
      messageData
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to send message',
      data: null,
    };
  }
};

/**
 * Create a new conversation
 * @param {Object} conversationData - Conversation data
 * @param {string} conversationData.recipientId - Recipient user ID
 * @param {string} conversationData.initialMessage - Optional initial message
 * @returns {Promise} API response with new conversation
 */
export const createConversation = async (conversationData) => {
  try {
    const response = await api.post(
      API_ENDPOINTS.CHAT.CREATE_CONVERSATION,
      conversationData
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to create conversation',
      data: null,
    };
  }
};

/**
 * Mark message as read
 * @param {string} messageId - Message ID
 * @returns {Promise} API response
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const response = await api.patch(
      API_ENDPOINTS.CHAT.MARK_MESSAGE_AS_READ(messageId)
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to mark message as read',
      data: null,
    };
  }
};

/**
 * Mark all messages in a conversation as read
 * @param {string} conversationId - Conversation ID
 * @returns {Promise} API response
 */
export const markConversationAsRead = async (conversationId) => {
  try {
    const response = await api.patch(
      API_ENDPOINTS.CHAT.MARK_CONVERSATION_AS_READ(conversationId)
    );
    
    return {
      status: 'success',
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to mark conversation as read',
      data: null,
    };
  }
};

/**
 * Get unread message count
 * @returns {Promise} API response with count
 */
export const getUnreadMessageCount = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.CHAT.GET_UNREAD_COUNT);
    
    return {
      status: 'success',
      data: response.data.count || 0,
    };
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to fetch unread count',
      data: 0,
    };
  }
};

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @returns {Promise} API response
 */
export const deleteMessage = async (messageId) => {
  try {
    const response = await api.delete(
      API_ENDPOINTS.CHAT.DELETE_MESSAGE(messageId)
    );
    
    return {
      status: 'success',
      data: response.data,
    };
  } catch (error) {
    console.error('Error deleting message:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to delete message',
      data: null,
    };
  }
};

/**
 * Delete a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise} API response
 */
export const deleteConversation = async (conversationId) => {
  try {
    const response = await api.delete(
      API_ENDPOINTS.CHAT.DELETE_CONVERSATION(conversationId)
    );
    
    return {
      status: 'success',
      data: response.data,
    };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to delete conversation',
      data: null,
    };
  }
};

/**
 * Upload file/image for chat
 * @param {Object} file - File object from document picker or camera
 * @returns {Promise} API response with file URL
 */
export const uploadChatFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType || 'application/octet-stream',
      name: file.name || 'file',
    });

    const response = await api.post(
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
    console.error('Error uploading file:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to upload file',
      data: null,
    };
  }
};

/**
 * Send typing indicator
 * @param {string} conversationId - Conversation ID
 * @param {boolean} isTyping - Typing status
 * @returns {Promise} API response
 */
export const sendTypingIndicator = async (conversationId, isTyping) => {
  try {
    const response = await api.post(
      API_ENDPOINTS.CHAT.TYPING_INDICATOR(conversationId),
      { isTyping }
    );
    
    return {
      status: 'success',
      data: response.data,
    };
  } catch (error) {
    console.error('Error sending typing indicator:', error);
    return {
      status: 'error',
      message: error.response?.data?.message || 'Failed to send typing indicator',
      data: null,
    };
  }
};

