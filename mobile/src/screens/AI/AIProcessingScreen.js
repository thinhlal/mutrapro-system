import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { useKlangTranscriptionStore } from "../../stores/useKlangTranscriptionStore";
import { JOB_STATUS } from "../../config/klangConfig";
import aiAnimation from "../../assets/animations/AI animation.json";

/**
 * AI Processing Screen - Show progress and results
 * Similar to frontend TranscriptionProcessPage
 */
const AIProcessingScreen = ({ navigation, route }) => {
  const { file } = route.params || {};
  
  const [currentStep, setCurrentStep] = useState(0);

  const { jobId, status, error, midiBlob, downloadResult } = useKlangTranscriptionStore();

  // Processing steps
  const steps = [
    { label: "Uploading audio file...", icon: "cloud-upload" },
    { label: "AI analyzing audio...", icon: "analytics" },
    { label: "Detecting notes...", icon: "musical-notes" },
    { label: "Creating sheet music...", icon: "document-text" },
  ];

  // Update step based on status
  useEffect(() => {
    if (status === JOB_STATUS.CREATING && currentStep < 1) {
      setCurrentStep(1);
    } else if (status === JOB_STATUS.IN_QUEUE && currentStep < 2) {
      setCurrentStep(2);
    } else if (status === JOB_STATUS.IN_PROGRESS && currentStep < 3) {
      setCurrentStep(3);
    } else if (status === JOB_STATUS.COMPLETED && currentStep < 4) {
      setCurrentStep(4);
    }
  }, [status, currentStep]);

  const handleViewInBrowser = async () => {
    try {
      const url = 'https://flat.io/';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
        Alert.alert(
          "Opening Flat.io",
          "You can import your MIDI file in Flat.io to view the sheet music."
        );
      } else {
        Alert.alert("Error", "Cannot open browser");
      }
    } catch (error) {
      console.error("[AI] Open browser error:", error);
      Alert.alert("Error", "Failed to open browser");
    }
  };

  const handleDownloadMIDI = async () => {
    try {
      console.log("[AI] Downloading MIDI - Job ID:", jobId);
      
      // Download MIDI blob from Klang API
      const blob = await downloadResult("midi");
      
      // Convert blob to base64 for React Native
      const base64 = await blobToBase64(blob);
      const fileUri = `${FileSystem.cacheDirectory}${jobId}.mid`;
      
      // Save to file system using legacy API
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: 'base64',
      });

      console.log("[AI] MIDI saved to:", fileUri);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "audio/midi",
          dialogTitle: "Save or Share MIDI File",
        });
        Alert.alert("Success", "MIDI file ready to save or share!");
      } else {
        Alert.alert("Success", `MIDI file saved to:\n${fileUri}`);
      }
    } catch (error) {
      console.error("[AI] Download MIDI error:", error);
      Alert.alert("Error", "Failed to download MIDI file. Please try again.");
    }
  };

  const handleShareMIDI = async () => {
    // Same as download - opens share dialog
    await handleDownloadMIDI();
  };

  /**
   * Convert blob to base64
   */
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleBackToUpload = () => {
    navigation.goBack();
  };

  const isProcessing =
    status === JOB_STATUS.CREATING ||
    status === JOB_STATUS.IN_QUEUE ||
    status === JOB_STATUS.IN_PROGRESS;
  const isCompleted = status === JOB_STATUS.COMPLETED;
  const isFailed = status === JOB_STATUS.FAILED;

  const progressPercent = (currentStep / steps.length) * 100;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToUpload} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {file && (
          <Text style={styles.fileInfo}>
            Processing: <Text style={styles.fileName}>{file.name}</Text>
          </Text>
        )}
      </View>

          {/* Processing Section */}
          {isProcessing && (
            <View style={styles.processingSection}>
              {/* Lottie Animation */}
              <View style={styles.animationContainer}>
                <LottieView
                  source={aiAnimation}
                  autoPlay
                  loop
                  style={styles.lottieAnimation}
                />
              </View>

              <Text style={styles.processingTitle}>
                {steps[currentStep]?.label || "Processing"}
              </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
          </View>

          {/* Steps List */}
          <View style={styles.stepsList}>
            {steps.map((step, index) => (
              <View
                key={index}
                style={[
                  styles.stepItem,
                  index < currentStep && styles.stepCompleted,
                  index === currentStep && styles.stepActive,
                ]}
              >
                <Ionicons
                  name={step.icon}
                  size={20}
                  color={
                    index < currentStep
                      ? COLORS.success
                      : index === currentStep
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.stepLabel,
                    index < currentStep && styles.stepLabelCompleted,
                    index === currentStep && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

          {/* Completed Section */}
          {isCompleted && (
            <View style={styles.completedSection}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
              </View>

              <Text style={styles.completedTitle}>Transcription Complete!</Text>
              <Text style={styles.completedText}>
                Your MIDI file is ready to download and use
              </Text>

              {/* MIDI Info Card */}
              <View style={styles.midiCard}>
                <View style={styles.midiIconContainer}>
                  <Ionicons name="musical-notes" size={48} color={COLORS.primary} />
                </View>
                <View style={styles.midiCardInfo}>
                  <Text style={styles.midiCardTitle}>Standard MIDI File</Text>
                  <Text style={styles.midiCardSubtitle}>
                    Format: .mid • Ready to use
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleDownloadMIDI}
                >
                  <Ionicons name="download" size={20} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Download MIDI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleViewInBrowser}
                >
                  <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.secondaryButtonText}>View in Flat.io</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleShareMIDI}
                >
                  <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.secondaryButtonText}>Share MIDI</Text>
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
                <Text style={styles.infoText}>
                  Open in Flat.io to view and edit your sheet music online
                </Text>
              </View>

              {jobId && (
                <View style={styles.jobIdSection}>
                  <Text style={styles.jobIdLabel}>Job ID:</Text>
                  <Text style={styles.jobIdText}>{jobId}</Text>
                </View>
              )}
            </View>
          )}

          {/* Error Section */}
          {isFailed && (
            <View style={styles.errorSection}>
              <Ionicons name="close-circle" size={80} color={COLORS.error} />
              <Text style={styles.errorTitle}>An Error Occurred</Text>
              <Text style={styles.errorText}>
                {error || "Unable to process audio file. Please try again."}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleBackToUpload}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  backButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontWeight: "600",
  },
  fileInfo: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  fileName: {
    fontWeight: "700",
    color: COLORS.text,
  },
  processingSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: "center",
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  lottieAnimation: {
    width: "100%",
    height: "100%",
  },
  processingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  progressContainer: {
    width: "100%",
    marginBottom: SPACING.xl,
  },
  progressBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    textAlign: "center",
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  stepsList: {
    width: "100%",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  stepActive: {
    backgroundColor: COLORS.primary + "15",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  stepCompleted: {
    backgroundColor: COLORS.success + "15",
  },
  stepLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  stepLabelCompleted: {
    color: COLORS.success,
  },
  completedSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: "center",
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  completedTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  completedText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  midiCard: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    width: "100%",
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.success + "40",
    alignItems: "center",
  },
  midiIconContainer: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  midiCardInfo: {
    flex: 1,
  },
  midiCardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  midiCardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    width: "100%",
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
    marginLeft: SPACING.sm,
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
    marginLeft: SPACING.sm,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: COLORS.info + "15",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    width: "100%",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    lineHeight: 20,
  },
  jobIdSection: {
    flexDirection: "row",
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    width: "100%",
  },
  jobIdLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  jobIdText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  errorSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
  },
});

export default AIProcessingScreen;

