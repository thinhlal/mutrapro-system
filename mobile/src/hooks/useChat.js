import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Toast from 'react-native-toast-message';
import websocketService from '../services/websocketService';
import { getItem } from '../utils/storage';
import { STORAGE_KEYS } from '../config/constants';

// Import API functions (will update chatService.js later)
import * as chatApi from '../services/chatService';

/**
 * Custom hook for managing chat conversation (Mobile)
 * @param {string} roomId - Chat room ID
 * @param {boolean} autoLoad - Whether to auto-load messages on mount (default: true)
 */
export const useChat = (roomId, autoLoad = true) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const isInitialLoad = useRef(true);

  /**
   * Load messages from server
   * @param {number} pageNum - Page number
   * @param {string} contextType - Optional: Filter by context type
   * @param {string} contextId - Optional: Filter by context ID
   */
  const loadMessages = useCallback(
    async (pageNum = 0, contextType = null, contextId = null) => {
      if (!roomId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Clear messages immediately when starting load (pageNum = 0) to avoid flash of old messages
        if (pageNum === 0) {
          setMessages([]);
        }
        
        const response = await chatApi.getChatMessages(roomId, {
          page: pageNum,
          size: 50,
          contextType,
          contextId,
        });

        const pageData = response.data || response;
        const messagesList = pageData.content || pageData || [];

        if (pageNum === 0) {
          // First load: messages from backend are ASC (oldest -> newest)
          setMessages(messagesList);
          isInitialLoad.current = false;
        } else {
          // Load more: Prepend older messages
          setMessages((prev) => [...messagesList, ...prev]);
        }

        setHasMore(!pageData.last);
        setPage(pageNum);
      } catch (error) {
        console.error('[Mobile] Failed to load messages:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not load messages',
        });
        // Clear messages if load failed
        if (pageNum === 0) {
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [roomId]
  );

  /**
   * Load more messages (pagination)
   * @param {string} contextType - Optional: Filter by context type
   * @param {string} contextId - Optional: Filter by context ID
   */
  const loadMoreMessages = useCallback(
    (contextType = null, contextId = null) => {
      if (!loading && hasMore) {
        loadMessages(page + 1, contextType, contextId);
      }
    },
    [loading, hasMore, page, loadMessages]
  );

  /**
   * Handle incoming real-time message
   * Use ref to keep callback stable and avoid re-subscriptions
   */
  const handleIncomingMessageRef = useRef();
  
  // Update ref with latest callback
  handleIncomingMessageRef.current = (message) => {
    console.log('📨 [Mobile] New message received:', message);
    console.log('📨 [Mobile] Message ID:', message?.messageId);
    console.log('📨 [Mobile] Message content:', message?.content);

    setMessages((prev) => {
      console.log('📨 [Mobile] Current messages count:', prev.length);
      
      // Check if message already exists
      const exists = prev.some((m) => m.messageId === message.messageId);
      if (exists) {
        console.log('⚠️ [Mobile] Message already exists, skipping');
        return prev;
      }

      console.log('✅ [Mobile] Adding new message to list');
      // Append new message to end
      return [...prev, message];
    });
  };

  // Stable callback that calls the ref
  const handleIncomingMessage = useCallback((message) => {
    handleIncomingMessageRef.current?.(message);
  }, []);

  /**
   * Send a message via WebSocket
   * @param {string} content - Message content
   * @param {string} messageType - Message type (default: 'TEXT')
   * @param {object} metadata - Optional metadata
   * @param {string} contextType - Optional: Message context type (e.g., 'GENERAL', 'REVISION_REQUEST')
   * @param {string} contextId - Optional: Message context ID (e.g., revisionRequestId)
   */
  const sendMessage = useCallback(
    async (
      content,
      messageType = 'TEXT',
      metadata = null,
      contextType = null,
      contextId = null
    ) => {
      if (!roomId || !content.trim()) {
        console.log('⚠️ [Mobile] Cannot send message: roomId or content missing');
        return;
      }

      try {
        setSending(true);

        const messageData = {
          roomId,
          content: content.trim(),
          messageType,
          metadata,
        };

        // Add contextType and contextId if provided
        // For CONTRACT_CHAT general chat: contextType = 'GENERAL', contextId = null
        if (contextType) {
          messageData.contextType = contextType;
          if (contextId) {
            messageData.contextId = contextId;
          }
        }

        console.log('📤 [Mobile] Sending message:', messageData);

        // Send via WebSocket
        websocketService.sendMessage(roomId, messageData);
        
        console.log('✅ [Mobile] Message send request completed');
        // Note: Don't add message here, wait for WebSocket broadcast
      } catch (error) {
        console.error('[Mobile] Failed to send message:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not send message',
        });
        throw error;
      } finally {
        setSending(false);
      }
    },
    [roomId]
  );

  /**
   * Connect to WebSocket and subscribe to room
   */
  useEffect(() => {
    if (!roomId) return;

    let subscribed = false;

    const setupWebSocket = async () => {
      try {
        // Get token
        const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) {
          console.error('[Mobile] No authentication token found');
          return;
        }

        // Connect if not already connected
        if (!websocketService.isConnected()) {
          console.log('[Mobile] WebSocket not connected, connecting...');
          await websocketService.connect(token);
        } else {
          console.log('[Mobile] WebSocket already connected');
        }

        // Subscribe to room
        websocketService.subscribeToRoom(roomId, handleIncomingMessage);
        subscribed = true;
        setConnected(true);

        console.log(`✅ [Mobile] Subscribed to chat room: ${roomId}`);
      } catch (error) {
        console.error('[Mobile] Failed to setup WebSocket:', error);
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: 'Could not connect to chat',
        });
        setConnected(false);
      }
    };

    setupWebSocket();

    // Cleanup
    return () => {
      if (subscribed) {
        websocketService.unsubscribeFromRoom(roomId);
      }
    };
  }, [roomId]); // Only roomId - handleIncomingMessage is stable with useCallback

  /**
   * Load initial messages (only if autoLoad is true)
   */
  useEffect(() => {
    if (roomId && autoLoad) {
      loadMessages(0);
    }
  }, [roomId, autoLoad, loadMessages]);

  return {
    messages,
    loading,
    sending,
    connected,
    hasMore,
    sendMessage,
    loadMessages,
    loadMoreMessages,
  };
};

/**
 * Custom hook for managing chat rooms list
 */
export const useChatRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      // Will call updated API
      const response = await chatApi.getChatRooms();
      setRooms(response.data || []);
    } catch (error) {
      console.error('[Mobile] Failed to load chat rooms:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load chat rooms',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return {
    rooms,
    loading,
    refreshRooms: loadRooms,
  };
};

/**
 * Custom hook for getting total unread messages count across all rooms
 */
export const useUnreadMessagesCount = () => {
  const { rooms } = useChatRooms();
  
  const totalUnread = useMemo(() => {
    if (!Array.isArray(rooms)) return 0;
    return rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
  }, [rooms]);

  return totalUnread;
};

export default useChat;

