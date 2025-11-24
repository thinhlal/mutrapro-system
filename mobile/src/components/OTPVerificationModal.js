import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const OTPVerificationModal = ({
  visible,
  onCancel,
  onVerify,
  onResend,
  loading,
  error,
  expiresAt,
  maxAttempts = 3,
  email,
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Timer countdown
  useEffect(() => {
    if (!visible || !expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);
      setCanResend(remaining === 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [visible, expiresAt]);

  // Reset OTP when modal opens
  useEffect(() => {
    if (visible) {
      setOtp(["", "", "", "", "", ""]);
      setCanResend(false);
    }
  }, [visible]);

  // Focus first input when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [visible]);

  const handleChangeText = (text, index) => {
    // Only allow numbers
    if (text && !/^\d$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (text && index === 5 && newOtp.every((digit) => digit !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (otpCode = null) => {
    const code = otpCode || otp.join("");
    if (code.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter all 6 digits");
      return;
    }
    onVerify(code);
  };

  const handleResend = () => {
    if (!canResend) {
      Alert.alert("Please wait", "You can request a new OTP after the current one expires");
      return;
    }
    setOtp(["", "", "", "", "", ""]);
    onResend();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (match, start, middle, end) => {
        return start + "*".repeat(middle.length) + end;
      })
    : "your email";

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
            <Text style={styles.title}>Verify OTP</Text>
            <TouchableOpacity onPress={onCancel} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
            </View>
          </View>

          {/* Description */}
          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              We've sent a 6-digit verification code to
            </Text>
            <Text style={styles.emailText}>{maskedEmail}</Text>
            <Text style={styles.descriptionText}>
              Please enter the code below to complete the signing process.
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                  error && styles.otpInputError,
                ]}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Timer */}
          {timeRemaining !== null && (
            <View style={styles.timerContainer}>
              <Ionicons
                name="time-outline"
                size={16}
                color={timeRemaining > 60 ? COLORS.success : COLORS.warning}
              />
              <Text
                style={[
                  styles.timerText,
                  { color: timeRemaining > 60 ? COLORS.success : COLORS.warning },
                ]}
              >
                {timeRemaining > 0
                  ? `Code expires in ${formatTime(timeRemaining)}`
                  : "Code expired"}
              </Text>
            </View>
          )}

          {/* Attempts Info */}
          {maxAttempts > 0 && (
            <Text style={styles.attemptsText}>
              You have {maxAttempts} {maxAttempts === 1 ? "attempt" : "attempts"} remaining
            </Text>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading || otp.some((digit) => !digit)}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Sign Contract</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={!canResend || loading}>
              <Text
                style={[
                  styles.resendLink,
                  (!canResend || loading) && styles.resendLinkDisabled,
                ]}
              >
                Resend OTP
              </Text>
            </TouchableOpacity>
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
    maxWidth: 450,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  descriptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emailText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginVertical: SPACING.xs,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.text,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  otpInputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + "10",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.error + "15",
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginLeft: SPACING.xs,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  timerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: SPACING.xs,
  },
  attemptsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.primary,
  },
  resendLinkDisabled: {
    color: COLORS.textSecondary,
  },
});

export default OTPVerificationModal;

