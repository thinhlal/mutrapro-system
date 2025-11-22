import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const ChatInput = ({ onSendMessage, onAttachFile }) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleAttach = () => {
    if (onAttachFile) {
      onAttachFile();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {/* Attach Button */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttach}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />

        {/* Emoji/Camera Button */}
        {!message.trim() && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              // Open emoji picker or camera
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="happy-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Send Button */}
        {message.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={COLORS.white} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingBottom: Platform.OS === "ios" ? SPACING.sm : SPACING.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
  },
  attachButton: {
    padding: SPACING.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    maxHeight: 100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: Platform.OS === "ios" ? SPACING.sm : SPACING.xs,
    lineHeight: 20,
  },
  iconButton: {
    padding: SPACING.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.xs,
  },
});

export default ChatInput;

