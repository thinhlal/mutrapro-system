import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../config/constants';
import RatingStars from './RatingStars';

/**
 * Modal để customer rate task assignment, request, hoặc participant
 * @param {boolean} visible - Modal visible state
 * @param {function} onCancel - Callback khi cancel
 * @param {function} onConfirm - Callback khi submit review (rating, comment)
 * @param {boolean} loading - Loading state
 * @param {string} type - Loại review: 'task' | 'request' | 'participant'
 * @param {string} title - Title tùy chỉnh (optional)
 * @param {string} description - Description tùy chỉnh (optional)
 * @param {Object} existingReview - Review đã tồn tại (nếu có) - để hiển thị readonly
 * @param {string} position - Vị trí modal: 'bottom' | 'center' (default: 'center')
 */
const ReviewModal = ({
  visible,
  onCancel,
  onConfirm,
  loading,
  type = 'task',
  title,
  description,
  existingReview,
  position = 'center',
}) => {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      if (existingReview) {
        // Nếu đã có review, hiển thị readonly
        setRating(existingReview.rating || 0);
        setComment(existingReview.comment || '');
      } else {
        // Reset form khi mở modal mới
        setRating(0);
        setComment('');
      }
    }
  }, [visible, existingReview]);

  const handleConfirm = async () => {
    if (existingReview) {
      // Nếu đã có review, chỉ đóng modal
      onCancel?.();
      return;
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      Alert.alert('Error', 'Please select a rating from 1 to 5 stars');
      return;
    }

    // Validate comment length
    if (comment && comment.length > 1000) {
      Alert.alert('Error', 'Comment cannot exceed 1000 characters');
      return;
    }

    try {
      await onConfirm({
        rating,
        comment: comment.trim() || '',
      });

      // Reset form after successful submit
      setRating(0);
      setComment('');
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error submitting review:', error);
    }
  };

  const handleCancel = () => {
    setRating(0);
    setComment('');
    onCancel?.();
  };

  const getModalTitle = () => {
    if (title) return title;
    if (existingReview) {
      return 'Your Review';
    }
    switch (type) {
      case 'task':
        return 'Rate Task Assignment';
      case 'request':
        return 'Rate Request';
      case 'participant':
        return 'Rate Artist';
      default:
        return 'Rate';
    }
  };

  const getModalDescription = () => {
    if (description) return description;
    if (existingReview) {
      return 'You have already left a review. You can only view your review again.';
    }
    switch (type) {
      case 'task':
        return 'Please rate the quality of work by the specialist for this task assignment.';
      case 'request':
        return 'Please rate your overall service experience for this request.';
      case 'participant':
        return 'Please rate the performance quality of this artist in the recording session.';
      default:
        return 'Please rate.';
    }
  };

  const isCenter = position === 'center';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isCenter ? 'fade' : 'slide'}
      onRequestClose={handleCancel}
    >
      <View style={[styles.overlay, isCenter && styles.overlayCenter]}>
        <View style={[
          styles.container,
          isCenter ? styles.containerCenter : { paddingBottom: insets.bottom },
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getModalTitle()}</Text>
            <TouchableOpacity onPress={handleCancel} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <Text style={styles.description}>{getModalDescription()}</Text>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Rating {!existingReview && '*'}
              </Text>
              <View style={styles.ratingContainer}>
                <RatingStars
                  value={rating}
                  onChange={setRating}
                  disabled={!!existingReview}
                  size="default"
                />
                {rating > 0 && !existingReview && (
                  <Text style={styles.ratingText}>{rating} / 5 stars</Text>
                )}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.label}>Comment (Optional)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  existingReview && styles.textInputDisabled,
                ]}
                value={comment}
                onChangeText={setComment}
                placeholder="Enter your detailed feedback (optional)..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={6}
                maxLength={1000}
                editable={!existingReview && !loading}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {comment.length} / 1000 characters
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (existingReview || loading) && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!!existingReview || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {existingReview ? 'Close' : 'Submit Review'}
                </Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    maxHeight: '95%',
    height: '85%',
  },
  containerCenter: {
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    minHeight: '60%',
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    minHeight: 120,
    backgroundColor: COLORS.white,
  },
  textInputDisabled: {
    backgroundColor: COLORS.gray[100],
    color: COLORS.textSecondary,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray[200],
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.6,
  },
});

export default ReviewModal;

