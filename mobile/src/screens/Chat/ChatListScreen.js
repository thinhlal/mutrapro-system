import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { useChatRooms } from "../../hooks/useChat";

const ChatListScreen = ({ navigation }) => {
  const { rooms, loading, refreshRooms } = useChatRooms();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshRooms();
    setRefreshing(false);
  }, [refreshRooms]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now - messageTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageTime.toLocaleDateString();
  };

  const getRoomTypeColor = (roomType) => {
    const colors = {
      REQUEST_CHAT: COLORS.primary,
      PROJECT_CHAT: COLORS.success,
      REVISION_CHAT: COLORS.warning,
      SUPPORT_CHAT: '#722ed1',
      DIRECT_MESSAGE: '#eb2f96',
    };
    return colors[roomType] || COLORS.primary;
  };

  const getRoomTypeText = (roomType) => {
    const types = {
      REQUEST_CHAT: 'Request',
      PROJECT_CHAT: 'Project',
      REVISION_CHAT: 'Revision',
      SUPPORT_CHAT: 'Support',
      DIRECT_MESSAGE: 'Message',
    };
    return types[roomType] || roomType;
  };

  const renderConversationItem = ({ item }) => {
    const isUnread = (item.unreadCount || 0) > 0;
    const roomColor = getRoomTypeColor(item.roomType);

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.conversationItemUnread]}
        onPress={() => navigation.navigate("ChatRoom", { room: item })}
        activeOpacity={0.7}
      >
        {/* Avatar/Icon for Room Type */}
        <View style={[styles.avatarContainer, { backgroundColor: roomColor + '20' }]}>
          <Ionicons name="chatbubbles" size={28} color={roomColor} />
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.userName, isUnread && styles.userNameUnread]}
              numberOfLines={1}
            >
              {item.roomName || 'Chat Room'}
            </Text>
            <Text style={styles.timestamp}>
              {getTimeAgo(item.updatedAt || item.createdAt)}
            </Text>
          </View>

          <View style={styles.messagePreview}>
            <View style={styles.roomTypeContainer}>
              <Text style={[styles.roomType, { color: roomColor }]}>
                {getRoomTypeText(item.roomType)}
              </Text>
              {item.description && (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {' • ' + item.description}
                </Text>
              )}
            </View>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: roomColor }]}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          {/* Participant Count */}
          <View style={styles.participantInfo}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.participantCount}>
              {item.participantCount || 0} participants
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={80} color={COLORS.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Messages</Text>
      <Text style={styles.emptyStateText}>
        Your chat rooms will appear here when you start a conversation with a manager.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.roomId}
        renderItem={renderConversationItem}
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
          rooms.length === 0 ? styles.emptyListContent : null
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
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  conversationItemUnread: {
    backgroundColor: COLORS.primary + "05",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs / 2,
  },
  userName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  userNameUnread: {
    fontWeight: "700",
  },
  timestamp: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  messagePreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs / 2,
  },
  roomTypeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  lastMessage: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: SPACING.sm,
  },
  unreadBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: "bold",
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs / 2,
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

export default ChatListScreen;
