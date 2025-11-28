import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, STORAGE_KEYS } from "../../config/constants";
import { ChatMessage, ChatInput } from "../../components";
import { useChat } from "../../hooks/useChat";
import { getItem } from "../../utils/storage";
import * as chatApi from "../../services/chatService";

const ChatRoomScreen = ({ route, navigation }) => {
  // Can receive either { room } or { roomId }
  const { room: roomParam, roomId: roomIdParam } = route.params || {};
  const flatListRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [room, setRoom] = useState(roomParam); // Initialize with roomParam if available
  const [loadingRoom, setLoadingRoom] = useState(!roomParam); // If no room, need to load

  // IMPORTANT: Use roomIdParam directly if available to prevent re-subscription
  // when room state changes after fetching room data
  const roomId = roomIdParam || roomParam?.roomId;

  const {
    messages,
    loading,
    sending,
    connected,
    hasMore,
    sendMessage,
    loadMoreMessages,
  } = useChat(roomId);

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const userData = await getItem(STORAGE_KEYS.USER_DATA);

      console.log('[Mobile] User data from storage:', userData);
      console.log('[Mobile] User data type:', typeof userData);
      console.log('[Mobile] User data keys:', userData ? Object.keys(userData) : 'null');

      if (userData?.id) {
        console.log('[Mobile] ✅ Setting currentUserId:', userData.id);
        setCurrentUserId(userData.id);
      } else {
        console.error('[Mobile] ❌ No user ID found in storage!', userData);
      }
    };
    getUserId();
  }, []);

  // Fetch room data if only roomId is provided (e.g., from notification)
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!room && roomIdParam) {
        console.log('[Mobile] Fetching room data for roomId:', roomIdParam);
        setLoadingRoom(true);
        try {
          const response = await chatApi.getChatRoomById(roomIdParam);
          if (response.status === 'success' && response.data) {
            setRoom(response.data);
            console.log('[Mobile] Room data loaded:', response.data);
          } else {
            console.error('[Mobile] Failed to load room:', response.message);
            // Navigate back if room not found
            navigation.goBack();
          }
        } catch (error) {
          console.error('[Mobile] Error fetching room:', error);
          navigation.goBack();
        } finally {
          setLoadingRoom(false);
        }
      }
    };

    fetchRoomData();
  }, [roomIdParam, room, navigation]);

  useEffect(() => {
    // Set header title - only update if room is available
    if (!room) return;

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <TouchableOpacity style={styles.headerTitle}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
            {connected && <View style={styles.connectedDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{room?.roomName || 'Chat Room'}</Text>
            <Text style={styles.headerStatus}>
              {connected ? 'Connected' : 'Connecting...'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      // headerRight: () => (
      //   <View style={styles.headerRight}>
      //     <TouchableOpacity style={styles.headerButton}>
      //       <Ionicons
      //         name="information-circle-outline"
      //         size={24}
      //         color={COLORS.primary}
      //       />
      //     </TouchableOpacity>
      //   </View>
      // ),
    });
  }, [room, connected, navigation]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    console.log('[Mobile] Messages state updated:', {
      count: messages.length,
      messageIds: messages.map(m => m.messageId),
    });

    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, loading]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    try {
      await sendMessage(text);
    } catch (error) {
      console.error('[Mobile] Error sending message:', error);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const renderMessage = ({ item, index }) => {
    console.log('🎨 [Mobile] Rendering message:', {
      messageId: item.messageId,
      content: item.content,
      senderId: item.senderId,
      currentUserId,
      isFromMe: item.senderId === currentUserId,
    });

    const isFromMe = item.senderId === currentUserId;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar =
      !isFromMe &&
      (!prevMessage || prevMessage.senderId !== item.senderId);

    // Convert message format to match ChatMessage component
    const formattedMessage = {
      ...item,
      text: item.content,
      timestamp: item.sentAt,
      status: 'delivered', // Default status
    };

    return (
      <ChatMessage
        message={formattedMessage}
        isFromMe={isFromMe}
        showAvatar={showAvatar}
        userAvatar={`https://ui-avatars.com/api/?name=${item.senderName || 'User'}`}
      />
    );
  };

  const renderHeader = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadMoreContainer}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <TouchableOpacity onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>Load more messages</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>Start the conversation!</Text>
      </View>
    );
  };

  // Show loading screen while fetching room data
  if (loadingRoom) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading chat room...</Text>
      </View>
    );
  }

  // Show error if room is not available
  if (!room) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Chat room not found</Text>
        <TouchableOpacity
          style={styles.errorBackWrapper}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.primary}
            style={styles.errorBackIcon}
          />
          <Text style={styles.errorBackText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Connection Status Banner */}
      {!connected && (
        <View style={styles.connectionBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={COLORS.white} />
          <Text style={styles.connectionBannerText}>
            Connecting...
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => {
          console.log('🔑 [Mobile] FlatList key:', item.messageId);
          return item.messageId;
        }}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        extraData={messages.length} // Force re-render when messages change
      />

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!connected || sending}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Back button (headerLeft)
  backButton: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.sm,
  },

  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconContainer: {
    position: "relative",
    marginRight: SPACING.sm,
  },
  connectedDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  headerButton: {
    marginLeft: SPACING.md,
  },

  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warning,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  connectionBannerText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: SPACING.xs,
  },

  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexGrow: 1,
  },
  loadMoreContainer: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  emptySubtext: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },

  loadingScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  // Error screen
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.error,
    textAlign: "center",
  },
  errorBackWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  errorBackIcon: {
    marginRight: SPACING.xs,
  },
  errorBackText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: "600",
  },
});

export default ChatRoomScreen;
