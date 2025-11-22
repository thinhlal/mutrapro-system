import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const FileUploader = ({ onFileSelect, selectedFile, onClearFile }) => {
  const [uploading, setUploading] = useState(false);

  const pickAudioFile = async () => {
    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "video/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];

      // Get audio duration
      let duration = 0;
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: file.uri },
          { shouldPlay: false }
        );
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          duration = status.durationMillis / 1000 / 60; // Convert to minutes
        }
        await sound.unloadAsync();
      } catch (error) {
        console.warn("Could not get audio duration:", error);
      }

      const fileData = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "audio/mpeg",
        size: file.size,
        duration: duration, // in minutes
      };

      onFileSelect(fileData);
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick audio file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClearFile = () => {
    Alert.alert(
      "Remove File",
      "Are you sure you want to remove this file?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onClearFile },
      ]
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "—";
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "—";
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {!selectedFile ? (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickAudioFile}
          disabled={uploading}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons name="cloud-upload-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.uploadTitle}>
            {uploading ? "Loading..." : "Upload Audio/Video File"}
          </Text>
          <Text style={styles.uploadSubtitle}>
            Tap to browse your files
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.fileContainer}>
          <View style={styles.fileHeader}>
            <Ionicons name="musical-note" size={24} color={COLORS.primary} />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <View style={styles.fileDetails}>
                <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                {selectedFile.duration > 0 && (
                  <>
                    <Text style={styles.fileSeparator}>•</Text>
                    <Text style={styles.fileDuration}>
                      {formatDuration(selectedFile.duration)}
                    </Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleClearFile} style={styles.removeButton}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  uploadButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl * 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadIconContainer: {
    marginBottom: SPACING.md,
  },
  uploadTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  uploadSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  fileContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  fileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  fileName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  fileDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileSize: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  fileSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.xs,
  },
  fileDuration: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: "600",
  },
  removeButton: {
    padding: SPACING.xs,
  },
});

export default FileUploader;

