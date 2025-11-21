import React, { useState } from 'react';
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
import { Button, Input, ErrorMessage, SuccessMessage } from '../../components';
import { resetPassword } from '../../services/authService';
import { validatePassword, validateConfirmPassword } from '../../utils/validators';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  SCREEN_NAMES,
  SUCCESS_MESSAGES,
} from '../../config/constants';

const ResetPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async () => {
    setErrors({});
    setSuccessMessage('');

    // Validate token
    if (!token || token.trim().length === 0) {
      setErrors({ token: 'Vui lòng nhập mã xác thực từ email' });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setErrors({ password: passwordValidation.error });
      return;
    }

    // Validate confirm password
    const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
    if (!confirmPasswordValidation.isValid) {
      setErrors({ confirmPassword: confirmPasswordValidation.error });
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ token: token.trim(), newPassword: password });
      
      setSuccessMessage(SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS);
      Toast.show({
        type: 'success',
        text1: 'Đặt lại mật khẩu thành công',
        text2: 'Bạn có thể đăng nhập với mật khẩu mới',
      });

      // Navigate to login after 2 seconds
      setTimeout(() => {
        navigation.navigate(SCREEN_NAMES.LOGIN);
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = err.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      setErrors({ general: errorMessage });
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

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
            <Ionicons name="key" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the code from your email and create a new password
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {successMessage && <SuccessMessage message={successMessage} />}
          {errors.general && <ErrorMessage message={errors.general} />}

          <Input
            label="Reset Code"
            value={token}
            onChangeText={(text) => {
              setToken(text);
              setErrors((prev) => ({ ...prev, token: null, general: null }));
            }}
            placeholder="Enter code from email"
            autoCapitalize="none"
            error={errors.token}
            leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="New Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors((prev) => ({ ...prev, password: null, general: null }));
            }}
            placeholder="Enter new password (min 8 characters)"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={errors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setErrors((prev) => ({ ...prev, confirmPassword: null, general: null }));
            }}
            placeholder="Re-enter new password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={errors.confirmPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Button
            title="Reset Password"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            size="large"
          />

          {/* Back to Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.LOGIN)}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  form: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;

