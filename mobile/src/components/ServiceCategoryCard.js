import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
} from "../config/constants";
import { formatPrice } from "../services/pricingMatrixService";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - SPACING.lg * 2;

const ServiceCategoryCard = ({ item, onPress }) => {
  // Map serviceType to display name
  const getServiceTypeName = (serviceType) => {
    if (!serviceType) return "";

    const serviceTypeMap = {
      transcription: "Transcription",
      arrangement: "Arrangement",
      arrangement_with_recording: "Arrangement / Record",
      recording: "Recording",
      orchestration: "Orchestration",
      mixing: "Mixing",
      mastering: "Mastering",
      composition: "Composition",
      notation: "Notation",
      consultation: "Consultation",
      lesson: "Lesson",
    };

    return (
      serviceTypeMap[serviceType.toLowerCase()] ||
      serviceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Get description from API pricing if available, otherwise use default
  const getDescription = () => {
    if (item.pricing?.description) {
      return item.pricing.description;
    }
    return item.description;
  };

  const getPriceDisplay = () => {
    if (!item.pricing) return null;

    const { basePrice, currency, unitType } = item.pricing;
    const unitLabel = unitType === "per_minute" ? "/min" : "/song";

    return `${formatPrice(basePrice, currency)}${unitLabel}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.8}
    >
      {/* Image Section - Left Side */}
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.image} />
        <LinearGradient
          colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)"]}
          style={styles.imageOverlay}
        />
      </View>

      {/* Content Section - Right Side */}
      <View style={styles.contentContainer}>
        {/* Price Badge */}
        {item.pricing && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{getPriceDisplay()}</Text>
          </View>
        )}

        {/* Title & Description */}
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>
            {getServiceTypeName(item.serviceType)}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {getDescription()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 140,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    marginBottom: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    width: "40%",
    height: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: "space-between",
  },
  priceBadge: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  priceText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
  },
  textContent: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: FONT_SIZES.md,

    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ServiceCategoryCard;
