import { useState, useEffect, useCallback, useRef } from 'react';
import chatService from '../services/chatService';
import websocketService from '../services/websocketService';
import { getItem } from '../services/localStorageService';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing chat functionality
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
  const messagesEndRef = useRef(null);
  const isInitialLoad = useRef(true);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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

        // Clear messages ngay lập tức khi bắt đầu load (pageNum = 0) để tránh flash messages cũ
        if (pageNum === 0) {
          setMessages([]);
        }

        const response = await chatService.getMessages(
          roomId,
          pageNum,
          50,
          contextType,
          contextId
        );

        const pageData = response.data || response;
        const messagesList = pageData.content || [];

        if (pageNum === 0) {
          // Lần đầu load: Backend trả về ASC (cũ nhất -> mới nhất)
          setMessages(messagesList);
          isInitialLoad.current = false;
          setTimeout(scrollToBottom, 100);
        } else {
          // Load more: Prepend older messages vào đầu
          setMessages(prev => [...messagesList, ...prev]);
        }

        setHasMore(!pageData.last);
        setPage(pageNum);
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Không thể tải tin nhắn');
        // Clear messages nếu load thất bại
        if (pageNum === 0) {
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [roomId, scrollToBottom]
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
   */
  const handleIncomingMessage = useCallback(
    message => {
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(m => m.messageId === message.messageId);
        if (exists) return prev;

        // Backend đảm bảo tin nhắn mới có sentAt mới nhất, chỉ cần append vào cuối
        // (Messages đã được sort ASC từ backend: cũ nhất -> mới nhất)
        return [...prev, message];
      });

      // Auto scroll to bottom for new messages
      setTimeout(scrollToBottom, 100);
    },
    [scrollToBottom]
  );

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
      if (!roomId || !content.trim()) return;

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

        // Send via WebSocket (backend will broadcast to all subscribers)
        websocketService.sendMessage(roomId, messageData);

        // Note: Don't add message here, wait for WebSocket broadcast
        // This ensures consistent message ordering across all clients
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Không thể gửi tin nhắn');
        throw error;
      } finally {
        setSending(false);
      }
    },
    [roomId]
  );

  /**
   * Clear messages when roomId changes
   */
  useEffect(() => {
    if (roomId) {
      // Clear messages và reset state khi chuyển sang room mới
      setMessages([]);
      setLoading(true);
      setHasMore(true);
      setPage(0);
      isInitialLoad.current = true;
    }
  }, [roomId]);

  /**
   * Connect to WebSocket and subscribe to room
   */
  useEffect(() => {
    if (!roomId) return;

    const token = getItem('accessToken');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    let subscribed = false;

    const setupWebSocket = async () => {
      try {
        // Connect if not already connected (e.g., after page refresh)
        // Note: WebSocket should already be connected after login via AuthContext
        if (!websocketService.isConnected()) {
          console.log('useChat - WebSocket not connected, connecting...');
          await websocketService.connect(token);
        } else {
          console.log(
            'useChat - WebSocket already connected, skipping connect'
          );
        }

        // Unsubscribe from previous room if any
        // Note: websocketService should handle this internally, but we do it explicitly here
        // Subscribe to room
        websocketService.subscribeToRoom(roomId, handleIncomingMessage);
        subscribed = true;
        setConnected(true);

        console.log(`✅ Subscribed to chat room: ${roomId}`);
      } catch (error) {
        console.error('Failed to setup WebSocket:', error);
        toast.error('Không thể kết nối chat');
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
  }, [roomId, handleIncomingMessage]);

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
    scrollToBottom,
    messagesEndRef,
  };
};

/**
 * Custom hook for managing chat rooms list
 * @param {string} roomType - Optional: Filter by room type (CONTRACT_CHAT, REQUEST_CHAT, etc.)
 */
export const useChatRooms = (roomType = null) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatService.getChatRooms(roomType);
      setRooms(response.data || []);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      toast.error('Không thể tải danh sách chat');
    } finally {
      setLoading(false);
    }
  }, [roomType]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return {
    rooms,
    loading,
    refreshRooms: loadRooms,
  };
};

export default useChat;
