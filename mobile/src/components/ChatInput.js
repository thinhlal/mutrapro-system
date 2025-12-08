import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const ChatInput = ({ onSendMessage, onFileUpload, roomId, sending = false, disabled = false }) => {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSend = () => {
    if (message.trim() && !sending && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleAttach = () => {
    if (disabled || sending || uploading) return;
    
    Alert.alert(
      "Chọn loại file",
      "Bạn muốn đính kèm gì?",
      [
        {
          text: "Hình ảnh",
          onPress: handlePickImage,
        },
        {
          text: "File",
          onPress: handlePickDocument,
        },
        {
          text: "Hủy",
          style: "cancel",
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need camera roll permissions to upload images!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await handleFileUpload({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize || 0,
        }, "image");
      }
    } catch (error) {
      console.error("[Mobile] Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Determine file type
        let fileType = "file";
        if (asset.mimeType) {
          if (asset.mimeType.startsWith("image/")) {
            fileType = "image";
          } else if (asset.mimeType.startsWith("audio/")) {
            fileType = "audio";
          } else if (asset.mimeType.startsWith("video/")) {
            fileType = "video";
          }
        }
        
        await handleFileUpload({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size || 0,
        }, fileType);
      }
    } catch (error) {
      console.error("[Mobile] Error picking document:", error);
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  const handleFileUpload = async (file, fileType) => {
    if (!roomId) {
      Alert.alert("Error", "Chat room not found");
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      Alert.alert("Error", "File size must be less than 50MB");
      return;
    }

    try {
      setUploading(true);
      
      // Import chatService dynamically to avoid circular dependencies
      const chatService = require("../services/chatService");
      const response = await chatService.uploadFile(file, roomId);
      
      if (response?.status === "success" && response?.data) {
        const { fileKey, fileName, fileType: responseFileType, mimeType, fileSize } = response.data;
        
        // Create metadata object
        const metadata = {
          fileName,
          fileSize,
          mimeType,
          fileType: responseFileType || fileType,
          fileKey,
        };
        
        // Call callback with file info
        if (onFileUpload) {
          onFileUpload(fileKey, fileName, fileType, metadata);
        }
      } else {
        throw new Error(response?.message || "Upload file failed");
      }
    } catch (error) {
      console.error("[Mobile] Failed to upload file:", error);
      Alert.alert("Error", error?.response?.data?.message || error?.message || "Failed to upload file");
    } finally {
      setUploading(false);
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
          disabled={disabled || sending || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="attach" size={24} color={disabled || sending ? COLORS.textSecondary : COLORS.primary} />
          )}
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
          editable={!disabled && !sending}
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
            style={[styles.sendButton, (disabled || sending || uploading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={disabled || sending || uploading || !message.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
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
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatInput;

