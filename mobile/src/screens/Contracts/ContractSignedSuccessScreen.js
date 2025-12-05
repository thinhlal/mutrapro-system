import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getContractById } from "../../services/contractService";

const ContractSignedSuccessScreen = ({ navigation, route }) => {
  const { contractId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [depositInstallment, setDepositInstallment] = useState(null);

  useEffect(() => {
    if (contractId) {
      loadData();
    } else {
      Alert.alert("Error", "Contract ID is required", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [contractId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getContractById(contractId);
      if (response?.status === "success" && response?.data) {
        const contractData = response.data;
        setContract(contractData);

        // Find DEPOSIT installment
        if (contractData.installments && contractData.installments.length > 0) {
          const depositInst = contractData.installments.find(
            (inst) => inst.type === "DEPOSIT"
          );
          if (depositInst) {
            setDepositInstallment(depositInst);
          }
        }
      } else {
        throw new Error("Failed to load contract");
      }
    } catch (error) {
      console.error("Error loading contract:", error);
      Alert.alert("Error", "Failed to load contract information", [
        { text: "OK", onPress: () => navigation.navigate("MyRequests") },
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

  const handlePayDeposit = () => {
    navigation.navigate("PaymentDeposit", { contractId });
  };

  const handleViewContract = () => {
    navigation.navigate("ContractDetail", { contractId });
  };

  const handleGoToDashboard = () => {
    navigation.navigate("MyRequests");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading contract information...</Text>
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.emptyText}>Contract not found</Text>
        <TouchableOpacity style={styles.button} onPress={handleGoToDashboard}>
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const depositAmount = depositInstallment?.amount || 0;
  const depositPercent = contract?.depositPercent || 0;
  const totalPrice = contract?.totalPrice || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Icon & Title */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Contract Signed Successfully!</Text>
          <Text style={styles.successSubtitle}>
            Your contract has been signed and is ready for deposit payment.
          </Text>
        </View>

        {/* Contract Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contract Summary</Text>
          <InfoRow
            icon="document-text-outline"
            label="Contract Number"
            value={contract.contractNumber || contract.contractId}
          />
          <InfoRow
            icon="briefcase-outline"
            label="Service Type"
            value={contract.contractType?.toUpperCase() || "N/A"}
          />
          <InfoRow
            icon="cash-outline"
            label="Total Price"
            value={formatCurrency(totalPrice, contract.currency)}
          />
          <InfoRow
            icon="wallet-outline"
            label="Deposit"
            value={`${depositPercent}% = ${formatCurrency(depositAmount, contract.currency)}`}
          />
          {depositInstallment?.dueDate && (
            <InfoRow
              icon="calendar-outline"
              label="Deposit Due Date"
              value={dayjs(depositInstallment.dueDate).format("DD/MM/YYYY HH:mm")}
            />
          )}
        </View>

        {/* Important Notice */}
        <View style={[styles.card, styles.noticeCard]}>
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={24} color={COLORS.warning} />
            <Text style={styles.noticeTitle}>Important Notice</Text>
          </View>
          <Text style={styles.noticeText}>
            <Text style={styles.noticeBold}>
              To start the work, please pay the deposit.
            </Text>
            {"\n\n"}
            The contract will only become active after the deposit payment is
            completed. The start date will be calculated from the deposit payment
            date.
          </Text>
        </View>

        {/* Payment Section */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <Ionicons name="cash" size={32} color={COLORS.primary} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Deposit Payment Required</Text>
              <Text style={styles.paymentAmount}>
                {formatCurrency(depositAmount, contract.currency)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePayDeposit}
          >
            <Ionicons name="card-outline" size={20} color={COLORS.white} />
            <Text style={styles.payButtonText}>Pay Deposit Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewButton}
            onPress={handleViewContract}
          >
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.viewButtonText}>View Contract</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={handleGoToDashboard}
          >
            <Text style={styles.laterButtonText}>Pay Later</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  successIconContainer: {
    marginBottom: SPACING.md,
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
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
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
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
  noticeCard: {
    backgroundColor: COLORS.warning + "10",
    borderWidth: 1,
    borderColor: COLORS.warning + "30",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  noticeTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  noticeText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 22,
  },
  noticeBold: {
    fontWeight: "700",
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paymentInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  paymentLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  paymentAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.primary,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  payButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  viewButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  laterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  laterButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
  },
});

export default ContractSignedSuccessScreen;

