import { useState, useEffect, useCallback, useRef } from 'react';
import chatService from '../services/chatService';
import websocketService from '../services/websocketService';
import { getItem } from '../services/localStorageService';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing chat functionality
 * @param {string} roomId - Chat room ID
 */
export const useChat = roomId => {
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
   */
  const loadMessages = useCallback(
    async (pageNum = 0) => {
      if (!roomId) return;

      try {
        setLoading(true);
        const response = await chatService.getMessages(roomId, pageNum, 50);

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
      } finally {
        setLoading(false);
      }
    },
    [roomId, scrollToBottom]
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
   */
  const sendMessage = useCallback(
    async (content, messageType = 'TEXT', metadata = null) => {
      if (!roomId || !content.trim()) return;

      try {
        setSending(true);

        const messageData = {
          roomId,
          content: content.trim(),
          messageType,
          metadata,
        };

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
        // Connect if not already connected
        if (!websocketService.isConnected()) {
          await websocketService.connect(token);
        }

        // Subscribe to room
        websocketService.subscribeToRoom(roomId, handleIncomingMessage);
        subscribed = true;
        setConnected(true);

        console.log(`✅ Connected to chat room: ${roomId}`);
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
    scrollToBottom,
    messagesEndRef,
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
      const response = await chatService.getChatRooms();
      setRooms(response.data || []);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
      toast.error('Không thể tải danh sách chat');
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

export default useChat;
