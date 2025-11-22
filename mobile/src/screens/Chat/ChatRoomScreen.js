import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { ChatMessage, ChatInput } from "../../components";

const ChatRoomScreen = ({ route, navigation }) => {
  const { conversation } = route.params;
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Set header title
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerTitle}
          onPress={() => {
            // Navigate to user profile
            // navigation.navigate('UserProfile', { userId: conversation.user.id });
          }}
        >
          <Image
            source={{ uri: conversation.user.avatar }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerName}>{conversation.user.name}</Text>
            {conversation.user.isOnline && (
              <Text style={styles.headerStatus}>Active now</Text>
            )}
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ),
    });

    // Load messages
    loadMessages();
  }, []);

  const loadMessages = async () => {
    // TODO: Replace with actual API call
    // const response = await getChatMessages(conversation.id);
    
    // Mock data
    const mockMessages = [
      {
        id: "1",
        text: "Hi! I'm interested in your transcription service.",
        senderId: conversation.user.id,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: "read",
      },
      {
        id: "2",
        text: "Hello! I'd be happy to help. What kind of music do you need transcribed?",
        senderId: "me",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 2).toISOString(),
        status: "read",
      },
      {
        id: "3",
        text: "It's a piano piece, about 3 minutes long. Do you have time this week?",
        senderId: conversation.user.id,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 5).toISOString(),
        status: "read",
      },
      {
        id: "4",
        text: "Yes! I can start working on it tomorrow. Could you send me the audio file?",
        senderId: "me",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1 + 1000 * 60 * 30).toISOString(),
        status: "read",
      },
      {
        id: "5",
        text: "Perfect! I'll upload it through the service request form.",
        senderId: conversation.user.id,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1 + 1000 * 60 * 32).toISOString(),
        status: "read",
      },
      {
        id: "6",
        text: "Great! Once I receive it, I'll send you a quote with the estimated delivery time.",
        senderId: "me",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1 + 1000 * 60 * 35).toISOString(),
        status: "read",
      },
      {
        id: "7",
        text: "Sounds good! Looking forward to working with you 🎵",
        senderId: conversation.user.id,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: "read",
      },
      {
        id: "8",
        text: "Hey! How's the transcription coming along?",
        senderId: conversation.user.id,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        status: "delivered",
      },
    ];

    setMessages(mockMessages.reverse()); // Reverse to show latest at bottom
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      senderId: "me",
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMessage]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // TODO: Replace with actual API call
      // await sendChatMessage(conversation.id, text);
      
      // Update status to sent
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: "sent" } : msg
          )
        );
      }, 500);

      // Simulate delivered status
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg
          )
        );
      }, 1000);

      // Simulate typing indicator (mock response)
      setTimeout(() => {
        setIsTyping(true);
      }, 2000);

      setTimeout(() => {
        setIsTyping(false);
        const responseMessage = {
          id: (Date.now() + 1).toString(),
          text: "Thanks for the update! I'll check it out.",
          senderId: conversation.user.id,
          timestamp: new Date().toISOString(),
          status: "read",
        };
        setMessages((prev) => [...prev, responseMessage]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 4000);
    } catch (error) {
      console.error("Error sending message:", error);
      // Update status to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "failed" } : msg
        )
      );
    }
  };

  const renderMessage = ({ item, index }) => {
    const isFromMe = item.senderId === "me";
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar =
      !isFromMe &&
      (!prevMessage || prevMessage.senderId !== item.senderId);

    return (
      <ChatMessage
        message={item}
        isFromMe={isFromMe}
        showAvatar={showAvatar}
        userAvatar={conversation.user.avatar}
      />
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <Image
          source={{ uri: conversation.user.avatar }}
          style={styles.typingAvatar}
        />
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListFooterComponent={renderTypingIndicator}
      />
      <ChatInput onSendMessage={handleSendMessage} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: SPACING.sm,
  },
  headerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
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
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: SPACING.xs,
  },
  typingBubble: {
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  typingDot1: {
    animation: "typing 1.4s infinite",
  },
  typingDot2: {
    animation: "typing 1.4s infinite 0.2s",
  },
  typingDot3: {
    animation: "typing 1.4s infinite 0.4s",
  },
});

export default ChatRoomScreen;

