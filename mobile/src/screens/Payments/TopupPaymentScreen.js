import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import {
  createPaymentOrder,
  getPaymentOrder,
  getPaymentOrderQR,
} from "../../services/paymentService";
import { getOrCreateMyWallet } from "../../services/walletService";

const TopupPaymentScreen = ({ navigation, route }) => {
  const { orderId, amount, description } = route.params || {};
  
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (orderId) {
      loadPaymentOrder();
    } else if (amount) {
      // Validate amount before creating order
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum < 1000) {
        Alert.alert(
          "Lỗi",
          "Số tiền tối thiểu là 1,000 VND",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        return;
      }
      createNewOrder();
    } else {
      // If no amount and no orderId, go back
      Alert.alert("Error", "Thiếu thông tin đơn hàng", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [orderId, amount]);

  // Countdown timer
  useEffect(() => {
    if (!paymentOrder?.expiresAt) return;

    const updateTimer = () => {
      const now = dayjs();
      const expires = dayjs(paymentOrder.expiresAt);
      const diff = expires.diff(now, "second");

      if (diff <= 0) {
        setTimeRemaining(null);
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        Alert.alert("Hết hạn", "Đơn hàng đã hết hạn");
        return;
      }

      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [paymentOrder?.expiresAt]);

  const createNewOrder = async () => {
    try {
      setCreating(true);

      // Load wallet first
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === "success" && walletResponse?.data) {
        setWallet(walletResponse.data);
      }

      // Create payment order
      const orderResponse = await createPaymentOrder({
        amount: parseFloat(amount),
        currency: "VND",
        description: description || "Nạp tiền vào ví",
      });

      if (orderResponse?.status === "success" && orderResponse?.data) {
        const newOrder = orderResponse.data;
        setPaymentOrder(newOrder);

        // Use qrCodeUrl directly from response
        if (newOrder.qrCodeUrl) {
          setQrCodeUrl(newOrder.qrCodeUrl);
        } else {
          // Fallback: Load QR code if not in response
          await loadQRCode(newOrder.paymentOrderId);
        }

        // Start polling
        startPolling(newOrder.paymentOrderId);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Lỗi khi tạo đơn hàng thanh toán", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setCreating(false);
      setLoading(false);
    }
  };

  const loadPaymentOrder = async () => {
    try {
      setLoading(true);

      // Load wallet
      const walletResponse = await getOrCreateMyWallet();
      if (walletResponse?.status === "success" && walletResponse?.data) {
        setWallet(walletResponse.data);
      }

      // Load payment order
      const orderResponse = await getPaymentOrder(orderId);
      if (orderResponse?.status === "success" && orderResponse?.data) {
        const order = orderResponse.data;
        setPaymentOrder(order);

        // Use qrCodeUrl directly from response
        if (order.qrCodeUrl) {
          setQrCodeUrl(order.qrCodeUrl);
        } else {
          // Fallback: Load QR code if not in response
          await loadQRCode(order.paymentOrderId);
        }

        // If order is still pending, start polling
        if (order.status === "PENDING") {
          startPolling(order.paymentOrderId);
        } else if (order.status === "COMPLETED") {
          // Already completed, redirect to success page
          navigateToSuccess(order.paymentOrderId);
        }
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Lỗi khi tải thông tin đơn hàng", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadQRCode = async (orderId) => {
    try {
      const qrResponse = await getPaymentOrderQR(orderId);
      if (qrResponse?.status === "success" && qrResponse?.data?.qr_code_url) {
        setQrCodeUrl(qrResponse.data.qr_code_url);
      }
    } catch (error) {
      console.error("Failed to load QR code:", error);
    }
  };

  const startPolling = (orderId) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      try {
        const orderResponse = await getPaymentOrder(orderId);
        if (orderResponse?.status === "success" && orderResponse?.data) {
          const order = orderResponse.data;
          setPaymentOrder(order);

          if (order.status === "COMPLETED") {
            clearInterval(interval);
            navigateToSuccess(orderId);
          } else if (order.status === "EXPIRED" || order.status === "CANCELLED") {
            clearInterval(interval);
            Alert.alert("Thông báo", "Đơn hàng đã hết hạn hoặc bị hủy");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const navigateToSuccess = (orderId) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    navigation.replace("PaymentSuccess", { orderId });
  };

  const handleRefresh = () => {
    if (paymentOrder) {
      loadPaymentOrder();
    }
  };

  const formatCurrency = (amount, currency = "VND") => {
    if (!amount) return "0 ₫";
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "Đang chờ thanh toán",
      COMPLETED: "Đã thanh toán",
      EXPIRED: "Đã hết hạn",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  if (creating || (loading && !paymentOrder)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {creating ? "Đang tạo đơn hàng..." : "Đang tải thông tin..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentOrder) {
    return null;
  }

  const isPending = paymentOrder.status === "PENDING";
  const isCompleted = paymentOrder.status === "COMPLETED";
  const isExpired = paymentOrder.status === "EXPIRED";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="wallet-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Thanh toán nạp tiền</Text>
          {isPending && (
            <Text style={styles.subtitle}>
              Quét mã QR bằng app ngân hàng để thanh toán
            </Text>
          )}
        </View>

        {/* Status Alert */}
        {isPending && (
          <View style={[styles.alert, styles.alertInfo]}>
            <Ionicons name="time-outline" size={20} color={COLORS.info} />
            <Text style={styles.alertText}>
              Vui lòng quét mã QR và hoàn tất thanh toán trong app ngân hàng
            </Text>
          </View>
        )}

        {isCompleted && (
          <View style={[styles.alert, styles.alertSuccess]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.alertText}>Thanh toán thành công</Text>
          </View>
        )}

        {isExpired && (
          <View style={[styles.alert, styles.alertWarning]}>
            <Ionicons name="warning" size={20} color={COLORS.warning} />
            <Text style={styles.alertText}>
              Đơn hàng đã hết hạn. Vui lòng tạo đơn hàng mới để tiếp tục thanh toán
            </Text>
          </View>
        )}

        {/* Payment Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số tiền</Text>
            <Text style={styles.infoValue}>
              {formatCurrency(paymentOrder.amount, paymentOrder.currency)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRowOrderId}>
            <Text style={styles.infoLabelOrderId}>Mã đơn hàng</Text>
            <Text style={styles.infoCode}>
              {paymentOrder.paymentOrderId}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mô tả</Text>
            <Text style={styles.infoText}>
              {paymentOrder.description || "Nạp tiền vào ví"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái</Text>
            <View style={styles.statusContainer}>
              {isPending && (
                <Ionicons name="time-outline" size={16} color={COLORS.warning} />
              )}
              {isCompleted && (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              )}
              <Text style={[styles.statusText, isPending && styles.statusTextPending]}>
                {getStatusLabel(paymentOrder.status)}
              </Text>
            </View>
          </View>
          {isPending && paymentOrder.expiresAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian còn lại</Text>
                <Text style={styles.timeRemaining}>
                  {timeRemaining || "Đã hết hạn"}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* QR Code */}
        {isPending && qrCodeUrl && (
          <View style={styles.qrContainer}>
            <View style={styles.qrHeader}>
              <Ionicons name="qr-code-outline" size={24} color={COLORS.primary} />
              <Text style={styles.qrTitle}>Quét mã QR để thanh toán</Text>
            </View>
            <View style={styles.qrImageContainer}>
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrImage}
                resizeMode="contain"
                onError={(e) => {
                  console.error("Failed to load QR code image:", qrCodeUrl);
                }}
              />
            </View>
            <Text style={styles.qrHint}>
              Mở app ngân hàng và quét mã QR này
            </Text>
          </View>
        )}

        {/* Instructions */}
        {isPending && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Hướng dẫn thanh toán:</Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>
                1. Mở app ngân hàng trên điện thoại
              </Text>
              <Text style={styles.instructionItem}>
                2. Chọn tính năng quét QR code
              </Text>
              <Text style={styles.instructionItem}>3. Quét mã QR ở trên</Text>
              <Text style={styles.instructionItem}>
                4. Kiểm tra thông tin và xác nhận thanh toán
              </Text>
              <Text style={styles.instructionItem}>
                5. Hệ thống sẽ tự động cập nhật sau khi nhận được thanh toán
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {isPending && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.refreshButtonText}>Làm mới trạng thái</Text>
            </TouchableOpacity>
          )}
          {isCompleted && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Wallet")}
            >
              <Text style={styles.primaryButtonText}>Xem ví của tôi</Text>
            </TouchableOpacity>
          )}
          {isExpired && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Wallet")}
            >
              <Text style={styles.primaryButtonText}>Tạo đơn hàng mới</Text>
            </TouchableOpacity>
          )}
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
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  alertInfo: {
    backgroundColor: COLORS.info + "15",
  },
  alertSuccess: {
    backgroundColor: COLORS.success + "15",
  },
  alertWarning: {
    backgroundColor: COLORS.warning + "15",
  },
  alertText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  infoRowOrderId: {
    flexDirection: "column",
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  infoLabelOrderId: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.primary,
  },
  infoCode: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "monospace",
    flexShrink: 1,
  },
  infoText: {
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
    color: COLORS.text,
  },
  statusTextPending: {
    color: COLORS.warning,
  },
  timeRemaining: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.error,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  qrTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  qrImageContainer: {
    width: 280,
    height: 280,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  instructionsCard: {
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
  instructionsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  instructionsList: {
    gap: SPACING.sm,
  },
  instructionItem: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 24,
  },
  actionsContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  refreshButton: {
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
  refreshButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
});

export default TopupPaymentScreen;

