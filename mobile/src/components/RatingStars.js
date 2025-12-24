import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

/**
 * Component hiển thị rating stars
 * @param {number} value - Rating từ 1-5 (controlled value)
 * @param {boolean} disabled - Disable interaction
 * @param {string} size - Size của stars: 'small' | 'default' | 'large'
 * @param {function} onChange - Callback khi rating thay đổi (value: number)
 */
const RatingStars = ({ value = 0, disabled = false, size = 'default', onChange }) => {
  const starSize = size === 'small' ? 20 : size === 'large' ? 32 : 24;
  const displayValue = value || 0;

  const handleStarPress = (starValue) => {
    if (!disabled && onChange) {
      onChange(starValue);
    }
  };

  const renderStar = (index) => {
    const starValue = index + 1;
    const isFilled = starValue <= displayValue;

    if (disabled) {
      return (
        <Ionicons
          key={index}
          name={isFilled ? 'star' : 'star-outline'}
          size={starSize}
          color={isFilled ? COLORS.warning : COLORS.border}
        />
      );
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleStarPress(starValue)}
        activeOpacity={0.7}
        style={styles.starButton}
      >
        <Ionicons
          name={isFilled ? 'star' : 'star-outline'}
          size={starSize}
          color={isFilled ? COLORS.warning : COLORS.border}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map(index => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
});

export default RatingStars;

