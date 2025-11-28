import { useState, useEffect, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import notificationWebSocketService from '../services/notificationWebSocketService';
import * as notificationApi from '../services/notificationService';
import { getItem } from '../utils/storage';
import notificationSoundService from '../services/notificationSoundService';

// Shared state for notifications to avoid duplicate subscriptions
let sharedUnreadCount = 0;
let sharedNotifications = [];
const listeners = new Set();

/**
 * Custom hook for managing notifications (Mobile)
 * @param {Object} bannerManager - Reference to NotificationBannerManager for showing banners
 */
export const useNotifications = (bannerManager = null) => {
  const [unreadCount, setUnreadCount] = useState(sharedUnreadCount);
  const [notifications, setNotifications] = useState(sharedNotifications);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(notificationWebSocketService.isConnected());
  const isInitialized = useRef(false);
  const listenerIdRef = useRef(Math.random());

  /**
   * Update shared state and notify all listeners
   */
  const updateSharedState = useCallback((updates) => {
    if (updates.unreadCount !== undefined) {
      sharedUnreadCount = updates.unreadCount;
    }
    if (updates.notifications !== undefined) {
      sharedNotifications = updates.notifications;
    }
    
    // Notify all listeners
    listeners.forEach((listener) => {
      listener({ unreadCount: sharedUnreadCount, notifications: sharedNotifications });
    });
  }, []);

  /**
   * Fetch unread count
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadNotificationCount();
      console.log('[Mobile] Unread count response:', response);
      const count = response.data || 0;
      console.log('[Mobile] Setting unread count to:', count);
      updateSharedState({ unreadCount: count });
    } catch (error) {
      console.error('[Mobile] Failed to fetch unread count:', error);
    }
  }, [updateSharedState]);

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
      const notifs = response.data || [];
      updateSharedState({ notifications: notifs });
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
  }, [updateSharedState]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationApi.markNotificationAsRead(notificationId);

      // Update shared state
      const updatedNotifications = sharedNotifications.map((n) =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n
      );
      const newCount = Math.max(0, sharedUnreadCount - 1);
      
      updateSharedState({ 
        notifications: updatedNotifications,
        unreadCount: newCount
      });
    } catch (error) {
      console.error('[Mobile] Failed to mark as read:', error);
    }
  }, [updateSharedState]);

  /**
   * Mark all as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllNotificationsAsRead();

      // Update shared state
      const updatedNotifications = sharedNotifications.map((n) => ({ ...n, isRead: true }));
      updateSharedState({ 
        notifications: updatedNotifications,
        unreadCount: 0
      });

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
  }, [updateSharedState]);

  /**
   * Handle incoming real-time notification
   */
  const handleNewNotification = useCallback((notification) => {
    console.log('📬 [Mobile] ===== NEW NOTIFICATION RECEIVED =====');
    console.log('[Mobile] Notification data:', JSON.stringify(notification));

    // Update shared state - add to list and increase count
    const updatedNotifications = [notification, ...sharedNotifications].slice(0, 10);
    const newCount = sharedUnreadCount + 1;
    console.log('[Mobile] Unread count increased:', sharedUnreadCount, '→', newCount);
    console.log('[Mobile] Updated notifications list length:', updatedNotifications.length);
    
    updateSharedState({
      notifications: updatedNotifications,
      unreadCount: newCount
    });

    // Play notification sound
    console.log('[Mobile] Playing notification sound...');
    notificationSoundService.playNotificationSound().catch((err) => {
      console.error('[Mobile] Failed to play notification sound:', err);
    });

    // Show notification banner if bannerManager is available
    if (bannerManager && bannerManager.current) {
      console.log('[Mobile] ✅ Banner manager available - showing banner');
      bannerManager.current.showNotification(notification);
    } else {
      console.log('[Mobile] ⚠️ Banner manager NOT available - using Toast fallback');
      // Fallback to toast if no banner manager
      Toast.show({
        type: 'success',
        text1: notification.title || 'New Notification',
        text2: notification.content || notification.message,
        visibilityTime: 4000,
      });
    }
    console.log('[Mobile] ===== NOTIFICATION HANDLING COMPLETE =====');
  }, [bannerManager, updateSharedState]);

  /**
   * Setup listener for shared state updates
   */
  useEffect(() => {
    const listenerId = listenerIdRef.current;
    const listener = (state) => {
      setUnreadCount(state.unreadCount);
      setNotifications(state.notifications);
    };
    
    listeners.add(listener);
    console.log('[Mobile] Added listener, total listeners:', listeners.size);
    
    return () => {
      listeners.delete(listener);
      console.log('[Mobile] Removed listener, remaining listeners:', listeners.size);
    };
  }, []);

  /**
   * Setup WebSocket connection and audio (only once globally)
   */
  useEffect(() => {
    // Only setup WebSocket from the first instance (with bannerManager)
    if (!bannerManager || isInitialized.current) {
      console.log('[Mobile] Skipping WebSocket setup - already initialized or no banner manager');
      return;
    }

    const token = getItem('accessToken');
    if (!token) {
      console.warn('[Mobile] No authentication token found for notifications');
      return;
    }

    const setupWebSocket = async () => {
      try {
        // Initialize notification sound service
        await notificationSoundService.initialize();

        // Connect to WebSocket
        if (!notificationWebSocketService.isConnected()) {
          await notificationWebSocketService.connect(token);
        }

        // Subscribe to notifications (only once)
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
      if (isInitialized.current) {
        notificationWebSocketService.unsubscribeFromNotifications();
        notificationSoundService.cleanup();
        isInitialized.current = false;
      }
    };
  }, [handleNewNotification, bannerManager]);

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

