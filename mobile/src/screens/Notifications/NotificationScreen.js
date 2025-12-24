import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, STORAGE_KEYS } from "../../config/constants";
import { NotificationItem } from "../../components";
import { useNotifications } from "../../hooks/useNotifications";
import * as notificationApi from "../../services/notificationService";
import notificationWebSocketService from "../../services/notificationWebSocketService";
import { getItem } from "../../utils/storage";

const NotificationScreen = ({ navigation }) => {
  // Get notification state - create separate instance for this screen
  const {
    notifications: realtimeNotifications,
    unreadCount: realtimeUnreadCount,
    connected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [apiNotifications, setApiNotifications] = useState([]); // Store API notifications separately
  
  // Track processed notification IDs to detect new ones
  const processedNotificationIdsRef = useRef(new Set());
  const lastRealtimeNotificationsRef = useRef([]);
  const wsSubscriptionRef = useRef(null);

  // Merge API notifications with real-time notifications and apply filter
  const mergeAndFilterNotifications = useCallback((apiNotifs, realtimeNotifs, currentFilter) => {
    // Create a map of all notification IDs to avoid duplicates
    const allNotifMap = new Map();
    const merged = [];

    // First, add all real-time notifications (they are the most up-to-date)
    // Real-time notifications are prioritized because they are the latest
    if (Array.isArray(realtimeNotifs) && realtimeNotifs.length > 0) {
      realtimeNotifs.forEach(realtimeNotif => {
        if (!allNotifMap.has(realtimeNotif.notificationId)) {
          merged.push(realtimeNotif);
          allNotifMap.set(realtimeNotif.notificationId, true);
        }
      });
    }

    // Then, add API notifications that are not in real-time list
    // This ensures we have all notifications, not just the latest 10 from real-time
    if (Array.isArray(apiNotifs) && apiNotifs.length > 0) {
      apiNotifs.forEach(apiNotif => {
        if (!allNotifMap.has(apiNotif.notificationId)) {
          merged.push(apiNotif);
          allNotifMap.set(apiNotif.notificationId, true);
        } else {
          // If notification exists in both, update with API data but keep real-time priority for status
          const existingIndex = merged.findIndex(n => n.notificationId === apiNotif.notificationId);
          if (existingIndex !== -1) {
            // Merge: use API data but preserve real-time status if it's more recent
            merged[existingIndex] = { ...apiNotif, ...merged[existingIndex] };
          }
        }
      });
    }

    // Sort by createdAt (newest first) to ensure latest notifications appear first
    merged.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0);
      const dateB = new Date(b.createdAt || b.timestamp || 0);
      return dateB - dateA;
    });

    // Apply filter
    let filteredNotifications = merged;
    if (currentFilter === 'unread') {
      // Filter for unread: isRead is falsy (false, null, undefined)
      filteredNotifications = merged.filter(n => !n.isRead);
    } else if (currentFilter === 'read') {
      // Filter for read: isRead is explicitly true
      filteredNotifications = merged.filter(n => n.isRead === true);
    }
    // filter === 'all' means show all, no filtering needed
    
    console.log(`[Mobile] Filter: ${currentFilter}, API: ${apiNotifs?.length || 0}, Realtime: ${realtimeNotifs?.length || 0}, Merged: ${merged.length}, Filtered: ${filteredNotifications.length}`);
    return filteredNotifications;
  }, []);

  // Fetch all notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({
        filter,
        page: 0,
        limit: 100, // Increase limit to get all notifications for client-side filtering
      });
      
      // Ensure response.data is array
      const notificationsData = response.data;
      let notifications = [];
      
      if (Array.isArray(notificationsData)) {
        notifications = notificationsData;
      } else if (notificationsData && Array.isArray(notificationsData.content)) {
        // Handle paginated response
        notifications = notificationsData.content;
      } else {
        console.warn('[Mobile] Invalid notifications response format:', notificationsData);
        notifications = [];
      }
      
      // Store API notifications
      setApiNotifications(notifications);
      
      // Update processed IDs from API notifications
      notifications.forEach(n => {
        processedNotificationIdsRef.current.add(n.notificationId);
      });
      
      // Merge with real-time notifications and update state
      const merged = mergeAndFilterNotifications(notifications, realtimeNotifications, filter);
      setAllNotifications([...merged]);
    } catch (error) {
      console.error('[Mobile] Error fetching notifications:', error);
      setApiNotifications([]);
      // Still merge with real-time notifications even on error
      const merged = mergeAndFilterNotifications([], realtimeNotifications, filter);
      setAllNotifications(merged);
    } finally {
      setLoading(false);
    }
  }, [filter, realtimeNotifications, mergeAndFilterNotifications]);

  // Sync with real-time notifications when they change
  // This effect ensures new notifications appear immediately when received via WebSocket
  useEffect(() => {
    // Create a stable key from realtimeNotifications to detect changes
    // Use JSON.stringify to detect any changes in the array
    const realtimeKey = realtimeNotifications 
      ? JSON.stringify(realtimeNotifications.map(n => n.notificationId))
      : '';
    const lastKey = JSON.stringify(lastRealtimeNotificationsRef.current.map(n => n.notificationId));
    
    const hasChanged = realtimeKey !== lastKey;
    
    console.log('[Mobile] Real-time notifications effect triggered:', {
      hasChanged,
      realtimeCount: realtimeNotifications?.length || 0,
      apiCount: apiNotifications?.length || 0,
      filter,
      realtimeKey: realtimeKey.substring(0, 50),
      lastKey: lastKey.substring(0, 50)
    });
    
    // Always merge to ensure UI is up to date
    // This ensures new notifications appear immediately even if API hasn't loaded yet
    const merged = mergeAndFilterNotifications(apiNotifications, realtimeNotifications, filter);
    
    console.log('[Mobile] Merged notifications count:', merged.length);
    
    // Always update - React will handle optimization
    // Create new array reference to ensure re-render
    setAllNotifications([...merged]);
    
    // Update last known real-time notifications (create new array to track changes)
    lastRealtimeNotificationsRef.current = realtimeNotifications ? [...realtimeNotifications] : [];
  }, [realtimeNotifications, filter, apiNotifications, mergeAndFilterNotifications]);
  
  // Subscribe directly to WebSocket to receive notifications immediately
  // This bypasses the hook and updates UI directly
  useEffect(() => {
    if (!connected) return;
    
    const handleDirectNotification = (notification) => {
      console.log('[Mobile] 🎉 Direct WebSocket notification in NotificationScreen:', notification.notificationId);
      
      // Immediately add to API notifications and merge
      setApiNotifications(prev => {
        const exists = prev.some(n => n.notificationId === notification.notificationId);
        if (!exists) {
          const updated = [notification, ...prev];
          // Also update allNotifications immediately
          const merged = mergeAndFilterNotifications(updated, realtimeNotifications, filter);
          setAllNotifications([...merged]);
          return updated;
        }
        return prev;
      });
    };

    // Subscribe if WebSocket is connected
    if (notificationWebSocketService.isConnected()) {
      console.log('[Mobile] Subscribing directly to WebSocket in NotificationScreen');
      const subscription = notificationWebSocketService.subscribeToNotifications(handleDirectNotification);
      wsSubscriptionRef.current = subscription;
    }

    return () => {
      // Note: We don't unsubscribe here to avoid breaking the main subscription
      // The WebSocket service manages subscriptions
      wsSubscriptionRef.current = null;
    };
  }, [connected, filter, realtimeNotifications, mergeAndFilterNotifications]);

  // Fetch notifications on mount and when filter changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reload notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Always fetch to ensure we have latest data from API
      // Real-time updates will automatically sync via useEffect above
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread - Optimistic update first
    if (!notification.isRead) {
      // Optimistic update: Update local state immediately
      setAllNotifications((prev) => {
        const updated = Array.isArray(prev) 
          ? prev.map((n) =>
              n.notificationId === notification.notificationId
                ? { ...n, isRead: true }
                : n
            )
          : [];
        
        // If filtering by unread, remove from list
        if (filter === 'unread') {
          return updated.filter((n) => n.notificationId !== notification.notificationId);
        }
        return updated;
      });
      
      // Then call API
      try {
        await markAsRead(notification.notificationId);
        // Refresh to ensure sync with backend
        fetchNotifications();
      } catch (error) {
        // Revert on error
        setAllNotifications((prev) => {
          const reverted = Array.isArray(prev) 
            ? prev.map((n) =>
                n.notificationId === notification.notificationId
                  ? { ...n, isRead: false }
                  : n
              )
            : [];
          return reverted;
        });
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate based on actionUrl
    if (notification.actionUrl) {
      const url = notification.actionUrl;
      console.log('[Mobile] Navigate to:', url);
      
      try {
        // Parse the URL and navigate to appropriate screen
        // Format: /path/id or /path
        
        // Chat navigation: /chat/{roomId}
        if (url.startsWith('/chat/')) {
          const roomId = url.split('/chat/')[1];
          if (roomId) {
            // Navigate to Chat tab and push ChatRoom
            // First navigate to Chat tab to ensure ChatList is the initial screen
            // Then push ChatRoom on top
            // This ensures proper back navigation to ChatList
            navigation.navigate('Chat', {
              screen: 'ChatList',
            });
            // Use requestAnimationFrame to ensure ChatList is mounted before pushing ChatRoom
            requestAnimationFrame(() => {
              navigation.navigate('Chat', {
                screen: 'ChatRoom',
                params: { roomId, fromNotification: true },
              });
            });
          }
        }
        // Request navigation: /requests/{requestId}
        else if (url.startsWith('/requests/') || url.startsWith('/request/')) {
          const requestId = url.split('/').pop();
          if (requestId) {
            navigation.navigate('Home', {
              screen: 'RequestDetail',
              params: { requestId },
            });
          }
        }
        // Contract navigation: /contracts/{contractId} or /contracts/{contractId}/milestones/{milestoneId}/deliveries
        else if (url.startsWith('/contracts/') || url.startsWith('/contract/')) {
          // Check if this is a milestone deliveries route
          // Format: /contracts/{contractId}/milestones/{milestoneId}/deliveries
          const deliveriesMatch = url.match(/\/contracts\/([^\/]+)\/milestones\/([^\/]+)\/deliveries/);
          if (deliveriesMatch) {
            const contractId = deliveriesMatch[1];
            const milestoneId = deliveriesMatch[2];
            // Validate that contractId and milestoneId are not invalid values
            if (contractId && milestoneId && 
                contractId !== 'deliveries' && milestoneId !== 'deliveries' &&
                contractId !== 'contracts' && milestoneId !== 'contracts' &&
                contractId !== 'contract' && milestoneId !== 'contract') {
              navigation.navigate('MilestoneDeliveries', {
                contractId: contractId,
                milestoneId: milestoneId,
              });
            } else {
              console.warn('[Mobile] Invalid milestone deliveries URL format:', url);
            }
          } else {
            // Regular contract detail route: /contracts/{contractId}
            const contractId = url.split('/').pop();
            // Validate that contractId is not invalid values
            if (contractId && 
                contractId !== 'contracts' && 
                contractId !== 'contract' && 
                contractId !== 'deliveries' &&
                contractId !== 'milestones') {
              navigation.navigate('ContractDetail', {
                contractId: contractId,
              });
            } else {
              console.warn('[Mobile] Invalid contract URL format:', url);
            }
          }
        }
        // Service navigation: /services/{serviceId}
        else if (url.startsWith('/services/') || url.startsWith('/service/')) {
          const serviceId = url.split('/').pop();
          if (serviceId) {
            navigation.navigate('Home', {
              screen: 'ServiceDetail',
              params: { serviceId },
            });
          }
        }
        // Profile navigation: /profile
        else if (url.startsWith('/profile')) {
          navigation.navigate('Profile');
        }
        // Default: just log it
        else {
          console.log('[Mobile] Unhandled actionUrl:', url);
        }
      } catch (error) {
        console.error('[Mobile] Error navigating from notification:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // Update local list - mark all as read
    setAllNotifications((prev) =>
      Array.isArray(prev) ? prev.map((n) => ({ ...n, isRead: true })) : []
    );
    // Refresh to get updated list
    await fetchNotifications();
  };

  // Use unreadCount from useNotifications hook (realtime) or calculate from allNotifications
  // Prefer realtimeUnreadCount if available, otherwise calculate from allNotifications
  const unreadCount = realtimeUnreadCount > 0 
    ? realtimeUnreadCount 
    : (Array.isArray(allNotifications) 
        ? allNotifications.filter((n) => !n.isRead).length 
        : 0);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.statusRow}>
            {unreadCount > 0 && (
              <Text style={styles.unreadCountText}>
                {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
              </Text>
            )}
            {connected && (
              <View style={styles.connectedIndicator}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Live</Text>
              </View>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Ionicons name="checkmark-done" size={20} color={COLORS.primary} />
            <Text style={styles.markAllButtonText}>Mark all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "unread" && styles.filterTabActive]}
          onPress={() => setFilter("unread")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "unread" && styles.filterTabTextActive,
            ]}
          >
            Unread
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "read" && styles.filterTabActive]}
          onPress={() => setFilter("read")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "read" && styles.filterTabTextActive,
            ]}
          >
            Read
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={80} color={COLORS.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        {filter === "unread"
          ? "You're all caught up! No unread notifications."
          : filter === "read"
          ? "No read notifications yet."
          : "You don't have any notifications yet."}
      </Text>
    </View>
  );

  // Format notification to match NotificationItem component
  const formatNotification = (notification) => {
    // Map notification type to icon and color
    // Based on backend notification types
    const typeMap = {
      // Service/Request related
      SERVICE_UPDATE: { icon: 'musical-notes', color: COLORS.primary },
      SERVICE_COMPLETE: { icon: 'checkmark-circle', color: COLORS.success },
      REQUEST_ASSIGNED: { icon: 'person-add', color: COLORS.primary },
      REQUEST_UPDATED: { icon: 'refresh', color: COLORS.info },
      
      // Payment related
      PAYMENT: { icon: 'card', color: COLORS.success },
      PAYMENT_SUCCESS: { icon: 'card', color: COLORS.success },
      PAYMENT_FAILED: { icon: 'close-circle', color: COLORS.error },
      
      // Chat/Message related
      MESSAGE: { icon: 'chatbubble', color: COLORS.info },
      CHAT_ROOM_CREATED: { icon: 'chatbubbles', color: COLORS.info },
      NEW_MESSAGE: { icon: 'mail', color: COLORS.info },
      
      // Contract related
      CONTRACT_CREATED: { icon: 'document-text', color: COLORS.primary },
      CONTRACT_SIGNED: { icon: 'checkmark-done', color: COLORS.success },
      CONTRACT_UPDATED: { icon: 'create', color: COLORS.warning },
      
      // Other
      REMINDER: { icon: 'time', color: COLORS.warning },
      SYSTEM: { icon: 'information-circle', color: COLORS.info },
    };

    const notifType = notification.notificationType || notification.type;
    const type = typeMap[notifType] || { icon: 'notifications', color: COLORS.primary };

    return {
      ...notification,
      icon: type.icon,
      iconColor: type.color,
      message: notification.content || notification.message,
      timestamp: notification.createdAt || notification.timestamp, // Add timestamp for NotificationItem
    };
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={Array.isArray(allNotifications) ? allNotifications : []}
        keyExtractor={(item) => item.notificationId}
        renderItem={({ item }) => (
          <NotificationItem
            notification={formatNotification(item)}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={
          (Array.isArray(allNotifications) && allNotifications.length === 0) 
            ? styles.emptyListContent 
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadCountText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  connectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs / 2,
  },
  connectedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  markAllButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
    marginLeft: SPACING.xs / 2,
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderRadius: BORDER_RADIUS.sm,
  },
  filterTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTabText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default NotificationScreen;
