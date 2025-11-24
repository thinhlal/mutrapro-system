import { useState, useEffect, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import notificationWebSocketService from '../services/notificationWebSocketService';
import * as notificationApi from '../services/notificationService';
import { getItem } from '../utils/storage';

/**
 * Custom hook for managing notifications (Mobile)
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
      const response = await notificationApi.getUnreadNotificationCount();
      setUnreadCount(response.data || 0);
    } catch (error) {
      console.error('[Mobile] Failed to fetch unread count:', error);
    }
  }, []);

  /**
   * Fetch latest notifications
   */
  const fetchLatestNotifications = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      // Get latest notifications from API
      const response = await notificationApi.getNotifications({
        page: 0,
        limit,
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('[Mobile] Failed to fetch notifications:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load notifications',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationApi.markNotificationAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        Array.isArray(prev) 
          ? prev.map((n) =>
              n.notificationId === notificationId ? { ...n, isRead: true } : n
            )
          : []
      );

      // Decrease unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Mobile] Failed to mark as read:', error);
    }
  }, []);

  /**
   * Mark all as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllNotificationsAsRead();

      // Update local state
      setNotifications((prev) => 
        Array.isArray(prev) ? prev.map((n) => ({ ...n, isRead: true })) : []
      );
      setUnreadCount(0);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('[Mobile] Failed to mark all as read:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not mark all as read',
      });
    }
  }, []);

  /**
   * Handle incoming real-time notification
   */
  const handleNewNotification = useCallback((notification) => {
    console.log('📬 [Mobile] New notification received:', notification);

    // Add to list (keep only latest 10)
    setNotifications((prev) => 
      [notification, ...(Array.isArray(prev) ? prev : [])].slice(0, 10)
    );

    // Increase unread count
    setUnreadCount((prev) => prev + 1);

    // Show toast notification
    Toast.show({
      type: 'success',
      text1: notification.title || 'New Notification',
      text2: notification.content || notification.message,
      visibilityTime: 4000,
    });
  }, []);

  /**
   * Setup WebSocket connection
   */
  useEffect(() => {
    if (isInitialized.current) return;

    const token = getItem('accessToken');
    if (!token) {
      console.warn('[Mobile] No authentication token found for notifications');
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

        console.log('✅ [Mobile] Notification WebSocket setup complete');
        isInitialized.current = true;
      } catch (error) {
        console.error('[Mobile] Failed to setup notification WebSocket:', error);
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

