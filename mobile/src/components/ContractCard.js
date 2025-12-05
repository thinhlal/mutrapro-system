import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../config/constants";

const ContractCard = ({ contract, onApprove, onRequestChange, onCancel, loading }) => {
  const formatCurrency = (amount, currency = "VND") => {
    if (amount === undefined || amount === null || isNaN(amount)) return "N/A";
    if (currency === "VND") {
      return `${amount.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to get deposit amount (similar to frontend)
  const getDepositAmount = (contract) => {
    if (!contract) return null;

    // 1. Check depositAmount field first
    if (
      contract.depositAmount !== undefined &&
      contract.depositAmount !== null &&
      !isNaN(contract.depositAmount) &&
      Number(contract.depositAmount) > 0
    ) {
      return Number(contract.depositAmount);
    }

    // 2. Check from installments with type DEPOSIT
    const depositInstallment = contract.installments?.find(
      (inst) => inst.type === "DEPOSIT"
    );
    if (
      depositInstallment &&
      depositInstallment.amount !== undefined &&
      depositInstallment.amount !== null &&
      !isNaN(depositInstallment.amount) &&
      Number(depositInstallment.amount) > 0
    ) {
      return Number(depositInstallment.amount);
    }

    // 3. Calculate from totalPrice * depositPercent / 100
    if (
      contract.totalPrice !== undefined &&
      contract.totalPrice !== null &&
      contract.depositPercent !== undefined &&
      contract.depositPercent !== null
    ) {
      const totalPriceNumber = Number(contract.totalPrice);
      const depositPercentNumber = Number(contract.depositPercent);
      if (
        !isNaN(totalPriceNumber) &&
        !isNaN(depositPercentNumber) &&
        totalPriceNumber > 0 &&
        depositPercentNumber > 0
      ) {
        return (totalPriceNumber * depositPercentNumber) / 100;
      }
    }

    return null;
  };

  // Get deposit info
  const depositAmount = getDepositAmount(contract);
  const depositPercent =
    contract.depositPercent !== undefined && contract.depositPercent !== null
      ? Number(contract.depositPercent)
      : null;

  const getStatusConfig = (status) => {
    const configs = {
      DRAFT: {
        color: COLORS.textSecondary,
        icon: "document-outline",
        text: "Draft",
        bgColor: COLORS.textSecondary + "15",
      },
      SENT: {
        color: COLORS.info,
        icon: "paper-plane-outline",
        text: "Sent",
        bgColor: COLORS.info + "15",
      },
      APPROVED: {
        color: COLORS.success,
        icon: "checkmark-circle-outline",
        text: "Approved",
        bgColor: COLORS.success + "15",
      },
      SIGNED: {
        color: COLORS.primary,
        icon: "ribbon-outline",
        text: "Signed",
        bgColor: COLORS.primary + "15",
      },
      CHANGE_REQUESTED: {
        color: COLORS.warning,
        icon: "create-outline",
        text: "Change Requested",
        bgColor: COLORS.warning + "15",
      },
      CANCELLED: {
        color: COLORS.error,
        icon: "close-circle-outline",
        text: "Cancelled",
        bgColor: COLORS.error + "15",
      },
      EXPIRED: {
        color: COLORS.textSecondary,
        icon: "time-outline",
        text: "Expired",
        bgColor: COLORS.textSecondary + "15",
      },
    };
    return configs[status] || {
      color: COLORS.textSecondary,
      icon: "help-circle-outline",
      text: status,
      bgColor: COLORS.textSecondary + "15",
    };
  };

  const statusConfig = getStatusConfig(contract.status);
  const canApprove = contract.status === "SENT";
  const canRequestChange = contract.status === "SENT";
  const canCancel = ["SENT", "APPROVED"].includes(contract.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
          <View style={styles.headerText}>
            <Text style={styles.contractNumber}>{contract.contractNumber}</Text>
            <Text style={styles.contractType}>{contract.contractType}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      {/* Price Info */}
      <View style={styles.priceSection}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Price:</Text>
          <Text style={styles.priceValue}>
            {formatCurrency(contract.totalPrice, contract.currency)}
          </Text>
        </View>
        {(depositPercent !== null || depositAmount !== null) && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Deposit {depositPercent !== null ? `(${depositPercent}%)` : ""}:
            </Text>
            <Text style={styles.depositValue}>
              {formatCurrency(depositAmount, contract.currency)}
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailLabel}>Expected Start:</Text>
          <Text style={styles.detailValue}>
            {formatDate(contract.expectedStartDate)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailLabel}>SLA Days:</Text>
          <Text style={styles.detailValue}>{contract.slaDays} days</Text>
        </View>
        {contract.expiresAt && contract.status === "SENT" && (
          <View style={styles.detailRow}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
            <Text style={styles.detailLabel}>Expires:</Text>
            <Text style={[styles.detailValue, { color: COLORS.warning }]}>
              {formatDate(contract.expiresAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {(canApprove || canRequestChange || canCancel) && (
        <View style={styles.actionsSection}>
          {canApprove && (
            <TouchableOpacity
              style={[styles.button, styles.approveButton]}
              onPress={() => onApprove(contract.contractId)}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
          )}
          {canRequestChange && (
            <TouchableOpacity
              style={[styles.button, styles.changeButton]}
              onPress={() => onRequestChange(contract)}
              disabled={loading}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.buttonText, { color: COLORS.primary }]}>
                Request Change
              </Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => onCancel(contract)}
              disabled={loading}
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
              <Text style={[styles.buttonText, { color: COLORS.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Notes */}
      {contract.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{contract.notes}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  contractNumber: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  contractType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    marginLeft: SPACING.xs / 2,
  },
  priceSection: {
    backgroundColor: COLORS.primary + "10",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  priceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  priceValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.primary,
  },
  depositValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
  },
  detailsSection: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    marginRight: SPACING.xs,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  actionsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    flex: 1,
    minWidth: 100,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  changeButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  buttonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: SPACING.xs / 2,
  },
  notesSection: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ContractCard;

