import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from "../../config/constants";
import { KLANG_MODELS, FREE_PLAN_LIMITS } from "../../config/klangConfig";
import { useKlangTranscriptionStore } from "../../stores/useKlangTranscriptionStore";

/**
 * AI Transcription Screen - Upload and configure
 * Similar to frontend KlangTranscriptionPanel
 */
const AITranscriptionScreen = ({ navigation }) => {
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const { model, setModel, createTranscription, reset } =
    useKlangTranscriptionStore();

  const selectedModel = KLANG_MODELS.find((m) => m.value === model);

  /**
   * Handle file picker
   */
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      console.log("[AI] Document picker result:", result);

      if (result.canceled) {
        return;
      }

      const pickedFile = result.assets[0];

      // Check file size (mobile has limitations)
      const fileSizeMB = pickedFile.size / (1024 * 1024);
      if (fileSizeMB > FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB) {
        Alert.alert(
          "File Too Large",
          `File size must be less than ${FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MB for free plan.`
        );
        return;
      }

      setFile(pickedFile);
      reset(); // Reset previous job state

      console.log("[AI] File selected:", pickedFile.name);
    } catch (error) {
      console.error("[AI] Error picking file:", error);
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  /**
   * Start transcription
   */
  const handleTranscribe = async () => {
    if (!file) {
      Alert.alert("No File", "Please select an audio file first!");
      return;
    }

    try {
      setIsSubmitting(true);

      // Start transcription
      await createTranscription(file);

      // Navigate to processing screen
      navigation.navigate("AIProcessing", { file });
    } catch (error) {
      console.error("[AI] Transcription error:", error);
      Alert.alert("Error", error.message || "Failed to start transcription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectModel = (value) => {
    setModel(value);
    setIsModelDropdownOpen(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero + How It Works */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroIconWrapper}>
            <Ionicons name="sparkles-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.heroTextWrapper}>
            <Text style={styles.title}>AI Music Transcription</Text>
            <Text style={styles.subtitle}>
              Convert your audio into sheet music within seconds using AI.
            </Text>
          </View>
        </View>

        {/* How It Works gọn & sinh động */}
        {/*<View style={styles.howItWorksRow}>
          <View style={styles.howItWorksChip}>
            <Ionicons
              name="musical-notes-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.howItWorksChipText}>Upload audio</Text>
          </View>
          <View style={styles.howItWorksChip}>
            <Ionicons name="pulse-outline" size={18} color={COLORS.primary} />
            <Text style={styles.howItWorksChipText}>AI analyzes</Text>
          </View>
          <View style={styles.howItWorksChip}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.howItWorksChipText}>View & download</Text>
          </View>
        </View>*/}
      </View>

      {/* Info Banner */}
      {/* <View style={styles.infoBanner}>
        <Ionicons
          name="information-circle"
          size={20}
          color={COLORS.info}
          style={styles.infoIcon}
        />
        <Text style={styles.infoText}>
          Free plan supports audio files ≤ {FREE_PLAN_LIMITS.MAX_DURATION_SECONDS}{" "}
          seconds and ≤ {FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MB.
        </Text>
      </View> */}

      {/* Step 1: Select Model (dropdown) */}
      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Select Instrument Type</Text>
            <Text style={styles.stepDescription}>
              Choose the instrument that best matches your recording so AI can
              optimize the transcription.
            </Text>
          </View>
        </View>

        {/* Dropdown thay cho grid */}
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          activeOpacity={0.8}
        >
          <View style={styles.dropdownLabelRow}>
            <Ionicons
              name="musical-note-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text
              style={[
                styles.dropdownText,
                !selectedModel && styles.dropdownPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedModel ? selectedModel.label : "Select instrument"}
            </Text>
          </View>
          <Ionicons
            name={isModelDropdownOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {isModelDropdownOpen && (
          <View style={styles.dropdownList}>
            {KLANG_MODELS.map((m) => {
              const isActive = model === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.dropdownItem,
                    isActive && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleSelectModel(m.value)}
                  activeOpacity={0.9}
                >
                  <View style={styles.dropdownItemInner}>
                    <Ionicons
                      name={isActive ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isActive ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isActive && styles.dropdownItemTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Step 2: Upload Audio File */}
      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Upload Audio File</Text>
            <Text style={styles.stepDescription}>
              Supported formats: MP3, WAV, M4A… Use a clean recording for best
              transcription quality.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickFile}
          activeOpacity={0.85}
        >
          <View style={styles.uploadIconWrapper}>
            <Ionicons
              name="cloud-upload-outline"
              size={26}
              color={COLORS.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadButtonText}>Choose Audio File</Text>
            <Text style={styles.uploadHintText}>
              Tap to browse and select an audio file from your device.
            </Text>
          </View>
        </TouchableOpacity>

        {file && (
          <View style={styles.fileInfo}>
            <View style={styles.fileIconContainer}>
              <Ionicons name="musical-note" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileSize}>
                {(file.size / 1024).toFixed(1)} KB
              </Text>
            </View>
            <TouchableOpacity onPress={() => setFile(null)}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Step 3: Start Transcription */}
      <View style={[styles.section, styles.lastSection]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Start Transcription</Text>
            <Text style={styles.stepDescription}>
              We’ll send your file to the AI engine and show the progress on the
              next screen.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.transcribeButton,
            (!file || isSubmitting) && styles.transcribeButtonDisabled,
          ]}
          onPress={handleTranscribe}
          disabled={!file || isSubmitting}
          activeOpacity={0.9}
        >
          {isSubmitting ? (
            <>
              <Ionicons
                name="hourglass-outline"
                size={22}
                color={COLORS.white}
              />
              <Text style={styles.transcribeButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="play-circle-outline"
                size={22}
                color={COLORS.white}
              />
              <Text style={styles.transcribeButtonText}>Transcribe Now</Text>
            </>
          )}
        </TouchableOpacity>

        {isSubmitting && (
          <Text style={styles.submittingHint}>
            Preparing to switch to processing page...
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl * 1.5,
  },

  // Hero + How It Works
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  heroIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  heroTextWrapper: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  howItWorksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  howItWorksChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
    marginTop: SPACING.sm,
    flexShrink: 1,
  },
  howItWorksChipText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },

  // Info banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.info + "15",
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  infoIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    lineHeight: 18,
    fontWeight: "500",
  },

  // Sections (cards)
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  lastSection: {
    marginBottom: SPACING.lg * 1.5,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
  },
  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Dropdown
  dropdownTrigger: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
  },
  dropdownText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: COLORS.textSecondary,
  },
  dropdownList: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + "55",
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primary + "10",
  },
  dropdownItemInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownItemText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Upload
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary + "08",
  },
  uploadIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  uploadButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: SPACING.xs / 2,
  },
  uploadHintText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  fileSize: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Transcribe button
  transcribeButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    marginTop: SPACING.sm,
  },
  transcribeButtonDisabled: {
    backgroundColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  transcribeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    marginLeft: SPACING.sm,
  },
  submittingHint: {
    textAlign: "center",
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
});

export default AITranscriptionScreen;
