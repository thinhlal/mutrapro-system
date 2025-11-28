import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { NotificationItem } from "../../components";
import { useNotifications } from "../../hooks/useNotifications";
import * as notificationApi from "../../services/notificationService";

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

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({
        filter,
        page: 0,
        limit: 50,
      });
      
      // Ensure response.data is array
      const notificationsData = response.data;
      if (Array.isArray(notificationsData)) {
        setAllNotifications(notificationsData);
      } else if (notificationsData && Array.isArray(notificationsData.content)) {
        // Handle paginated response
        setAllNotifications(notificationsData.content);
      } else {
        console.warn('[Mobile] Invalid notifications response format:', notificationsData);
        setAllNotifications([]);
      }
    } catch (error) {
      console.error('[Mobile] Error fetching notifications:', error);
      setAllNotifications([]); // Ensure it's always an array on error
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification.notificationId);
      
      // Update local list
      setAllNotifications((prev) =>
        Array.isArray(prev) 
          ? prev.map((n) =>
              n.notificationId === notification.notificationId
                ? { ...n, isRead: true }
                : n
            )
          : []
      );
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
            navigation.navigate('Chat', {
              screen: 'ChatRoom',
              params: { roomId },
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
        // Contract navigation: /contracts/{contractId}
        else if (url.startsWith('/contracts/') || url.startsWith('/contract/')) {
          const contractId = url.split('/').pop();
          if (contractId) {
            navigation.navigate('ContractDetail', {
              contractId: contractId,
            });
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
    // Update local list
    setAllNotifications((prev) =>
      Array.isArray(prev) ? prev.map((n) => ({ ...n, isRead: true })) : []
    );
  };

  const unreadCount = Array.isArray(allNotifications) 
    ? allNotifications.filter((n) => !n.isRead).length 
    : 0;

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
