import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../config/constants';

const ErrorMessage = ({ message, style }) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle" size={20} color={COLORS.error} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
});

export default ErrorMessage;

