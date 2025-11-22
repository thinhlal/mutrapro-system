import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const NotificationItem = ({ notification, onPress }) => {
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifTime.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.isRead && styles.containerUnread,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Unread Indicator */}
      {!notification.isRead && <View style={styles.unreadIndicator} />}

      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: notification.iconColor + "20" },
        ]}
      >
        <Ionicons
          name={notification.icon}
          size={24}
          color={notification.iconColor}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              !notification.isRead && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={styles.time}>{getTimeAgo(notification.timestamp)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {/* Chevron */}
      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: "relative",
  },
  containerUnread: {
    backgroundColor: COLORS.primary + "08",
  },
  unreadIndicator: {
    position: "absolute",
    left: SPACING.sm,
    top: "50%",
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs / 2,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  titleUnread: {
    fontWeight: "700",
    color: COLORS.text,
  },
  time: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  message: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  chevron: {
    marginLeft: SPACING.xs,
  },
});

export default NotificationItem;

