import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getContractById } from "../../services/contractService";
import {
  getOrCreateMyWallet,
  topupWallet,
  payRevisionFee,
} from "../../services/walletService";

const PaymentRevisionFeeScreen = ({ navigation, route }) => {
  const { contractId, milestoneId, submissionId, taskAssignmentId, feeAmount, title, description, revisionRound } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [contract, setContract] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");

  // Revision form state (if not provided in params)
  const [revisionTitle, setRevisionTitle] = useState(title || "");
  const [revisionDescription, setRevisionDescription] = useState(description || "");

  useEffect(() => {
    if (!contractId || !feeAmount || !submissionId || !taskAssignmentId) {
      Alert.alert(
        "Missing Information",
        "Missing required information for revision fee payment",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }
    loadData();
  }, [contractId, feeAmount, submissionId, taskAssignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load contract
      const contractResponse = await getContractById(contractId);
      if (contractResponse?.status === "success" && contractResponse?.data) {
        const contractData = contractResponse.data;
        setContract(contractData);

        // Validation: Contract phải ở trạng thái hợp lệ
        const contractStatus = contractData.status?.toLowerCase();
        const isCanceled =
          contractStatus === "canceled_by_customer" ||
          contractStatus === "canceled_by_manager";
        const isExpired = contractStatus === "expired";

        if (isCanceled || isExpired) {
          Alert.alert(
            "Invalid Contract Status",
            isCanceled
              ? "Contract has been canceled. Payment is not allowed."
              : "Contract has expired. Payment is not allowed.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
          return;
        }
      }

      // Load wallet
      try {
        const walletResponse = await getOrCreateMyWallet();
        if (walletResponse?.status === "success" && walletResponse?.data) {
          setWallet(walletResponse.data);
        }
      } catch (error) {
        console.warn("Failed to load wallet:", error);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load payment information", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = "VND") => {
    if (!amount) return "0 ₫";
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const handlePayWithWallet = async () => {
    if (!wallet || !feeAmount) {
      Alert.alert("Error", "Wallet or fee amount information not available");
      return;
    }

    const amount = parseFloat(feeAmount);
    const availableBalance = wallet?.availableBalance ?? 
      (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);
    const walletBalance = parseFloat(availableBalance);

    if (walletBalance < amount) {
      Alert.alert(
        "Insufficient Balance",
        `Your wallet balance is ${formatCurrency(walletBalance, wallet.currency)}. You need ${formatCurrency(amount, contract?.currency || "VND")} to pay this revision fee.\n\nWould you like to top up your wallet?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up", onPress: () => setTopupModalVisible(true) },
        ]
      );
      return;
    }

    // Validate title and description
    const finalTitle = revisionTitle.trim() || title;
    const finalDescription = revisionDescription.trim() || description;

    if (!finalTitle) {
      Alert.alert("Validation Error", "Please enter revision title");
      return;
    }
    if (!finalDescription) {
      Alert.alert("Validation Error", "Please enter revision description");
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `You are about to pay ${formatCurrency(amount, contract?.currency || "VND")} for revision fee.\n\nYour new balance will be ${formatCurrency(walletBalance - amount, wallet.currency)}.\n\nProceed with payment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          style: "default",
          onPress: async () => {
            try {
              setPaying(true);

              const response = await payRevisionFee(wallet.walletId, {
                amount: amount,
                currency: contract?.currency || "VND",
                contractId: contractId,
                milestoneId: milestoneId,
                taskAssignmentId: taskAssignmentId,
                submissionId: submissionId,
                revisionRound: revisionRound,
                title: finalTitle,
                description: finalDescription,
              });

              if (response?.status === "success") {
                Alert.alert(
                  "Payment Successful",
                  "Revision fee payment has been processed successfully! Revision request will be created automatically.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Navigate back to milestone deliveries
                        if (milestoneId && contractId) {
                          navigation.navigate("MilestoneDeliveries", {
                            contractId,
                            milestoneId,
                          });
                        } else {
                          navigation.navigate("ContractDetail", { contractId });
                        }
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              console.error("Error paying revision fee:", error);
              Alert.alert(
                "Payment Failed",
                error?.message || "Failed to process payment. Please try again."
              );
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 1000) {
      Alert.alert("Invalid Amount", "Minimum top-up amount is 1,000 VND");
      return;
    }

    try {
      setPaying(true);
      const response = await topupWallet(wallet.walletId, {
        amount: amount,
        currency: "VND",
      });

      if (response?.status === "success") {
        Alert.alert("Success", "Top-up successful!");
        setTopupModalVisible(false);
        setTopupAmount("");
        await loadData();
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to top up");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </View>
    );
  }

  if (!contract || !feeAmount) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Payment information not available</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const amount = parseFloat(feeAmount);
  const availableBalance = wallet?.availableBalance ?? 
    (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);
  const walletBalance = parseFloat(availableBalance);
  const hasSufficientBalance = walletBalance >= amount;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Contract Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contract Information</Text>
          <InfoRow
            icon="document-text-outline"
            label="Contract Number"
            value={contract.contractNumber || "N/A"}
          />
          {revisionRound && (
            <InfoRow
              icon="repeat-outline"
              label="Revision Round"
              value={`#${revisionRound}`}
            />
          )}
        </View>

        {/* Revision Request Form (if title/description not provided) */}
        {(!title || !description) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revision Request Details</Text>
            <Text style={styles.inputLabel}>Revision Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter revision title (e.g., Need to adjust tempo)"
              value={revisionTitle}
              onChangeText={setRevisionTitle}
              maxLength={255}
            />
            <Text style={styles.inputHint}>
              {revisionTitle.length}/255 characters
            </Text>

            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>
              Revision Description *
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Enter detailed description of what needs to be revised..."
              value={revisionDescription}
              onChangeText={setRevisionDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
            <Text style={styles.inputHint}>
              {revisionDescription.length}/2000 characters
            </Text>
          </View>
        )}

        {/* Revision Info (if provided) */}
        {(title || description) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revision Request</Text>
            {title && (
              <InfoRow
                icon="text-outline"
                label="Title"
                value={title}
              />
            )}
            {description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>{description}</Text>
              </View>
            )}
          </View>
        )}

        {/* Payment Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Revision Fee</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(amount, contract?.currency || "VND")}
            </Text>
            <Text style={styles.amountDescription}>
              Additional revision fee (free revisions exhausted)
            </Text>
          </View>
        </View>

        {/* Wallet Info Card */}
        {wallet && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Wallet</Text>
              <TouchableOpacity onPress={() => setTopupModalVisible(true)}>
                <Text style={styles.topupLink}>Top Up</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.walletBox,
                {
                  borderColor: hasSufficientBalance
                    ? COLORS.success
                    : COLORS.warning,
                },
              ]}
            >
              <View style={styles.walletHeader}>
                <Ionicons
                  name="wallet-outline"
                  size={24}
                  color={hasSufficientBalance ? COLORS.success : COLORS.warning}
                />
                <Text style={styles.walletLabel}>Available Balance</Text>
              </View>
              <Text style={styles.walletBalance}>
                {formatCurrency(walletBalance, wallet.currency)}
              </Text>
              {!hasSufficientBalance && (
                <View style={styles.insufficientBadge}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                  <Text style={styles.insufficientText}>
                    Insufficient balance. Need{" "}
                    {formatCurrency(amount - walletBalance, wallet.currency)} more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Balance After Payment */}
        {wallet && hasSufficientBalance && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Current Balance</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(walletBalance, wallet.currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Revision Fee</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                -{formatCurrency(amount, contract?.currency || "VND")}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>New Balance</Text>
              <Text style={styles.summaryValueBold}>
                {formatCurrency(walletBalance - amount, wallet.currency)}
              </Text>
            </View>
          </View>
        )}

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!hasSufficientBalance || paying || (!revisionTitle.trim() && !title) || (!revisionDescription.trim() && !description)) && styles.payButtonDisabled,
          ]}
          onPress={handlePayWithWallet}
          disabled={!hasSufficientBalance || paying || (!revisionTitle.trim() && !title) || (!revisionDescription.trim() && !description)}
        >
          {paying ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color={COLORS.white} />
              <Text style={styles.payButtonText}>Pay Revision Fee</Text>
            </>
          )}
        </TouchableOpacity>

        {!hasSufficientBalance && (
          <TouchableOpacity
            style={styles.topupButton}
            onPress={() => setTopupModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.topupButtonText}>Top Up Wallet</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Top-up Modal */}
      <Modal
        visible={topupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTopupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setTopupModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount (VND)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={topupAmount}
                onChangeText={setTopupAmount}
              />
              <Text style={styles.inputHint}>Minimum: 1,000 VND</Text>
              {!hasSufficientBalance && (
                <Text style={styles.inputHint}>
                  Suggested: {formatCurrency(amount - walletBalance + 10000)}
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setTopupModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  paying && styles.modalButtonDisabled,
                ]}
                onPress={handleTopup}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Top Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper Component
const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  topupLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  infoValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  descriptionBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  descriptionLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  descriptionText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  amountBox: {
    backgroundColor: COLORS.primary + "10",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary + "30",
  },
  amountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  amountValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "700",
    color: COLORS.primary,
    marginVertical: SPACING.xs,
  },
  amountDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  walletBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  walletLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  walletBalance: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
  },
  insufficientBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.warning + "15",
    borderRadius: BORDER_RADIUS.sm,
  },
  insufficientText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    marginLeft: SPACING.xs,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  summaryLabelBold: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  summaryValueBold: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.success,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  topupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  topupButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  amountInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
  },
  modalConfirmButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});

export default PaymentRevisionFeeScreen;

