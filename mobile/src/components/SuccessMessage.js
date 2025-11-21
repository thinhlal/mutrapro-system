import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../config/constants';

const SuccessMessage = ({ message, style }) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
});

export default SuccessMessage;

