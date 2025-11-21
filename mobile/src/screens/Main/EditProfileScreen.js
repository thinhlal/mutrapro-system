import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, ErrorMessage, SuccessMessage } from '../../components';
import { updateFullUser } from '../../services/userService';
import { validateName } from '../../utils/validators';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  SUCCESS_MESSAGES,
} from '../../config/constants';

const EditProfileScreen = ({ navigation, route }) => {
  const { profileData } = route.params || {};
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: profileData?.fullName || '',
    phone: profileData?.phone || '',
    address: profileData?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null, general: null }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate full name
    const nameValidation = validateName(formData.fullName);
    if (!nameValidation.isValid) {
      newErrors.fullName = nameValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setErrors({});
    setSuccessMessage('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare update data
      const updateData = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        email: profileData?.email || user?.email, // Keep email unchanged
      };

      await updateFullUser(user.id, updateData);
      
      // Update user context
      await updateUser({ fullName: updateData.fullName });

      setSuccessMessage(SUCCESS_MESSAGES.UPDATE_PROFILE_SUCCESS);
      Toast.show({
        type: 'success',
        text1: 'Cập nhật thành công',
        text2: 'Thông tin profile đã được cập nhật',
      });

      // Navigate back after 1 second
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMessage = error.message || 'Không thể cập nhật profile. Vui lòng thử lại.';
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

  const handleCancel = () => {
    Alert.alert(
      'Hủy chỉnh sửa',
      'Bạn có chắc chắn muốn hủy? Các thay đổi sẽ không được lưu.',
      [
        { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
        { text: 'Hủy', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
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
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {successMessage && <SuccessMessage message={successMessage} />}
          {errors.general && <ErrorMessage message={errors.general} />}

          <Input
            label="Full Name"
            value={formData.fullName}
            onChangeText={(text) => handleInputChange('fullName', text)}
            placeholder="Enter your full name"
            error={errors.fullName}
            leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Email"
            value={profileData?.email || user?.email}
            placeholder="Email"
            editable={false}
            leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            placeholder="Enter phone number (optional)"
            keyboardType="phone-pad"
            error={errors.phone}
            leftIcon={<Ionicons name="call-outline" size={20} color={COLORS.gray[600]} />}
          />

          <Input
            label="Address"
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            placeholder="Enter your address (optional)"
            multiline
            numberOfLines={3}
            error={errors.address}
            leftIcon={<Ionicons name="location-outline" size={20} color={COLORS.gray[600]} />}
          />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              size="large"
            />
            
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="outline"
              disabled={loading}
              size="large"
              style={styles.cancelButton}
            />
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
    paddingBottom: SPACING.xl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  changePhotoText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  form: {
    padding: SPACING.lg,
  },
  buttonContainer: {
    marginTop: SPACING.md,
  },
  cancelButton: {
    marginTop: SPACING.md,
  },
});

export default EditProfileScreen;

