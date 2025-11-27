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
  payMilestone,
} from "../../services/walletService";

const PaymentMilestoneScreen = ({ navigation, route }) => {
  const { contractId, milestoneId, installmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [contract, setContract] = useState(null);
  const [targetMilestone, setTargetMilestone] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");

  useEffect(() => {
    loadData();
  }, [contractId, milestoneId, installmentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load contract
      const contractResponse = await getContractById(contractId);
      if (contractResponse?.status === "success" && contractResponse?.data) {
        const contractData = contractResponse.data;
        setContract(contractData);

        // Validation: Contract must be signed or active to pay milestone
        const contractStatus = contractData.status?.toLowerCase();
        const isCanceled =
          contractStatus === "canceled_by_customer" ||
          contractStatus === "canceled_by_manager";
        const isExpired = contractStatus === "expired";
        const isValidStatus =
          contractStatus === "signed" ||
          contractStatus === "active" ||
          contractStatus === "active_pending_assignment";

        if (isCanceled || isExpired || !isValidStatus) {
          Alert.alert(
            "Invalid Contract Status",
            isCanceled
              ? "Contract has been canceled. Payment is not allowed."
              : isExpired
              ? "Contract has expired. Payment is not allowed."
              : "Contract is not in a valid status for payment.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Check if deposit is paid
        const depositInstallment = contractData.installments?.find(
          (inst) => inst.type === "DEPOSIT"
        );
        const isDepositPaid = depositInstallment?.status === "PAID";

        if (!isDepositPaid) {
          Alert.alert(
            "Deposit Required",
            "Please pay the deposit first before paying milestones.",
            [
              {
                text: "Pay Deposit",
                onPress: () =>
                  navigation.replace("PaymentDeposit", { contractId }),
              },
              { text: "Cancel", style: "cancel", onPress: () => navigation.goBack() },
            ]
          );
          return;
        }

        // Find target milestone and installment
        if (contractData.milestones && contractData.milestones.length > 0) {
          let foundMilestone = null;
          let foundInstallment = null;

          // Find by installmentId if provided
          if (installmentId) {
            foundInstallment = contractData.installments?.find(
              (inst) => inst.installmentId === installmentId && inst.type !== "DEPOSIT"
            );
            if (foundInstallment && foundInstallment.milestoneId) {
              foundMilestone = contractData.milestones.find(
                (m) => m.milestoneId === foundInstallment.milestoneId
              );
            }
          }
          // Find by milestoneId if provided
          else if (milestoneId) {
            foundMilestone = contractData.milestones.find(
              (m) => m.milestoneId === milestoneId && m.hasPayment
            );
            if (foundMilestone) {
              foundInstallment = contractData.installments?.find(
                (inst) =>
                  inst.milestoneId === milestoneId && inst.type !== "DEPOSIT"
              );
            }
          }
          // Otherwise, find first DUE or PENDING milestone
          else {
            foundInstallment =
              contractData.installments?.find(
                (inst) => inst.status === "DUE" && inst.type !== "DEPOSIT"
              ) ||
              contractData.installments?.find(
                (inst) => inst.status === "PENDING" && inst.type !== "DEPOSIT"
              );

            if (foundInstallment && foundInstallment.milestoneId) {
              foundMilestone = contractData.milestones.find(
                (m) => m.milestoneId === foundInstallment.milestoneId
              );
            }
          }

          if (foundMilestone && foundInstallment) {
            // Check if already paid
            if (foundInstallment.status === "PAID") {
              Alert.alert(
                "Already Paid",
                "This milestone has already been paid.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
              return;
            }

            // Check if milestone work is completed or ready for payment
            const workStatus = foundMilestone.workStatus || "PLANNED";
            if (
              workStatus !== "COMPLETED" &&
              workStatus !== "READY_FOR_PAYMENT" &&
              foundInstallment.status !== "DUE"
            ) {
              Alert.alert(
                "Milestone Not Ready",
                "This milestone is not yet ready for payment. Work must be completed first.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
              return;
            }

            setTargetMilestone({
              ...foundMilestone,
              installment: foundInstallment,
            });
          } else {
            Alert.alert(
              "Error",
              "Milestone payment information not found",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
            return;
          }
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

  const getWorkStatusConfig = (status) => {
    const configs = {
      PLANNED: { color: COLORS.textSecondary, text: "Planned" },
      IN_PROGRESS: { color: COLORS.info, text: "In Progress" },
      READY_FOR_PAYMENT: { color: COLORS.warning, text: "Ready for Payment" },
      COMPLETED: { color: COLORS.success, text: "Completed" },
    };
    return configs[status] || { color: COLORS.textSecondary, text: status };
  };

  const handlePayWithWallet = async () => {
    if (!wallet || !targetMilestone || !targetMilestone.installment) {
      Alert.alert("Error", "Wallet or milestone information not available");
      return;
    }

    const installment = targetMilestone.installment;
    const milestoneAmount = parseFloat(installment.amount);
    const walletBalance = parseFloat(wallet.balance || 0);

    if (walletBalance < milestoneAmount) {
      Alert.alert(
        "Insufficient Balance",
        `Your wallet balance is ${formatCurrency(walletBalance, wallet.currency)}. You need ${formatCurrency(milestoneAmount, installment.currency)} to pay this milestone.\n\nWould you like to top up your wallet?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up", onPress: () => setTopupModalVisible(true) },
        ]
      );
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `You are about to pay ${formatCurrency(milestoneAmount, installment.currency)} for milestone "${targetMilestone.name || `Milestone ${targetMilestone.orderIndex || 1}`}".\n\nYour new balance will be ${formatCurrency(walletBalance - milestoneAmount, wallet.currency)}.\n\nProceed with payment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          style: "default",
          onPress: async () => {
            try {
              setPaying(true);

              const response = await payMilestone(wallet.walletId, {
                amount: milestoneAmount,
                currency: installment.currency || contract?.currency || "VND",
                contractId: contractId,
                milestoneId: targetMilestone.milestoneId,
                installmentId: installment.installmentId,
                orderIndex: targetMilestone.orderIndex,
              });

              if (response?.status === "success") {
                Alert.alert(
                  "Payment Successful",
                  "Milestone payment has been processed successfully!",
                  [
                    {
                      text: "OK",
                      onPress: () =>
                        navigation.navigate("ContractDetail", { contractId }),
                    },
                  ]
                );
              }
            } catch (error) {
              console.error("Error paying milestone:", error);
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

  if (!contract || !targetMilestone) {
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

  const installment = targetMilestone.installment;
  const milestoneAmount = parseFloat(installment.amount);
  const walletBalance = parseFloat(wallet?.balance || 0);
  const hasSufficientBalance = walletBalance >= milestoneAmount;
  const workStatusConfig = getWorkStatusConfig(targetMilestone.workStatus || "PLANNED");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay Milestone</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Contract Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contract Information</Text>
          <InfoRow
            icon="document-text-outline"
            label="Contract Number"
            value={contract.contractNumber || "N/A"}
          />
          <InfoRow
            icon="briefcase-outline"
            label="Contract Type"
            value={contract.contractType?.toUpperCase() || "N/A"}
          />
          <InfoRow
            icon="cash-outline"
            label="Total Price"
            value={formatCurrency(contract.totalPrice, contract.currency)}
          />
        </View>

        {/* Milestone Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Milestone Details</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: workStatusConfig.color + "15" },
              ]}
            >
              <Text style={[styles.statusText, { color: workStatusConfig.color }]}>
                {workStatusConfig.text}
              </Text>
            </View>
          </View>
          <Text style={styles.milestoneName}>
            {targetMilestone.name || `Milestone ${targetMilestone.orderIndex || 1}`}
          </Text>
          {targetMilestone.description && (
            <Text style={styles.milestoneDescription}>{targetMilestone.description}</Text>
          )}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Amount to Pay</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(milestoneAmount, installment.currency)}
            </Text>
            {installment.percent && (
              <Text style={styles.amountDescription}>
                {installment.percent}% of total contract value
              </Text>
            )}
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
                    {formatCurrency(milestoneAmount - walletBalance, wallet.currency)} more
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
              <Text style={styles.summaryLabel}>Milestone Amount</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                -{formatCurrency(milestoneAmount, installment.currency)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>New Balance</Text>
              <Text style={styles.summaryValueBold}>
                {formatCurrency(walletBalance - milestoneAmount, wallet.currency)}
              </Text>
            </View>
          </View>
        )}

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!hasSufficientBalance || paying) && styles.payButtonDisabled,
          ]}
          onPress={handlePayWithWallet}
          disabled={!hasSufficientBalance || paying}
        >
          {paying ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color={COLORS.white} />
              <Text style={styles.payButtonText}>Pay with Wallet</Text>
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
                  Suggested: {formatCurrency(milestoneAmount - walletBalance + 10000)}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBackButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
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
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  topupLink: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  milestoneName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  milestoneDescription: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 22,
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
  inputLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
  inputHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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

export default PaymentMilestoneScreen;

