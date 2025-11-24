import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../../config/constants";

const WalletScreenSimple = ({ navigation }) => {
  console.log("🟢 WALLET SCREEN IS RENDERING!");
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>💳 WALLET SCREEN</Text>
        <Text style={styles.subtitle}>This is a test screen</Text>
        <Text style={styles.info}>If you see this, navigation is working!</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  info: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
  },
});

export default WalletScreenSimple;

