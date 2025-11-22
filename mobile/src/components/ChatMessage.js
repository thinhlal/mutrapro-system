import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const ChatMessage = ({ message, isFromMe, showAvatar, userAvatar }) => {
  const getTimeString = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getStatusIcon = () => {
    if (!isFromMe) return null;

    switch (message.status) {
      case "sending":
        return <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />;
      case "sent":
        return <Ionicons name="checkmark" size={12} color={COLORS.textSecondary} />;
      case "delivered":
        return (
          <View style={styles.doubleCheck}>
            <Ionicons name="checkmark" size={12} color={COLORS.textSecondary} />
            <Ionicons
              name="checkmark"
              size={12}
              color={COLORS.textSecondary}
              style={styles.secondCheck}
            />
          </View>
        );
      case "read":
        return (
          <View style={styles.doubleCheck}>
            <Ionicons name="checkmark" size={12} color={COLORS.primary} />
            <Ionicons
              name="checkmark"
              size={12}
              color={COLORS.primary}
              style={styles.secondCheck}
            />
          </View>
        );
      case "failed":
        return <Ionicons name="alert-circle" size={12} color={COLORS.error} />;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        isFromMe ? styles.containerFromMe : styles.containerFromThem,
      ]}
    >
      {/* Avatar for received messages */}
      {!isFromMe && (
        <View style={styles.avatarContainer}>
          {showAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>
      )}

      {/* Message Bubble */}
      <View
        style={[
          styles.bubble,
          isFromMe ? styles.bubbleFromMe : styles.bubbleFromThem,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isFromMe ? styles.messageTextFromMe : styles.messageTextFromThem,
          ]}
        >
          {message.text}
        </Text>

        {/* Timestamp and Status */}
        <View style={styles.metaContainer}>
          <Text
            style={[
              styles.timestamp,
              isFromMe ? styles.timestampFromMe : styles.timestampFromThem,
            ]}
          >
            {getTimeString(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.xs,
  },
  containerFromMe: {
    justifyContent: "flex-end",
  },
  containerFromThem: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 28,
    marginRight: SPACING.xs,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  bubbleFromMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleFromThem: {
    backgroundColor: COLORS.gray[200],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FONT_SIZES.base,
    lineHeight: 20,
  },
  messageTextFromMe: {
    color: COLORS.white,
  },
  messageTextFromThem: {
    color: COLORS.text,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs / 2,
  },
  timestamp: {
    fontSize: FONT_SIZES.xs - 1,
    marginRight: SPACING.xs / 2,
  },
  timestampFromMe: {
    color: COLORS.white + "CC", // 80% opacity
  },
  timestampFromThem: {
    color: COLORS.textSecondary,
  },
  doubleCheck: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -4,
  },
  secondCheck: {
    marginLeft: -8,
  },
});

export default ChatMessage;

