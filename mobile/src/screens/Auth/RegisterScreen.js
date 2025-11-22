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
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, ErrorMessage, SuccessMessage } from '../../components';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
} from '../../utils/validators';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  SCREEN_NAMES,
  SUCCESS_MESSAGES,
  USER_ROLES,
} from '../../config/constants';

const RegisterScreen = ({ navigation }) => {
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null, general: null }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate first name
    const firstNameValidation = validateName(formData.firstName);
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error;
    }

    // Validate last name
    const lastNameValidation = validateName(formData.lastName);
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error;
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    // Validate confirm password
    const confirmPasswordValidation = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );
    if (!confirmPasswordValidation.isValid) {
      newErrors.confirmPassword = confirmPasswordValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    // Clear previous messages
    setSuccessMessage('');
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Prepare register data
      const registerData = {
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        role: USER_ROLES.CUSTOMER,
      };

      await register(registerData);

      setSuccessMessage(SUCCESS_MESSAGES.REGISTER_SUCCESS);
      Toast.show({
        type: 'success',
        text1: 'Đăng ký thành công',
        text2: 'Vui lòng kiểm tra email để xác thực',
      });

      // Navigate to verify email screen after 2 seconds
      setTimeout(() => {
        navigation.navigate(SCREEN_NAMES.VERIFY_EMAIL, { email: formData.email });
      }, 2000);
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = error.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setErrors({ general: errorMessage });
      Toast.show({
        type: 'error',
        text1: 'Đăng ký thất bại',
        text2: errorMessage,
      });
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
          <Text style={styles.title}>Create New Account</Text>
          <Text style={styles.subtitle}>
            Join the community of professional musicians and composers
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {successMessage && <SuccessMessage message={successMessage} />}
          {errors.general && <ErrorMessage message={errors.general} />}

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="First Name"
                value={formData.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                placeholder="First name"
                error={errors.firstName}
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Last Name"
                value={formData.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                placeholder="Last name"
                error={errors.lastName}
              />
            </View>
          </View>

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Password"
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            placeholder="Enter password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={errors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            placeholder="Re-enter password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            error={errors.confirmPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Phone (Optional)"
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            error={errors.phone}
            leftIcon={<Ionicons name="call-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Address (Optional)"
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            placeholder="Enter your address"
            error={errors.address}
            leftIcon={<Ionicons name="location-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
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

          {/* Google Register Button */}
          <Button
            title="Continue with Google"
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Tính năng đang phát triển',
                text2: 'Google registration sẽ sớm được hỗ trợ',
              });
            }}
            variant="outline"
            icon={<Ionicons name="logo-google" size={20} color={COLORS.primary} />}
            iconPosition="left"
          />

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.lg,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -SPACING.xs,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: SPACING.xs,
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
    marginTop: SPACING.lg,
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

export default RegisterScreen;

