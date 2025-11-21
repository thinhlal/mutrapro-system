import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, VALIDATION } from '../config/constants';

const OTPInput = ({ value = '', onChange, length = VALIDATION.OTP_LENGTH, error = false }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);

  const handleChangeText = (text, index) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '');
    
    if (digit.length === 0) {
      // Handle backspace
      const newValue = value.split('');
      newValue[index] = '';
      onChange(newValue.join(''));
      
      // Focus previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (digit.length === 1) {
      // Single digit input
      const newValue = value.split('');
      newValue[index] = digit;
      onChange(newValue.join(''));
      
      // Focus next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (digit.length === length) {
      // Paste full OTP
      onChange(digit.substring(0, length));
      inputRefs.current[length - 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => {
        const digit = value[index] || '';
        const isFocused = focusedIndex === index;
        
        return (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.input,
              isFocused && styles.inputFocused,
              digit && styles.inputFilled,
              error && styles.inputError,
            ]}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="number-pad"
            maxLength={length} // Allow paste
            selectTextOnFocus
            autoComplete="off"
            textContentType="oneTimeCode"
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  inputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  inputError: {
    borderColor: COLORS.error,
  },
});

export default OTPInput;

