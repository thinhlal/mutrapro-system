import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const FileItem = ({ file }) => {
  const getFileIcon = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    const iconMap = {
      pdf: { name: "document-text", color: COLORS.error },
      doc: { name: "document-text", color: COLORS.info },
      docx: { name: "document-text", color: COLORS.info },
      mp3: { name: "musical-notes", color: COLORS.primary },
      wav: { name: "musical-notes", color: COLORS.primary },
      m4a: { name: "musical-notes", color: COLORS.primary },
      mp4: { name: "videocam", color: COLORS.warning },
      mov: { name: "videocam", color: COLORS.warning },
      jpg: { name: "image", color: COLORS.success },
      jpeg: { name: "image", color: COLORS.success },
      png: { name: "image", color: COLORS.success },
      zip: { name: "archive", color: COLORS.textSecondary },
      rar: { name: "archive", color: COLORS.textSecondary },
    };
    return iconMap[ext] || { name: "document", color: COLORS.textSecondary };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePress = async () => {
    if (file.fileUrl) {
      try {
        const supported = await Linking.canOpenURL(file.fileUrl);
        if (supported) {
          await Linking.openURL(file.fileUrl);
        } else {
          console.error("Cannot open URL:", file.fileUrl);
        }
      } catch (error) {
        console.error("Error opening file:", error);
      }
    }
  };

  const iconConfig = getFileIcon(file.originalFileName || file.fileName);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!file.fileUrl}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconConfig.color + "15" }]}>
        <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.originalFileName || file.fileName || "Unnamed File"}
        </Text>
        <Text style={styles.fileSize}>
          {formatFileSize(file.fileSize)}
        </Text>
      </View>
      <Ionicons name="download-outline" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  fileInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  fileName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default FileItem;

