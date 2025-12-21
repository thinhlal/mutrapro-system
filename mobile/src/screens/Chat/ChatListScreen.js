import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { useChatRooms } from "../../hooks/useChat";

const ChatListScreen = ({ navigation }) => {
  const { rooms, loading, refreshRooms } = useChatRooms();
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter rooms based on search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) {
      return rooms;
    }

    const query = searchQuery.toLowerCase().trim();
    return rooms.filter((room) => {
      const roomName = (room.roomName || "").toLowerCase();
      const description = (room.description || "").toLowerCase();
      const roomType = getRoomTypeText(room.roomType).toLowerCase();
      
      return (
        roomName.includes(query) ||
        description.includes(query) ||
        roomType.includes(query)
      );
    });
  }, [rooms, searchQuery]);

  const renderConversationItem = ({ item }) => {
    const isUnread = (item.unreadCount || 0) > 0 && item.isActive !== false;
    const isInactive = item.isActive === false;
    const roomColor = getRoomTypeColor(item.roomType);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isUnread && styles.conversationItemUnread,
          isInactive && styles.conversationItemInactive,
        ]}
        onPress={() => navigation.navigate("ChatRoom", { room: item })}
        activeOpacity={0.7}
      >
        {/* Avatar/Icon for Room Type */}
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: roomColor + '20' },
            isInactive && styles.avatarContainerInactive,
          ]}
        >
          <Ionicons name="chatbubbles" size={28} color={roomColor} />
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.roomNameContainer}>
              <Text
                style={[
                  styles.userName,
                  isUnread && styles.userNameUnread,
                  isInactive && styles.userNameInactive,
                ]}
                numberOfLines={1}
              >
                {item.roomName || 'Chat Room'}
              </Text>
              {isInactive && (
                <View style={styles.closedTag}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={10}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.closedTagText}>Closed</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timestamp, isInactive && styles.timestampInactive]}>
              {getTimeAgo(item.updatedAt || item.createdAt)}
            </Text>
          </View>

          <View style={styles.messagePreview}>
            <View style={styles.roomTypeContainer}>
              <Text
                style={[
                  styles.roomType,
                  { color: roomColor },
                  isInactive && styles.roomTypeInactive,
                ]}
              >
                {getRoomTypeText(item.roomType)}
              </Text>
              {item.description && (
                <Text
                  style={[styles.lastMessage, isInactive && styles.lastMessageInactive]}
                  numberOfLines={1}
                >
                  {' • ' + item.description}
                </Text>
              )}
            </View>
            {isUnread && !isInactive && (
              <View style={[styles.unreadBadge, { backgroundColor: roomColor }]}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          {/* Participant Count */}
          <View style={styles.participantInfo}>
            <Ionicons
              name="people-outline"
              size={14}
              color={isInactive ? COLORS.textSecondary : COLORS.textSecondary}
              style={isInactive && styles.iconInactive}
            />
            <Text
              style={[
                styles.participantCount,
                isInactive && styles.participantCountInactive,
              ]}
            >
              {item.participantCount || 0} participants
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyStateTitle}>No results found</Text>
          <Text style={styles.emptyStateText}>
            No chat rooms match "{searchQuery}"
          </Text>
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearSearchButtonText}>Clear search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyStateTitle}>No Messages</Text>
        <Text style={styles.emptyStateText}>
          Your chat rooms will appear here when you start a conversation with a manager.
        </Text>
      </View>
    );
  };

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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chat rooms..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchIcon}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredRooms}
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
          filteredRooms.length === 0 ? styles.emptyListContent : null
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
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    padding: 0,
  },
  clearSearchIcon: {
    padding: SPACING.xs / 2,
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
  conversationItemInactive: {
    opacity: 0.7,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarContainerInactive: {
    opacity: 0.6,
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
  roomNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginRight: SPACING.sm,
    minWidth: 0,
  },
  userName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    minWidth: 0,
  },
  userNameUnread: {
    fontWeight: "700",
  },
  userNameInactive: {
    opacity: 0.7,
  },
  closedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: 3,
    flexShrink: 0,
  },
  closedTagText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  timestampInactive: {
    opacity: 0.6,
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
  roomTypeInactive: {
    opacity: 0.6,
  },
  lastMessage: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  lastMessageInactive: {
    opacity: 0.6,
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
  participantCountInactive: {
    opacity: 0.6,
  },
  iconInactive: {
    opacity: 0.6,
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
  clearSearchButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  clearSearchButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
  },
});

export default ChatListScreen;
