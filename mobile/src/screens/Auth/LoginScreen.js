import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, ErrorMessage, SuccessMessage } from '../../components';
import { validateEmail, validatePassword } from '../../utils/validators';
import { useGoogleAuth, authenticateWithGoogle } from '../../services/googleAuthService';
import { setItem } from '../../utils/storage';
import { STORAGE_KEYS } from '../../config/constants';
import { logRedirectUri } from '../../utils/getRedirectUri';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  SCREEN_NAMES,
  SUCCESS_MESSAGES,
} from '../../config/constants';

const LoginScreen = ({ navigation }) => {
  const { logIn, loading, updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Google OAuth
  const { request, response, promptAsync } = useGoogleAuth();
  
  // Log redirect URI for debugging (chỉ trong development)
  useEffect(() => {
    if (__DEV__) {
      logRedirectUri();
    }
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleGoogleCallback(code);
    } else if (response?.type === 'error') {
      Toast.show({
        type: 'error',
        text1: 'Lỗi đăng nhập',
        text2: 'Không thể đăng nhập với Google',
      });
      setGoogleLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleCallback = async (code) => {
    setGoogleLoading(true);
    try {
      const { accessToken, user } = await authenticateWithGoogle(code);
      
      // Save to storage
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      await setItem(STORAGE_KEYS.USER_DATA, user);
      
      // Update context
      await updateUser(user);
      
      Toast.show({
        type: 'success',
        text1: 'Đăng nhập thành công',
        text2: `Chào mừng ${user.fullName}!`,
      });
    } catch (error) {
      console.error('Google authentication error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi xác thực',
        text2: error.message || 'Không thể đăng nhập với Google',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await promptAsync();
    } catch (error) {
      console.error('Google login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể mở Google đăng nhập',
      });
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    // Clear previous messages
    setErrors({});
    setSuccessMessage('');

    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      setErrors({
        email: emailValidation.error,
        password: passwordValidation.error,
      });
      return;
    }

    try {
      await logIn(email, password);
      setSuccessMessage(SUCCESS_MESSAGES.LOGIN_SUCCESS);
      Toast.show({
        type: 'success',
        text1: 'Đăng nhập thành công',
        text2: 'Chào mừng bạn trở lại!',
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error codes
      if (error.errorCode === 'USER_4013') {
        setErrors({ general: 'Vui lòng xác thực email trước khi đăng nhập' });
        Toast.show({
          type: 'info',
          text1: 'Email chưa được xác thực',
          text2: 'Chuyển đến trang xác thực...',
        });
        setTimeout(() => {
          navigation.navigate(SCREEN_NAMES.VERIFY_EMAIL, { email });
        }, 2000);
      } else if (error.errorCode === 'AUTH_5016') {
        setErrors({
          general: 'Tài khoản không có mật khẩu. Vui lòng đăng nhập bằng Google.',
        });
      } else {
        setErrors({ general: error.message || 'Email hoặc mật khẩu không đúng' });
      }
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>MuTraPro</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue your professional music composition experience
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {successMessage && <SuccessMessage message={successMessage} />}
          {errors.general && <ErrorMessage message={errors.general} />}

          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors((prev) => ({ ...prev, email: null, general: null }));
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors((prev) => ({ ...prev, password: null, general: null }));
            }}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={errors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[600]} />}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate(SCREEN_NAMES.FORGOT_PASSWORD)}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            size="medium"
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login Button */}
          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="outline"
            loading={googleLoading}
            disabled={loading || googleLoading || !request}
            icon={<Ionicons name="logo-google" size={20} color={COLORS.primary} />}
            iconPosition="left"
          />

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREEN_NAMES.REGISTER)}>
              <Text style={styles.footerLink}>Sign up now</Text>
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
    paddingTop: SPACING.xxl * 2,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  brand: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
    marginTop: -SPACING.sm,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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

export default LoginScreen;

