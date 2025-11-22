import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";
import { getNotationInstruments } from "../services/instrumentService";
import { formatPrice } from "../services/pricingMatrixService";

const InstrumentPicker = ({
  serviceType,
  selectedInstruments = [],
  onSelectInstruments,
  multipleSelection = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tempSelection, setTempSelection] = useState(selectedInstruments);

  // Fetch instruments when modal opens
  useEffect(() => {
    if (modalVisible) {
      fetchInstruments();
    }
  }, [modalVisible, serviceType]);

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const usage =
        serviceType === "transcription"
          ? "transcription"
          : serviceType === "arrangement" || serviceType === "arrangement_with_recording"
          ? "arrangement"
          : "both";

      const response = await getNotationInstruments({ usage });
      if (response.status === "success" && response.data) {
        setInstruments(response.data);
      }
    } catch (error) {
      console.error("Error fetching instruments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstrument = (instrumentId) => {
    if (multipleSelection) {
      // Multiple selection
      if (tempSelection.includes(instrumentId)) {
        setTempSelection(tempSelection.filter((id) => id !== instrumentId));
      } else {
        setTempSelection([...tempSelection, instrumentId]);
      }
    } else {
      // Single selection - close modal immediately
      setTempSelection([instrumentId]);
      onSelectInstruments([instrumentId]);
      setModalVisible(false);
    }
  };

  const handleConfirm = () => {
    onSelectInstruments(tempSelection);
    setModalVisible(false);
  };

  const handleClose = () => {
    setTempSelection(selectedInstruments);
    setModalVisible(false);
  };

  const getSelectedInstrumentsDisplay = () => {
    if (selectedInstruments.length === 0) {
      return "Select Instrument(s)";
    }
    const names = selectedInstruments
      .map((id) => {
        const inst = instruments.find((i) => i.instrumentId === id);
        return inst ? inst.instrumentName : null;
      })
      .filter(Boolean);
    
    if (names.length === 0) return "Select Instrument(s)";
    return names.join(", ");
  };

  // Calculate total price
  const getTotalPrice = () => {
    if (tempSelection.length === 0) return 0;
    return instruments
      .filter((inst) => tempSelection.includes(inst.instrumentId))
      .reduce((sum, inst) => sum + (inst.basePrice || 0), 0);
  };

  const renderInstrumentItem = ({ item }) => {
    const isSelected = multipleSelection
      ? tempSelection.includes(item.instrumentId)
      : tempSelection[0] === item.instrumentId;

    return (
      <TouchableOpacity
        style={[styles.instrumentItem, isSelected && styles.instrumentItemSelected]}
        onPress={() => handleSelectInstrument(item.instrumentId)}
        activeOpacity={0.7}
      >
        {/* Instrument Image */}
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.instrumentImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="musical-note" size={24} color={COLORS.gray[400]} />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
          )}
          {/* Price Badge */}
          {item.basePrice > 0 && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>
                {formatPrice(item.basePrice, item.currency || "VND")}
              </Text>
            </View>
          )}
        </View>

        {/* Instrument Info */}
        <View style={styles.instrumentInfo}>
          <Text
            style={[styles.instrumentName, isSelected && styles.instrumentNameSelected]}
            numberOfLines={2}
          >
            {item.instrumentName}
          </Text>
          {item.displayNameVi && (
            <Text style={styles.instrumentNameVi} numberOfLines={1}>
              {item.displayNameVi}
            </Text>
          )}
          {item.usage && (
            <View style={styles.usageBadge}>
              <Text style={styles.usageText}>
                {item.usage === "both" ? "All Services" : item.usage}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectButtonContent}>
          <Ionicons name="musical-notes-outline" size={20} color={COLORS.primary} />
          <Text style={styles.selectButtonText} numberOfLines={1}>
            {getSelectedInstrumentsDisplay()}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  Select Instrument{multipleSelection ? "s" : ""}
                </Text>
                {tempSelection.length > 0 && (
                  <View style={styles.headerBadges}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{tempSelection.length}</Text>
                    </View>
                    {getTotalPrice() > 0 && (
                      <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>
                          {formatPrice(getTotalPrice(), "VND")}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Instruments List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading instruments...</Text>
              </View>
            ) : (
              <FlatList
                data={instruments}
                renderItem={renderInstrumentItem}
                keyExtractor={(item) => item.instrumentId}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={true}
              />
            )}

            {/* Helper Text */}
            <View style={styles.helperTextContainer}>
              <Text style={styles.helperText}>
                {multipleSelection
                  ? "You can select multiple instruments. Tap to toggle selection."
                  : "Tap on an instrument to select it"}
              </Text>
            </View>

            {/* Confirm Button - Only for multiple selection */}
            {multipleSelection && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    tempSelection.length === 0 && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={tempSelection.length === 0}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirm ({tempSelection.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  countBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  totalBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  totalBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  closeButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    padding: SPACING.xl * 2,
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SPACING.md,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  instrumentItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    margin: SPACING.xs,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.gray[200],
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
  instrumentItemSelected: {
    borderColor: COLORS.success,
    borderWidth: 3,
  },
  imageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: COLORS.gray[100],
    position: "relative",
  },
  instrumentImage: {
    width: "100%",
    height: "100%",
  },
  noImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gray[200],
  },
  selectedBadge: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  priceBadge: {
    position: "absolute",
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  priceText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: "bold",
  },
  instrumentInfo: {
    padding: SPACING.sm,
  },
  instrumentName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  instrumentNameSelected: {
    color: COLORS.primary,
  },
  instrumentNameVi: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  usageBadge: {
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  usageText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: "500",
  },
  helperTextContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalFooter: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
});

export default InstrumentPicker;

