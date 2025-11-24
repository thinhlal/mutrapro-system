import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SignatureScreen from "react-native-signature-canvas";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

/**
 * NOTE: This component requires 'react-native-signature-canvas' package
 * Install: npm install react-native-signature-canvas
 * 
 * Usage:
 * <SignaturePadModal
 *   visible={visible}
 *   onCancel={() => setVisible(false)}
 *   onConfirm={(base64) => handleSignature(base64)}
 *   loading={loading}
 * />
 */

const SignaturePadModal = ({ visible, onCancel, onConfirm, loading }) => {
  const signatureRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleOK = (signature) => {
    if (signature) {
      setIsEmpty(false);
      // Signature is already in base64 format (data:image/png;base64,...)
      onConfirm(signature);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (isEmpty) {
      Alert.alert("Empty Signature", "Please draw your signature before confirming.");
      return;
    }
    // Trigger the signature capture
    signatureRef.current?.readSignature();
  };

  const handleEmpty = () => {
    setIsEmpty(true);
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  // HTML/CSS style for the signature canvas
  const style = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body,html {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    canvas {
      background-color: #ffffff;
    }
  `;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Draw Your Signature</Text>
            <TouchableOpacity onPress={onCancel} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
            <Text style={styles.instructionsText}>
              Draw your signature in the box below. This will be used to sign your contract
              electronically.
            </Text>
          </View>

          {/* Signature Canvas */}
          <View style={styles.canvasContainer}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleOK}
              onEmpty={handleEmpty}
              onBegin={handleBegin}
              autoClear={false}
              descriptionText=""
              webStyle={style}
              penColor={COLORS.text}
              backgroundColor="#ffffff"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClear}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.buttonText, { color: COLORS.error }]}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={[styles.buttonText, { color: COLORS.white }]}>
                    Confirm Signature
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              After confirming, you'll receive an OTP via email to complete the signing process.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  container: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  instructions: {
    flexDirection: "row",
    padding: SPACING.md,
    backgroundColor: COLORS.info + "15",
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  instructionsText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  canvasContainer: {
    height: 250,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  clearButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
  },
  footer: {
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default SignaturePadModal;

