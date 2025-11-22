import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { calculatePrice, formatPrice, getPricingDetail } from "../../services/pricingMatrixService";
import { createServiceRequest } from "../../services/serviceRequestService";
import { getNotationInstrumentsByIds } from "../../services/instrumentService";

const SERVICE_TYPE_LABELS = {
  transcription: "Transcription (Sound → Sheet)",
  arrangement: "Arrangement",
  arrangement_with_recording: "Arrangement + Recording (with Vocalist)",
  recording: "Recording (Studio Booking)",
};

const ServiceQuoteScreen = ({ route, navigation }) => {
  const { formData, uploadedFile, serviceType } = route.params || {};

  const [priceData, setPriceData] = useState(null);
  const [servicePricing, setServicePricing] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!formData || !formData.durationMinutes) {
      Alert.alert("Error", "Missing required data. Please go back and complete the form.");
      navigation.goBack();
      return;
    }

    fetchPricingData();
    fetchInstruments();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      
      // Fetch calculated price
      const priceResponse = await calculatePrice(
        serviceType,
        formData.durationMinutes
      );

      if (priceResponse.status === "success" && priceResponse.data) {
        setPriceData(priceResponse.data);
      }

      // Fetch service pricing detail
      const servicePricingResponse = await getPricingDetail(serviceType);
      if (servicePricingResponse.status === "success" && servicePricingResponse.data) {
        setServicePricing(servicePricingResponse.data);
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
      Alert.alert("Error", "Unable to calculate price. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstruments = async () => {
    if (formData.instrumentIds && formData.instrumentIds.length > 0) {
      try {
        const response = await getNotationInstrumentsByIds(formData.instrumentIds);
        if (response.status === "success" && response.data) {
          setInstruments(response.data);
        }
      } catch (error) {
        console.error("Error fetching instruments:", error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate
      if (!uploadedFile) {
        Alert.alert("Error", "Audio file is required.");
        return;
      }

      // Prepare request data
      const requestData = {
        requestType: serviceType,
        title: formData.title,
        description: formData.description,
        tempoPercentage: formData.tempoPercentage || 100,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        instrumentIds: formData.instrumentIds || [],
        durationMinutes: formData.durationMinutes,
        hasVocalist: formData.hasVocalist || false,
        externalGuestCount: formData.externalGuestCount || 0,
        musicOptions: formData.musicOptions || null,
        files: [uploadedFile],
      };

      // Call API
      await createServiceRequest(requestData);

      // Success
      Alert.alert(
        "Success",
        "Service request created successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to home
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "MainTabs",
                    params: { screen: "Home" },
                  },
                ],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error creating request:", error);
      const errorMessage =
        error?.message || error?.data?.message || "Failed to create request. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "—";
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Calculating price...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review Your Quote</Text>
        <Text style={styles.headerSubtitle}>
          Please review your service request details and pricing before submitting.
        </Text>
      </View>

      {/* Service Details Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Service Details</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service Type</Text>
          <View style={styles.serviceBadge}>
            <Text style={styles.serviceBadgeText}>
              {SERVICE_TYPE_LABELS[serviceType] || serviceType}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Title</Text>
          <Text style={styles.detailValue}>{formData.title}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description</Text>
          <Text style={styles.detailValue}>{formData.description}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={[styles.detailValue, styles.durationText]}>
            {formatDuration(formData.durationMinutes)} ({formData.durationMinutes.toFixed(2)} min)
          </Text>
        </View>

        {uploadedFile && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>File</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {uploadedFile.name}
            </Text>
          </View>
        )}

        {instruments.length > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Instruments</Text>
            <View style={styles.instrumentsContainer}>
              {instruments.map((inst) => (
                <View key={inst.instrumentId} style={styles.instrumentBadge}>
                  <Text style={styles.instrumentBadgeText}>
                    {inst.instrumentName}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Contact Information Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Contact Information</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Name</Text>
          <Text style={styles.detailValue}>{formData.contactName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{formData.contactEmail}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{formData.contactPhone}</Text>
        </View>
      </View>

      {/* Service & Instruments Pricing Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pricetag" size={24} color={COLORS.warning} />
          <Text style={styles.cardTitle}>Service & Instruments Pricing</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingContentText}>Loading pricing information...</Text>
          </View>
        ) : (
          <>
            {/* Selected Service */}
            <Text style={styles.sectionLabel}>Selected Service:</Text>
            <View style={styles.serviceInfoCard}>
              <View style={styles.serviceInfoContent}>
                <Text style={styles.serviceInfoTitle}>
                  {SERVICE_TYPE_LABELS[serviceType] || serviceType}
                </Text>
                {servicePricing?.description && (
                  <Text style={styles.serviceInfoDescription}>
                    {servicePricing.description}
                  </Text>
                )}
              </View>
              {servicePricing ? (
                <View style={styles.servicePriceBadge}>
                  <Text style={styles.servicePriceText}>
                    {formatPrice(servicePricing.basePrice, servicePricing.currency)}
                  </Text>
                  <Text style={styles.serviceUnitText}>
                    / {servicePricing.unitType === "per_minute" ? "min" : "song"}
                  </Text>
                </View>
              ) : (
                <View style={styles.servicePriceBadge}>
                  <Text style={styles.servicePriceText}>N/A</Text>
                </View>
              )}
            </View>

            {/* Selected Instruments */}
            {instruments.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>
                  Selected Instruments:
                </Text>
                {instruments.map((inst) => (
                  <View key={inst.instrumentId} style={styles.instrumentRow}>
                    <View style={styles.instrumentRowLeft}>
                      <View style={styles.usageTag}>
                        <Text style={styles.usageTagText}>
                          {inst.usage === "both" ? "All Services" : inst.usage}
                        </Text>
                      </View>
                      <Text style={styles.instrumentRowName}>{inst.instrumentName}</Text>
                    </View>
                    <Text style={styles.instrumentRowPrice}>
                      {formatPrice(inst.basePrice || 0, servicePricing?.currency || "VND")}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>

      {/* Price Calculation Card */}
      {priceData && (
        <View style={[styles.card, styles.pricingCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calculator" size={24} color={COLORS.success} />
            <Text style={styles.cardTitle}>Price Calculation</Text>
          </View>

          {/* Estimated Total Alert */}
          <View style={styles.totalAlert}>
            <View style={styles.totalAlertHeader}>
              <Ionicons name="cash-outline" size={24} color={COLORS.success} />
              <Text style={styles.totalAlertTitle}>Estimated Total</Text>
            </View>
            <Text style={styles.totalAlertValue}>
              {formatPrice(priceData.totalPrice, priceData.currency)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Breakdown */}
          <Text style={styles.sectionLabel}>Breakdown:</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Rate</Text>
            <Text style={styles.breakdownValue}>
              {formatPrice(priceData.basePrice, priceData.currency)} / minute
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Duration</Text>
            <Text style={styles.breakdownValue}>
              {formatDuration(formData.durationMinutes)} ({formData.durationMinutes.toFixed(2)} min)
            </Text>
          </View>

          {priceData.instrumentPrices && priceData.instrumentPrices.length > 0 && (
            <>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Instruments</Text>
                <Text style={styles.breakdownValue}>
                  {priceData.instrumentPrices.length} selected
                </Text>
              </View>
              {priceData.instrumentPrices.map((item, index) => (
                <View key={index} style={styles.breakdownSubRow}>
                  <Text style={styles.breakdownSubLabel}>• {item.instrumentName}</Text>
                  <Text style={styles.breakdownSubValue}>
                    {formatPrice(item.price, priceData.currency)}
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownValue}>
              {formatPrice(priceData.totalPrice, priceData.currency)}
            </Text>
          </View>

          {/* Notes */}
          {priceData.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.noteContainer}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={styles.noteText}>{priceData.notes}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>
              {formatPrice(priceData.totalPrice, priceData.currency)}
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || loading || !priceData}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </>
          ) : (
            <>
              <Text style={styles.submitButtonText}>Confirm & Submit</Text>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  loadingContentText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  detailRow: {
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 22,
  },
  durationText: {
    color: COLORS.success,
    fontWeight: "600",
  },
  serviceBadge: {
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  serviceBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  instrumentsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  instrumentBadge: {
    backgroundColor: COLORS.warning + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  instrumentBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: "500",
  },
  pricingCard: {
    backgroundColor: COLORS.success + "05",
    borderWidth: 1,
    borderColor: COLORS.success + "30",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  priceLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  priceValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  serviceInfoCard: {
    backgroundColor: COLORS.primary + "10",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  serviceInfoContent: {
    flex: 1,
  },
  serviceInfoTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  serviceInfoDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  servicePriceBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
  },
  servicePriceText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
    color: COLORS.white,
  },
  serviceUnitText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    marginTop: 2,
  },
  instrumentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  instrumentRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  usageTag: {
    backgroundColor: COLORS.warning + "20",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  usageTagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    fontWeight: "500",
  },
  instrumentRowName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  instrumentRowPrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.success,
  },
  totalAlert: {
    backgroundColor: COLORS.success + "15",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.success + "40",
    marginBottom: SPACING.md,
  },
  totalAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  totalAlertTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  totalAlertValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.success,
    textAlign: "center",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  breakdownLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  breakdownSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
    marginLeft: SPACING.md,
  },
  breakdownSubLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  breakdownSubValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.text,
  },
  noteContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.info + "10",
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  noteText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    marginLeft: SPACING.xs,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.success,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  backButton: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  backButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  submitButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "bold",
    color: COLORS.white,
    marginHorizontal: SPACING.sm,
  },
});

export default ServiceQuoteScreen;

