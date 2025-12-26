import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const FileUploader = ({ onFileSelect, selectedFile, onClearFile, allowedFileTypes = null, compact = false }) => {
  const [uploading, setUploading] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef(null);

  // Validate file extension for arrangement services
  const isValidFileForArrangement = (fileName) => {
    if (!allowedFileTypes || allowedFileTypes.length === 0) return true;
    
    if (!fileName || !fileName.includes('.')) return false;
    
    const fileNameLower = fileName.toLowerCase();
    const validExtensions = allowedFileTypes.map(ext => ext.toLowerCase().replace('.', ''));
    
    // Check if file ends with any valid extension
    return validExtensions.some(ext => fileNameLower.endsWith('.' + ext));
  };

  // Validate audio/video file extensions (for transcription and recording services)
  const isValidAudioVideoFile = (fileName) => {
    if (!fileName || !fileName.includes('.')) return false;
    
    const fileNameLower = fileName.toLowerCase();
    const ext = fileNameLower.split('.').pop();
    
    // Valid audio extensions
    const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma', 'opus'];
    // Valid video extensions (that contain audio)
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', '3gp'];
    
    return audioExts.includes(ext) || videoExts.includes(ext);
  };

  const pickAudioFile = async () => {
    try {
      setUploading(true);

      // Determine file types based on allowedFileTypes
      let pickerTypes;
      if (allowedFileTypes && allowedFileTypes.length > 0) {
        // For arrangement services, allow all file types (we'll validate extension)
        // This is because expo-document-picker doesn't support MusicXML/MIDI MIME types well
        pickerTypes = "*/*";
      } else {
        // Default: audio and video files
        pickerTypes = ["audio/*", "video/*"];
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: pickerTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];

      // Validate file extension based on service type
      if (allowedFileTypes && allowedFileTypes.length > 0) {
        // For arrangement services: validate notation files
        if (!isValidFileForArrangement(file.name)) {
          Alert.alert(
            "Invalid File Type",
            `Please select a file with one of these extensions: ${allowedFileTypes.join(", ")}`
          );
          setUploading(false);
          return;
        }
      } else {
        // For transcription and recording services: validate audio/video files only
        if (!isValidAudioVideoFile(file.name)) {
          Alert.alert(
            "Invalid File Type",
            "Please select an audio or video file (MP3, WAV, M4A, MP4, MOV, etc.). Notation files (MIDI, XML, PDF) are not supported for this service type."
          );
          setUploading(false);
          return;
        }
      }

      // Get audio duration (only for audio/video files, not for arrangement files)
      let duration = 0;
      if (!allowedFileTypes || allowedFileTypes.length === 0) {
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
      }

      const fileData = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || (allowedFileTypes ? "application/octet-stream" : "audio/mpeg"),
        size: file.size,
        duration: duration, // in minutes (0 for arrangement files)
      };

      onFileSelect(fileData);
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file. Please try again.");
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

  // Format time in milliseconds to MM:SS
  const formatTime = (millis) => {
    if (!millis || isNaN(millis)) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Check if file is audio/video (not arrangement file)
  const isAudioVideoFile = () => {
    if (!selectedFile) return false;
    if (allowedFileTypes && allowedFileTypes.length > 0) return false; // Arrangement files
    return true; // Audio/video files
  };

  // Load and play audio
  useEffect(() => {
    const shouldLoadAudio = selectedFile && 
      (!allowedFileTypes || allowedFileTypes.length === 0);
    
    if (shouldLoadAudio) {
      loadAudio();
    } else {
      unloadAudio();
    }

    return () => {
      unloadAudio();
    };
  }, [selectedFile?.uri, allowedFileTypes]);

  const loadAudio = async () => {
    if (!selectedFile?.uri) return;
    
    try {
      setIsLoading(true);
      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create and load sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedFile.uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);
    } catch (error) {
      console.error("Error loading audio:", error);
      Alert.alert("Error", "Failed to load audio file");
    } finally {
      setIsLoading(false);
    }
  };

  const unloadAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setSound(null);
      setIsPlaying(false);
      setPlaybackStatus(null);
    } catch (error) {
      console.error("Error unloading audio:", error);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    setPlaybackStatus(status);
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!soundRef.current) {
        await loadAudio();
        return;
      }

      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    } catch (error) {
      console.error("Error playing/pausing audio:", error);
      Alert.alert("Error", "Failed to play audio");
    }
  };

  const handleSeek = async (positionMillis) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(positionMillis);
      }
    } catch (error) {
      console.error("Error seeking audio:", error);
    }
  };

  return (
    <View style={styles.container}>
      {!selectedFile ? (
        <TouchableOpacity
          style={[styles.uploadButton, compact && styles.uploadButtonCompact]}
          onPress={pickAudioFile}
          disabled={uploading}
        >
          <View style={[styles.uploadIconContainer, compact && styles.uploadIconContainerCompact]}>
            <Ionicons name="cloud-upload-outline" size={compact ? 28 : 40} color={COLORS.primary} />
          </View>
          <Text style={styles.uploadTitle}>
            {uploading ? "Loading..." : allowedFileTypes && allowedFileTypes.length > 0 
              ? `Upload File (${allowedFileTypes.join(", ").toUpperCase()})`
              : "Upload Audio File"}
          </Text>
          <Text style={styles.uploadSubtitle}>
            {allowedFileTypes && allowedFileTypes.length > 0
              ? `Accepted formats: ${allowedFileTypes.join(", ").toUpperCase()}`
              : "Tap to browse your files"}
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

          {/* Audio Player - Only for audio/video files */}
          {isAudioVideoFile() && (
            <View style={styles.audioPlayerContainer}>
              {isLoading ? (
                <View style={styles.audioPlayerLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.audioPlayerLoadingText}>Loading audio...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.audioPlayerControls}>
                    <TouchableOpacity
                      style={styles.playPauseButton}
                      onPress={handlePlayPause}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={24}
                        color={COLORS.white}
                      />
                    </TouchableOpacity>
                    <View style={styles.audioPlayerInfo}>
                      <View style={styles.audioPlayerTimeRow}>
                        <Text style={styles.audioPlayerTime}>
                          {playbackStatus?.isLoaded
                            ? formatTime(playbackStatus.positionMillis)
                            : "00:00"}
                        </Text>
                        <Text style={styles.audioPlayerTimeSeparator}>/</Text>
                        <Text style={styles.audioPlayerTime}>
                          {playbackStatus?.isLoaded && playbackStatus.durationMillis
                            ? formatTime(playbackStatus.durationMillis)
                            : selectedFile.duration > 0
                            ? formatDuration(selectedFile.duration)
                            : "00:00"}
                        </Text>
                      </View>
                      {playbackStatus?.isLoaded && playbackStatus.durationMillis && (
                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBar,
                              {
                                width: `${
                                  (playbackStatus.positionMillis /
                                    playbackStatus.durationMillis) *
                                  100
                                }%`,
                              },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
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
  uploadButtonCompact: {
    padding: SPACING.md,
  },
  uploadIconContainer: {
    marginBottom: SPACING.md,
  },
  uploadIconContainerCompact: {
    marginBottom: SPACING.sm,
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
  audioPlayerContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  audioPlayerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  audioPlayerLoadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  audioPlayerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  audioPlayerInfo: {
    flex: 1,
  },
  audioPlayerTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  audioPlayerTime: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  audioPlayerTimeSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.xs,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});

export default FileUploader;

