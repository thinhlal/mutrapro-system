import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Button, OTPInput, ErrorMessage, LoadingScreen } from '../../components';
import { verifyEmail, resendVerification, checkVerificationStatus } from '../../services/userService';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  SCREEN_NAMES,
  SUCCESS_MESSAGES,
} from '../../config/constants';

const VerifyEmailScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  
  const expiryTimestampRef = useRef(null);
  const hasRequestedCode = useRef(false);
  const isVerifying = useRef(false);

  // Check verification status on mount
  useEffect(() => {
    if (!email) {
      navigation.replace(SCREEN_NAMES.LOGIN);
      return;
    }

    if (!hasRequestedCode.current) {
      hasRequestedCode.current = true;
      checkStatus();
    }
  }, [email]);

  // Countdown for code expiry
  useEffect(() => {
    let interval;
    if (codeExpiry > 0 && !isVerified && expiryTimestampRef.current) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(
          0,
          Math.floor((expiryTimestampRef.current - now) / 1000)
        );

        if (remaining <= 0) {
          setError('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
          setCodeExpiry(0);
        } else {
          setCodeExpiry(remaining);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [codeExpiry, isVerified]);

  // Countdown for resend cooldown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [resendTimer]);

  const checkStatus = async () => {
    try {
      const response = await checkVerificationStatus(email);
      const result = response?.data;

      if (result?.emailVerified) {
        setError('Email đã được xác thực. Bạn có thể đăng nhập ngay.');
        setTimeout(() => navigation.replace(SCREEN_NAMES.LOGIN), 1000);
        return;
      }

      if (result?.hasActiveCode && result?.remainingSeconds > 0) {
        // Use existing code
        setCodeExpiry(result.remainingSeconds);
        expiryTimestampRef.current = Date.now() + result.remainingSeconds * 1000;
        console.log('Using existing verification code');
      } else {
        // Request new code
        await requestNewCode();
      }
    } catch (err) {
      console.error('Error checking verification status:', err);
      await requestNewCode();
    }
  };

  const requestNewCode = async () => {
    try {
      const response = await resendVerification(email);
      const result = response?.data;
      
      const remainingSeconds = result?.remainingSeconds || 15 * 60;
      setCodeExpiry(remainingSeconds);
      expiryTimestampRef.current = Date.now() + remainingSeconds * 1000;
      setError('');
    } catch (err) {
      if (err.message === 'Email already verified') {
        setError('Email đã được xác thực. Bạn có thể đăng nhập ngay.');
        setTimeout(() => navigation.replace(SCREEN_NAMES.LOGIN), 2000);
      } else {
        setError('Không thể lấy mã xác thực. Vui lòng thử gửi lại.');
      }
    }
  };

  const handleVerify = async () => {
    if (isVerified || isVerifying.current) return;
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    isVerifying.current = true;
    setLoading(true);
    setError('');

    try {
      // Gửi email và code như parameters riêng biệt
      const response = await verifyEmail(email, otpCode);
      
      if (response.statusCode === 200) {
        setIsVerified(true);
        Toast.show({
          type: 'success',
          text1: 'Xác thực thành công',
          text2: 'Chuyển đến trang đăng nhập...',
        });
        
        setTimeout(() => {
          navigation.replace(SCREEN_NAMES.LOGIN);
        }, 1500);
      }
    } catch (err) {
      setIsVerified(false);
      console.error('Verification error:', err);
      
      if (err.message === 'Invalid verification code') {
        setError('Mã xác thực không đúng. Vui lòng kiểm tra lại.');
      } else if (err.message === 'Token expired') {
        setError('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
      } else if (err.message === 'Email already verified') {
        setError('Email đã được xác thực. Bạn có thể đăng nhập ngay.');
        setTimeout(() => navigation.replace(SCREEN_NAMES.LOGIN), 1000);
      } else {
        setError(err.message || 'Mã xác thực không hợp lệ. Vui lòng thử lại.');
      }
      
      setOtpCode('');
    } finally {
      setLoading(false);
      isVerifying.current = false;
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;

    setResendLoading(true);
    setError('');

    try {
      const response = await resendVerification(email);
      const result = response?.data;

      Toast.show({
        type: 'success',
        text1: 'Đã gửi mã mới',
        text2: 'Vui lòng kiểm tra email của bạn',
      });

      const remainingSeconds = result?.remainingSeconds || 15 * 60;
      setCodeExpiry(remainingSeconds);
      expiryTimestampRef.current = Date.now() + remainingSeconds * 1000;

      setCanResend(false);
      setResendTimer(60);
      setOtpCode('');
    } catch (err) {
      if (err.message === 'Email already verified') {
        setError('Email đã được xác thực. Bạn có thể đăng nhập ngay.');
        setTimeout(() => navigation.replace(SCREEN_NAMES.LOGIN), 2000);
      } else {
        setError('Không thể gửi lại mã. Vui lòng thử lại sau.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && isVerified) {
    return <LoadingScreen message="Đang xác thực..." subMessage="Vui lòng đợi" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isVerified ? 'checkmark-circle' : 'shield-checkmark'}
              size={64}
              color={isVerified ? COLORS.success : COLORS.primary}
            />
          </View>
          <Text style={styles.title}>Email Verification</Text>
          <View style={styles.emailContainer}>
            <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Enter verification code</Text>
          
          <OTPInput
            value={otpCode}
            onChange={setOtpCode}
            error={!!error}
          />

          {codeExpiry > 0 && (
            <View style={styles.expiryContainer}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.expiryText}>
                Code expires in {formatTime(codeExpiry)}
              </Text>
            </View>
          )}

          {error && <ErrorMessage message={error} />}

          <Button
            title={isVerified ? 'Verified!' : 'Verify Email'}
            onPress={handleVerify}
            loading={loading}
            disabled={otpCode.length !== 6 || loading || isVerified}
            size="large"
            style={styles.verifyButton}
          />

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || resendLoading}
              style={styles.resendButton}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  (!canResend || resendLoading) && styles.resendButtonTextDisabled,
                ]}
              >
                {resendLoading
                  ? 'Sending...'
                  : resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    marginBottom: SPACING.lg,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginLeft: SPACING.xs,
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    color: COLORS.text,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  expiryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  verifyButton: {
    marginTop: SPACING.lg,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  resendText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  resendButton: {
    padding: SPACING.sm,
  },
  resendButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: COLORS.gray[500],
  },
});

export default VerifyEmailScreen;

