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
import { getPaymentOrder } from "../../services/paymentService";
import { getOrCreateMyWallet } from "../../services/walletService";

const PaymentSuccessScreen = ({ navigation, route }) => {
  const { orderId } = route.params || {};
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadData();
    } else {
      Alert.alert("Error", "Order ID is required", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [orderId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load payment order
      const orderResponse = await getPaymentOrder(orderId);
      if (orderResponse?.status === "success" && orderResponse?.data) {
        setPaymentOrder(orderResponse.data);
      } else {
        throw new Error("Failed to load payment order");
      }

      // Load wallet
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === "success" && walletResponse?.data) {
        setWallet(walletResponse.data);
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
      Alert.alert("Error", error.message || "Lỗi khi tải thông tin", [
        { text: "OK", onPress: () => navigation.navigate("Wallet") },
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

  const handleViewWallet = () => {
    navigation.navigate("Wallet");
  };

  const handleGoHome = () => {
    navigation.navigate("MainTabs");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (!paymentOrder) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.emptyText}>Không tìm thấy thông tin đơn hàng</Text>
        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          <Text style={styles.successTitle}>Thanh toán thành công!</Text>
          <Text style={styles.successSubtitle}>
            Đơn hàng của bạn đã được thanh toán thành công.
            {"\n"}
            Số tiền đã được cộng vào ví của bạn.
          </Text>
        </View>

        {/* Payment Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi tiết giao dịch</Text>
          <InfoRow
            icon="receipt-outline"
            label="Mã đơn hàng"
            value={paymentOrder.paymentOrderId}
          />
          <InfoRow
            icon="cash-outline"
            label="Số tiền"
            value={formatCurrency(paymentOrder.amount, paymentOrder.currency)}
            valueStyle={styles.amountValue}
          />
          <InfoRow
            icon="document-text-outline"
            label="Mô tả"
            value={paymentOrder.description || "Nạp tiền vào ví"}
          />
          <InfoRow
            icon="checkmark-circle-outline"
            label="Trạng thái"
            value="Đã thanh toán"
            valueStyle={styles.successValue}
          />
          {paymentOrder.completedAt && (
            <InfoRow
              icon="time-outline"
              label="Thời gian hoàn thành"
              value={dayjs(paymentOrder.completedAt).format(
                "DD/MM/YYYY HH:mm:ss"
              )}
            />
          )}
          {wallet && (
            <InfoRow
              icon="wallet-outline"
              label="Số dư ví hiện tại"
              value={formatCurrency(wallet.balance, wallet.currency)}
              valueStyle={styles.walletValue}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewWallet}
          >
            <Ionicons name="wallet-outline" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Xem ví của tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoHome}
          >
            <Ionicons name="home-outline" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Helper Component
const InfoRow = ({ icon, label, value, valueStyle }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
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
    lineHeight: 22,
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
  amountValue: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.success,
    fontWeight: "700",
  },
  successValue: {
    color: COLORS.success,
  },
  walletValue: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: "700",
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.xs,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
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

export default PaymentSuccessScreen;
