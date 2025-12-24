import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
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
  const fromNotification = route?.params?.fromNotification || false;
  const flatListRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [room, setRoom] = useState(roomParam); // Initialize with roomParam if available
  const [loadingRoom, setLoadingRoom] = useState(!roomParam); // If no room, need to load
  const [selectedContextType, setSelectedContextType] = useState('GENERAL'); // Default: GENERAL (chat chung)
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
    loadMessages,
  } = useChat(roomId, false); // false = không auto-load, load từ đây với filter

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
            if (fromNotification) {
              const parentNavigation = navigation.getParent();
              if (parentNavigation) {
                parentNavigation.navigate('Chat', { screen: 'ChatList' });
              } else {
                navigation.navigate('Chat', { screen: 'ChatList' });
              }
            } else {
              navigation.goBack();
            }
          }
        } catch (error) {
          console.error('[Mobile] Error fetching room:', error);
          if (fromNotification) {
            const parentNavigation = navigation.getParent();
            if (parentNavigation) {
              parentNavigation.navigate('Chat', { screen: 'ChatList' });
            } else {
              navigation.navigate('Chat', { screen: 'ChatList' });
            }
          } else {
            navigation.goBack();
          }
        } finally {
          setLoadingRoom(false);
        }
      }
    };

    fetchRoomData();
  }, [roomIdParam, room, navigation, fromNotification]);

  // Handle keyboard show/hide
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // Load messages với filter ngay từ đầu
  useEffect(() => {
    if (roomId && !loadingRoom) {
      loadMessages(0, selectedContextType, selectedContextId);
    }
  }, [
    roomId,
    selectedContextType,
    selectedContextId,
    loadingRoom,
    loadMessages,
  ]);

  const handleBack = useCallback(() => {
    if (fromNotification) {
      // When coming from notification, always navigate to ChatList
      // This ensures we go to ChatList instead of Home
      // Use getParent to navigate to Chat tab's ChatList
      const parentNavigation = navigation.getParent();
      if (parentNavigation) {
        parentNavigation.navigate('Chat', {
          screen: 'ChatList',
        });
      } else {
        // Fallback: use current navigation
        navigation.navigate('Chat', {
          screen: 'ChatList',
        });
      }
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // Fallback to chat list if no back stack is available
    navigation.navigate('Chat', {
      screen: 'ChatList',
    });
  }, [fromNotification, navigation]);

  useEffect(() => {
    // Set header - only back button, room info is displayed outside header
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      ),
      headerTitle: '', // Empty title to avoid conflicts
    });
  }, [navigation, handleBack]);

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

    // Check if room is active
    if (room?.isActive === false) {
      Alert.alert("Warning", "Không thể gửi tin nhắn. Phòng chat này đã được đóng.");
      return;
    }

    try {
      await sendMessage(text, 'TEXT', null, selectedContextType, selectedContextId);
    } catch (error) {
      console.error('[Mobile] Error sending message:', error);
    }
  };

  const handleFileUpload = async (fileKey, fileName, fileType, metadata) => {
    // Check if room is active
    if (room?.isActive === false) {
      Alert.alert("Warning", "Không thể gửi file. Phòng chat này đã được đóng.");
      return;
    }

    try {
      // Determine message type based on file type
      let messageType = 'FILE';
      if (fileType === 'image') {
        messageType = 'IMAGE';
      } else if (fileType === 'audio') {
        messageType = 'AUDIO';
      } else if (fileType === 'video') {
        messageType = 'VIDEO';
      }

      // Send file message via WebSocket
      await sendMessage(
        fileKey, // content = fileKey để download sau này
        messageType,
        metadata, // metadata = file info (bao gồm fileKey)
        selectedContextType, // contextType
        selectedContextId  // contextId
      );
    } catch (error) {
      console.error('[Mobile] Failed to send file message:', error);
      Alert.alert("Error", "Không thể gửi file");
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMoreMessages(selectedContextType, selectedContextId);
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
        roomId={room?.roomId}
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

  // Check if this is CONTRACT_CHAT to show context type selector
  const isContractChat = room?.roomType === 'CONTRACT_CHAT';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      enabled={Platform.OS === "ios"}
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

      {/* Room Info Header - Displayed outside navigation header */}
      {room && (
        <View style={styles.roomInfoHeader}>
          <View style={styles.roomInfoIconContainer}>
            <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
            {connected && room?.isActive !== false && (
              <View style={styles.connectedDot} />
            )}
          </View>
          <View style={styles.roomInfoTextContainer}>
            <View style={styles.roomInfoNameContainer}>
              <Text style={styles.roomInfoName} numberOfLines={2}>
                {room?.roomName || 'Chat Room'}
              </Text>
              {room?.isActive === false && (
                <View style={styles.closedTag}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={12}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.closedTagText}>Closed</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.roomInfoStatus,
                room?.isActive === false && styles.roomInfoStatusClosed,
              ]}
              numberOfLines={1}
            >
              {room?.isActive === false
                ? 'Closed'
                : connected
                ? 'Connected'
                : 'Connecting...'}
            </Text>
          </View>
        </View>
      )}

      {/* Context Type Selector - Only for CONTRACT_CHAT */}
      {isContractChat && (
        <View style={styles.contextTypeSelector}>
          <TouchableOpacity
            style={[
              styles.contextTypeButton,
              selectedContextType === 'GENERAL' && styles.contextTypeButtonActive,
            ]}
            onPress={() => {
              setSelectedContextType('GENERAL');
              setSelectedContextId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={16}
              color={selectedContextType === 'GENERAL' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.contextTypeButtonText,
                selectedContextType === 'GENERAL' && styles.contextTypeButtonTextActive,
              ]}
            >
              Chat chung
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.contextTypeButton,
              selectedContextType === 'MILESTONE' && styles.contextTypeButtonActive,
            ]}
            onPress={() => {
              setSelectedContextType('MILESTONE');
              setSelectedContextId(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="flag-outline"
              size={16}
              color={selectedContextType === 'MILESTONE' ? COLORS.white : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.contextTypeButtonText,
                selectedContextType === 'MILESTONE' && styles.contextTypeButtonTextActive,
              ]}
            >
              Milestone
            </Text>
          </TouchableOpacity>
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
        contentContainerStyle={[
          styles.messagesList,
          Platform.OS === 'android' && { 
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 90 : 90
          }
        ]}
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
        onFileUpload={handleFileUpload}
        roomId={room?.roomId}
        sending={sending}
        disabled={!connected || !room || room?.isActive === false}
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

  // Room Info Header (displayed outside navigation header)
  roomInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roomInfoIconContainer: {
    position: "relative",
    marginRight: SPACING.sm,
    flexShrink: 0, // Icon container should not shrink
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
  roomInfoTextContainer: {
    flex: 1,
    minWidth: 0, // Important: allows flex shrinking and text wrapping
  },
  roomInfoNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flexWrap: "wrap",
  },
  roomInfoName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    minWidth: 0,
  },
  closedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
    flexShrink: 0,
  },
  closedTagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  roomInfoStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roomInfoStatusClosed: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
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

  // Context Type Selector
  contextTypeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  contextTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  contextTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  contextTypeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  contextTypeButtonTextActive: {
    color: COLORS.white,
  },
});

export default ChatRoomScreen;
