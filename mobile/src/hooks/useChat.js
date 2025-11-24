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
 */
export const useChat = (roomId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const isInitialLoad = useRef(true);

  /**
   * Load messages from server
   */
  const loadMessages = useCallback(
    async (pageNum = 0) => {
      if (!roomId) return;

      try {
        setLoading(true);
        // Will call updated API
        const response = await chatApi.getChatMessages(roomId, {
          page: pageNum,
          size: 50,
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
      } finally {
        setLoading(false);
      }
    },
    [roomId]
  );

  /**
   * Load more messages (pagination)
   */
  const loadMoreMessages = useCallback(() => {
    if (!loading && hasMore) {
      loadMessages(page + 1);
    }
  }, [loading, hasMore, page, loadMessages]);

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
   */
  const sendMessage = useCallback(
    async (content, messageType = 'TEXT', metadata = null) => {
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
   * Load initial messages
   */
  useEffect(() => {
    if (roomId) {
      loadMessages(0);
    }
  }, [roomId, loadMessages]);

  return {
    messages,
    loading,
    sending,
    connected,
    hasMore,
    sendMessage,
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

