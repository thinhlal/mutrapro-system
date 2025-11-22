import React, { useState, useEffect, useCallback } from "react";
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

const ChatListScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await getChatConversations();
      
      // Mock data
      const mockConversations = [
        {
          id: "1",
          user: {
            id: "user1",
            name: "John Smith",
            avatar: "https://i.pravatar.cc/150?img=1",
            isOnline: true,
          },
          lastMessage: {
            text: "Hey! How's the transcription coming along?",
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
            senderId: "user1",
            isRead: false,
          },
          unreadCount: 2,
        },
        {
          id: "2",
          user: {
            id: "user2",
            name: "Sarah Johnson",
            avatar: "https://i.pravatar.cc/150?img=2",
            isOnline: true,
          },
          lastMessage: {
            text: "Perfect! I'll send you the files tomorrow.",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
            senderId: "me",
            isRead: true,
          },
          unreadCount: 0,
        },
        {
          id: "3",
          user: {
            id: "user3",
            name: "Mike Chen",
            avatar: "https://i.pravatar.cc/150?img=3",
            isOnline: false,
          },
          lastMessage: {
            text: "Thanks for the arrangement! It sounds amazing 🎵",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            senderId: "user3",
            isRead: true,
          },
          unreadCount: 0,
        },
        {
          id: "4",
          user: {
            id: "user4",
            name: "Emily Davis",
            avatar: "https://i.pravatar.cc/150?img=4",
            isOnline: false,
          },
          lastMessage: {
            text: "Can we schedule a recording session next week?",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            senderId: "user4",
            isRead: false,
          },
          unreadCount: 1,
        },
        {
          id: "5",
          user: {
            id: "user5",
            name: "David Brown",
            avatar: "https://i.pravatar.cc/150?img=5",
            isOnline: true,
          },
          lastMessage: {
            text: "Got it! Let me know if you need any changes.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            senderId: "me",
            isRead: true,
          },
          unreadCount: 0,
        },
      ];

      setConversations(mockConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, []);

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

  const renderConversationItem = ({ item }) => {
    const isUnread = item.unreadCount > 0;
    const isFromMe = item.lastMessage.senderId === "me";

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.conversationItemUnread]}
        onPress={() => navigation.navigate("ChatRoom", { conversation: item })}
        activeOpacity={0.7}
      >
        {/* Avatar with Online Indicator */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          {item.user.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.userName, isUnread && styles.userNameUnread]}
              numberOfLines={1}
            >
              {item.user.name}
            </Text>
            <Text style={styles.timestamp}>{getTimeAgo(item.lastMessage.timestamp)}</Text>
          </View>

          <View style={styles.messagePreview}>
            <Text
              style={[
                styles.lastMessage,
                isUnread && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {isFromMe && "You: "}
              {item.lastMessage.text}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
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
        Start a conversation with a specialist or client.
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
        data={conversations}
        keyExtractor={(item) => item.id}
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
          conversations.length === 0 ? styles.emptyListContent : null
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
    position: "relative",
    marginRight: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray[300],
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
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
  },
  lastMessage: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  lastMessageUnread: {
    fontWeight: "600",
    color: COLORS.text,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
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

