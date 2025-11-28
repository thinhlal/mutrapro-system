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
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { KLANG_MODELS, FREE_PLAN_LIMITS } from "../../config/klangConfig";
import { useKlangTranscriptionStore } from "../../stores/useKlangTranscriptionStore";

/**
 * AI Transcription Screen - Upload and configure
 * Similar to frontend KlangTranscriptionPanel
 */
const AITranscriptionScreen = ({ navigation }) => {
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { model, setModel, createTranscription, reset } = useKlangTranscriptionStore();

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

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Music Transcription</Text>
        <Text style={styles.subtitle}>
          Convert your audio into sheet music within seconds using AI
        </Text>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color={COLORS.info} />
        <Text style={styles.infoText}>
          Free plan supports audio files ≤ {FREE_PLAN_LIMITS.MAX_DURATION_SECONDS} seconds
        </Text>
      </View>

      {/* Step 1: Select Model */}
      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepTitle}>Select Instrument Type</Text>
        </View>

        <Text style={styles.stepDescription}>
          AI will automatically detect and analyze the instrument from your audio file
        </Text>

        {/* Model Selection Grid */}
        <View style={styles.modelGrid}>
          {KLANG_MODELS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.modelButton,
                model === m.value && styles.modelButtonActive,
              ]}
              onPress={() => setModel(m.value)}
            >
              <Text
                style={[
                  styles.modelButtonText,
                  model === m.value && styles.modelButtonTextActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Step 2: Upload Audio File */}
      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepTitle}>Upload Audio File</Text>
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickFile}
        >
          <Ionicons name="cloud-upload-outline" size={32} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Choose Audio File</Text>
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
      <View style={styles.section}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepTitle}>Start Transcription</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.transcribeButton,
            (!file || isSubmitting) && styles.transcribeButtonDisabled,
          ]}
          onPress={handleTranscribe}
          disabled={!file || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Ionicons name="hourglass-outline" size={24} color={COLORS.white} />
              <Text style={styles.transcribeButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="play-circle-outline" size={24} color={COLORS.white} />
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

      {/* How it works */}
      <View style={styles.howItWorksSection}>
        <Text style={styles.howItWorksTitle}>How It Works</Text>

        <View style={styles.howItWorksItem}>
          <Ionicons name="musical-notes" size={24} color={COLORS.primary} />
          <View style={styles.howItWorksContent}>
            <Text style={styles.howItWorksItemTitle}>Upload your music</Text>
            <Text style={styles.howItWorksItemText}>
              Select an audio file from your device (MP3, WAV, etc.)
            </Text>
          </View>
        </View>

        <View style={styles.howItWorksItem}>
          <Ionicons name="analytics" size={24} color={COLORS.primary} />
          <View style={styles.howItWorksContent}>
            <Text style={styles.howItWorksItemTitle}>AI identifies notes</Text>
            <Text style={styles.howItWorksItemText}>
              Klangio AI analyzes and performs note detection automatically
            </Text>
          </View>
        </View>

        <View style={styles.howItWorksItem}>
          <Ionicons name="download-outline" size={24} color={COLORS.primary} />
          <View style={styles.howItWorksContent}>
            <Text style={styles.howItWorksItemTitle}>View & Download</Text>
            <Text style={styles.howItWorksItemText}>
              Export your transcription as Sheet Music or MIDI file
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.info + "15",
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    fontWeight: "600",
  },
  section: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
  },
  stepTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  stepDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  modelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  modelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modelButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modelButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  modelButtonTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },
  uploadButton: {
    backgroundColor: COLORS.primary + "15",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: SPACING.sm,
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
  transcribeButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  howItWorksSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  howItWorksTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  howItWorksItem: {
    flexDirection: "row",
    marginBottom: SPACING.lg,
  },
  howItWorksContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  howItWorksItemTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  howItWorksItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default AITranscriptionScreen;

