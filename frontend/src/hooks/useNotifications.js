import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';
import notificationWebSocketService from '../services/notificationWebSocketService';
import { getItem } from '../services/localStorageService';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing notifications
 */
export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const isInitialized = useRef(false);

  /**
   * Fetch unread count
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  /**
   * Fetch latest notifications
   */
  const fetchLatestNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getLatestNotifications(10);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async notificationId => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        )
      );

      // Decrease unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  /**
   * Mark all as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      toast.success('Đã đánh dấu tất cả thông báo');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Không thể đánh dấu tất cả');
    }
  }, []);

  /**
   * Handle incoming real-time notification
   */
  const handleNewNotification = useCallback(notification => {
    console.log('📬 New notification received:', notification);

    // Add to list
    setNotifications(prev => [notification, ...prev].slice(0, 10));

    // Increase unread count
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    toast.success(notification.title, {
      duration: 4000,
      icon: '🔔',
    });
  }, []);

  /**
   * Setup WebSocket connection
   */
  useEffect(() => {
    if (isInitialized.current) return;

    const token = getItem('accessToken');
    if (!token) {
      console.warn('No authentication token found');
      return;
    }

    const setupWebSocket = async () => {
      try {
        // Connect to WebSocket
        if (!notificationWebSocketService.isConnected()) {
          await notificationWebSocketService.connect(token);
        }

        // Subscribe to notifications
        notificationWebSocketService.subscribeToNotifications(
          handleNewNotification
        );
        setConnected(true);

        console.log('✅ Notification WebSocket setup complete');
        isInitialized.current = true;
      } catch (error) {
        console.error('Failed to setup notification WebSocket:', error);
        setConnected(false);
      }
    };

    setupWebSocket();

    // Cleanup
    return () => {
      notificationWebSocketService.unsubscribeFromNotifications();
    };
  }, [handleNewNotification]);

  /**
   * Fetch initial data
   */
  useEffect(() => {
    fetchUnreadCount();
    fetchLatestNotifications();

    // Periodic refresh (every 30 seconds) - backup for WebSocket
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchLatestNotifications]);

  return {
    unreadCount,
    notifications,
    loading,
    connected,
    fetchLatestNotifications,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
