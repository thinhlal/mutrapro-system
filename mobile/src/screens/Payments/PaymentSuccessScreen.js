import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
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
      Alert.alert("Error", "Thiếu thông tin đơn hàng", [
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
      }

      // Load wallet
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === "success" && walletResponse?.data) {
        setWallet(walletResponse.data);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Lỗi khi tải thông tin", [
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentOrder) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          </View>
        </View>

        {/* Success Message */}
        <View style={styles.successMessageContainer}>
          <Text style={styles.successTitle}>Thanh toán thành công!</Text>
          <Text style={styles.successSubtitle}>
            Đơn hàng của bạn đã được thanh toán thành công.
          </Text>
          <Text style={styles.successSubtitle}>
            Số tiền đã được cộng vào ví của bạn.
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Chi tiết giao dịch</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã đơn hàng</Text>
            <Text style={styles.detailCode}>{paymentOrder.paymentOrderId}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số tiền</Text>
            <Text style={styles.detailAmount}>
              {formatCurrency(paymentOrder.amount, paymentOrder.currency)}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mô tả</Text>
            <Text style={styles.detailText}>
              {paymentOrder.description || "Nạp tiền vào ví"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trạng thái</Text>
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.statusText}>Đã thanh toán</Text>
            </View>
          </View>

          {paymentOrder.completedAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Thời gian hoàn thành</Text>
                <Text style={styles.detailText}>
                  {dayjs(paymentOrder.completedAt).format("DD/MM/YYYY HH:mm:ss")}
                </Text>
              </View>
            </>
          )}

          {wallet && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Số dư ví hiện tại</Text>
                <Text style={styles.walletBalance}>
                  {formatCurrency(wallet.balance, wallet.currency)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              navigation.navigate("Wallet", { refresh: true });
            }}
          >
            <Ionicons name="wallet-outline" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Xem ví của tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Ionicons name="home-outline" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  successIconContainer: {
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  successMessageContainer: {
    alignItems: "center",
    marginBottom: SPACING.xl,
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
    marginBottom: SPACING.xs,
  },
  detailsCard: {
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
  detailsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  detailLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailCode: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "monospace",
    flex: 1,
    textAlign: "right",
  },
  detailAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.success,
  },
  detailText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.success,
  },
  walletBalance: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.primary,
  },
  actionsContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
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
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

export default PaymentSuccessScreen;

