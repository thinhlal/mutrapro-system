import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";
import * as chatApi from "../services/chatService";

const ChatMessage = ({ message, isFromMe, showAvatar, userAvatar, roomId }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  
  const getTimeString = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };
  
  // Load file URL for images
  useEffect(() => {
    if (!roomId || !message.content) return;
    
    // Normalize messageType to uppercase for case-insensitive matching
    const messageType = message.messageType?.toUpperCase() || message.type?.toUpperCase();
    const needsLoad = messageType === "IMAGE";
    if (!needsLoad) return;
    
    let isMounted = true;
    
    const loadFileUrl = async () => {
      try {
        setLoadingFile(true);
        const blob = await chatApi.downloadFile(message.content, roomId);
        
        // Convert blob to data URL for React Native Image
        const reader = new FileReader();
        reader.onload = () => {
          if (isMounted) {
            setFileUrl(reader.result);
          }
        };
        reader.onerror = () => {
          if (isMounted) {
            console.error("Failed to convert blob to data URL");
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("[Mobile] Failed to load file:", error);
        if (isMounted) {
          Alert.alert("Error", "Unable to download file");
        }
      } finally {
        if (isMounted) {
          setLoadingFile(false);
        }
      }
    };
    
    loadFileUrl();
    
    return () => {
      isMounted = false;
      setFileUrl(null);
    };
  }, [roomId, message.content, message.messageType, message.type]);
  
  // Download file handler
  const handleDownloadFile = async (fileKey) => {
    if (!roomId || !fileKey) {
      Alert.alert("Error", "Không thể tải file");
      return;
    }
    
    try {
      setLoadingFile(true);
      const blob = await chatApi.downloadFile(fileKey, roomId);
      
      // Convert blob to base64 and save to file system
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result;
          const base64 = dataUrl.split(",")[1];
          const fileName = message.metadata?.fileName || "file";
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Share the file
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: message.metadata?.mimeType || "application/octet-stream",
              dialogTitle: "Save or Share File",
            });
          } else {
            Alert.alert("Success", `File saved to:\n${fileUri}`);
          }
        } catch (error) {
          console.error("[Mobile] Failed to save file:", error);
          Alert.alert("Error", "Unable to save file");
        } finally {
          setLoadingFile(false);
        }
      };
      reader.onerror = () => {
        setLoadingFile(false);
        Alert.alert("Error", "Không thể tải file");
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("[Mobile] Failed to download file:", error);
      Alert.alert("Error", "Không thể tải file");
      setLoadingFile(false);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Render message content based on type
  const renderMessageContent = () => {
    // Normalize messageType
    const messageType = message.messageType?.toUpperCase() || message.type?.toUpperCase();
    const content = message.content || message.text || "";
    
    switch (messageType) {
      case "TEXT":
        // If has metadata file but type is TEXT, show as file
        if (message.metadata?.fileName) {
          const fileKey = content;
          return (
            <TouchableOpacity
              style={styles.fileContainer}
              onPress={() => fileKey && handleDownloadFile(fileKey)}
              disabled={loadingFile}
            >
              <Ionicons name="document-attach" size={20} color={isFromMe ? COLORS.white : COLORS.primary} />
              <View style={styles.fileInfo}>
                <Text
                  style={[
                    styles.fileName,
                    isFromMe ? styles.fileNameFromMe : styles.fileNameFromThem,
                  ]}
                  numberOfLines={1}
                >
                  {message.metadata.fileName || "Attached file"}
                </Text>
                {message.metadata.fileSize && (
                  <Text
                    style={[
                      styles.fileSize,
                      isFromMe ? styles.fileSizeFromMe : styles.fileSizeFromThem,
                    ]}
                  >
                    {formatFileSize(message.metadata.fileSize)}
                  </Text>
                )}
              </View>
              {loadingFile && <ActivityIndicator size="small" color={isFromMe ? COLORS.white : COLORS.primary} />}
            </TouchableOpacity>
          );
        }
        return (
          <Text
            style={[
              styles.messageText,
              isFromMe ? styles.messageTextFromMe : styles.messageTextFromThem,
            ]}
          >
            {content}
          </Text>
        );
        
      case "IMAGE":
        return (
          <View style={styles.imageContainer}>
            {loadingFile ? (
              <ActivityIndicator size="small" color={isFromMe ? COLORS.white : COLORS.primary} />
            ) : fileUrl ? (
              <Image source={{ uri: fileUrl }} style={styles.messageImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Unable to load image</Text>
              </View>
            )}
          </View>
        );
        
      case "FILE":
        const fileKey = content;
        return (
          <TouchableOpacity
            style={styles.fileContainer}
            onPress={() => fileKey && handleDownloadFile(fileKey)}
            disabled={loadingFile}
          >
            <Ionicons name="document-attach" size={20} color={isFromMe ? COLORS.white : COLORS.primary} />
            <View style={styles.fileInfo}>
              <Text
                style={[
                  styles.fileName,
                  isFromMe ? styles.fileNameFromMe : styles.fileNameFromThem,
                ]}
                numberOfLines={1}
              >
                {message.metadata?.fileName || "Attached file"}
              </Text>
              {message.metadata?.fileSize && (
                <Text
                  style={[
                    styles.fileSize,
                    isFromMe ? styles.fileSizeFromMe : styles.fileSizeFromThem,
                  ]}
                >
                  {formatFileSize(message.metadata.fileSize)}
                </Text>
              )}
            </View>
            {loadingFile && <ActivityIndicator size="small" color={isFromMe ? COLORS.white : COLORS.primary} />}
          </TouchableOpacity>
        );
        
      case "AUDIO":
        const audioFileKey = content;
        return (
          <TouchableOpacity
            style={styles.fileContainer}
            onPress={() => audioFileKey && handleDownloadFile(audioFileKey)}
            disabled={loadingFile}
          >
            <Ionicons name="musical-notes" size={20} color={isFromMe ? COLORS.white : COLORS.primary} />
            <View style={styles.fileInfo}>
              <Text
                style={[
                  styles.fileName,
                  isFromMe ? styles.fileNameFromMe : styles.fileNameFromThem,
                ]}
                numberOfLines={1}
              >
                {message.metadata?.fileName || "Attached audio file"}
              </Text>
              {message.metadata?.fileSize && (
                <Text
                  style={[
                    styles.fileSize,
                    isFromMe ? styles.fileSizeFromMe : styles.fileSizeFromThem,
                  ]}
                >
                  {formatFileSize(message.metadata.fileSize)}
                </Text>
              )}
            </View>
            {loadingFile && <ActivityIndicator size="small" color={isFromMe ? COLORS.white : COLORS.primary} />}
          </TouchableOpacity>
        );
        
      case "VIDEO":
        const videoFileKey = content;
        return (
          <TouchableOpacity
            style={styles.fileContainer}
            onPress={() => videoFileKey && handleDownloadFile(videoFileKey)}
            disabled={loadingFile}
          >
            <Ionicons name="videocam" size={20} color={isFromMe ? COLORS.white : COLORS.primary} />
            <View style={styles.fileInfo}>
              <Text
                style={[
                  styles.fileName,
                  isFromMe ? styles.fileNameFromMe : styles.fileNameFromThem,
                ]}
                numberOfLines={1}
              >
                {message.metadata?.fileName || "Attached video file"}
              </Text>
              {message.metadata?.fileSize && (
                <Text
                  style={[
                    styles.fileSize,
                    isFromMe ? styles.fileSizeFromMe : styles.fileSizeFromThem,
                  ]}
                >
                  {formatFileSize(message.metadata.fileSize)}
                </Text>
              )}
            </View>
            {loadingFile && <ActivityIndicator size="small" color={isFromMe ? COLORS.white : COLORS.primary} />}
          </TouchableOpacity>
        );
        
      case "SYSTEM":
      case "STATUS_UPDATE":
        return (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>
              {messageType === "STATUS_UPDATE" ? "📋 " : ""}
              {content}
            </Text>
          </View>
        );
        
      default:
        return (
          <Text
            style={[
              styles.messageText,
              isFromMe ? styles.messageTextFromMe : styles.messageTextFromThem,
            ]}
          >
            {content}
          </Text>
        );
    }
  };
  
  // System messages have special styling
  const messageType = message.messageType?.toUpperCase() || message.type?.toUpperCase();
  if (messageType === "SYSTEM" || messageType === "STATUS_UPDATE") {
    return (
      <View style={styles.systemMessageWrapper}>
        <View style={styles.systemMessageContent}>
          {renderMessageContent()}
          <Text style={styles.systemMessageTime}>
            {getTimeString(message.sentAt || message.timestamp)}
          </Text>
        </View>
      </View>
    );
  }

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
        {/* Sender name for received messages */}
        {!isFromMe && (message.senderName || message.sender?.name) && (
          <Text style={styles.senderName}>
            {message.senderName || message.sender?.name || "Unknown"}
          </Text>
        )}
        
        {/* Message Content */}
        <View style={styles.messageContentContainer}>
          {renderMessageContent()}
        </View>

        {/* Timestamp and Status */}
        <View style={styles.metaContainer}>
          <Text
            style={[
              styles.timestamp,
              isFromMe ? styles.timestampFromMe : styles.timestampFromThem,
            ]}
          >
            {getTimeString(message.sentAt || message.timestamp)}
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
  senderName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  messageContentContainer: {
    marginBottom: SPACING.xs / 2,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  fileInfo: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  fileName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "500",
  },
  fileNameFromMe: {
    color: COLORS.white,
  },
  fileNameFromThem: {
    color: COLORS.text,
  },
  fileSize: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  fileSizeFromMe: {
    color: COLORS.white + "CC",
  },
  fileSizeFromThem: {
    color: COLORS.textSecondary,
  },
  imageContainer: {
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    marginVertical: SPACING.xs,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.md,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  imagePlaceholderText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  systemMessageWrapper: {
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  systemMessageContent: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    maxWidth: "80%",
  },
  systemMessage: {
    alignItems: "center",
  },
  systemMessageText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  systemMessageTime: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
    textAlign: "center",
  },
});

export default ChatMessage;

