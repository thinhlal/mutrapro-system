import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import {
  getOrCreateMyWallet,
  getMyWalletTransactions,
  withdrawWallet,
  getMyWithdrawalRequests,
} from "../../services/walletService";
import { getBankList } from "../../services/vietqrService";
import { getContractById, getMilestoneById } from "../../services/contractService";

const WalletScreen = ({ navigation }) => {
  console.log('💳 [WalletScreen] Rendering...');
  
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Deposit modal
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  // Withdraw modal
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [note, setNote] = useState("");
  const [bankList, setBankList] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Filters modal
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    txType: null,
    fromDate: null,
    toDate: null,
  });

  // Filters and pagination
  const [filters, setFilters] = useState({
    txType: null,
    fromDate: null,
    toDate: null,
    page: 0,
    size: 20,
    sort: "createdAt,desc",
  });
  const [hasMore, setHasMore] = useState(true);

  // Active tab (transactions or withdrawal-requests)
  const [activeTab, setActiveTab] = useState("transactions");

  // Withdrawal requests
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalRequestsLoading, setWithdrawalRequestsLoading] = useState(false);
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState(null);
  const [withdrawalRequestsPagination, setWithdrawalRequestsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Transaction detail modal
  const [transactionDetailVisible, setTransactionDetailVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Withdrawal request detail modal
  const [withdrawalDetailVisible, setWithdrawalDetailVisible] = useState(false);
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState(null);

  useEffect(() => {
    loadWallet();
    loadBankList();
  }, []);

  // Load bank list
  const loadBankList = async () => {
    setLoadingBanks(true);
    try {
      const banks = await getBankList();
      setBankList(banks);
    } catch (error) {
      console.error("Error loading bank list:", error);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    loadTransactions(true);
  }, [filters.txType, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === "withdrawal-requests") {
      loadWithdrawalRequests();
    }
  }, [activeTab, withdrawalStatusFilter, withdrawalRequestsPagination.current, withdrawalRequestsPagination.pageSize]);

  const loadWallet = async () => {
    try {
      console.log('💳 [WalletScreen] Loading wallet...');
      setLoading(true);
      const response = await getOrCreateMyWallet();
      console.log('💳 [WalletScreen] Wallet response:', response);
      if (response?.status === "success" && response?.data) {
        setWallet(response.data);
        console.log('💳 [WalletScreen] Wallet loaded:', response.data);
      }
    } catch (error) {
      console.error("❌ [WalletScreen] Error loading wallet:", error);
      Alert.alert("Error", error.message || "Failed to load wallet");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTransactions = async (isRefresh = false) => {
    if (isRefresh) {
      setTransactionsLoading(true);
      setFilters((prev) => ({ ...prev, page: 0 }));
    } else {
      setLoadingMore(true);
    }

    try {
      const currentFilters = isRefresh ? { ...filters, page: 0 } : filters;
      const response = await getMyWalletTransactions(currentFilters);

      if (response?.status === "success" && response?.data) {
        const newTransactions = response.data.content || [];
        
        if (isRefresh) {
          setTransactions(newTransactions);
        } else {
          setTransactions((prev) => [...prev, ...newTransactions]);
        }

        setHasMore(!response.data.last);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      Alert.alert("Error", error.message || "Failed to load transactions");
    } finally {
      setTransactionsLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWallet();
    loadTransactions(true);
  }, []);

  // Set header right button for refresh
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={onRefresh}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, onRefresh]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
      loadTransactions(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1000) {
      Alert.alert("Invalid Amount", "Minimum deposit amount is 1,000 VND");
      return;
    }

    // Navigate to TopupPaymentScreen with amount
    setDepositModalVisible(false);
    setDepositAmount("");
    navigation.navigate('TopupPayment', {
      amount: amount.toString(),
      description: `Top Up Wallet - ${amount.toLocaleString("vi-VN")} VND`,
    });
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!wallet?.walletId) {
      Alert.alert("Error", "Wallet information not found");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const availableBalance = wallet?.availableBalance ?? 
      (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0);

    // Validation
    if (!amount || amount < 10000) {
      Alert.alert("Invalid Amount", "Minimum withdrawal amount is 10,000 VND");
      return;
    }

    if (amount > availableBalance) {
      Alert.alert(
        "Invalid Amount",
        `Withdrawal amount cannot exceed available balance (${formatCurrency(availableBalance, wallet?.currency)})`
      );
      return;
    }

    if (!bankAccountNumber.trim()) {
      Alert.alert("Error", "Please enter bank account number");
      return;
    }

    if (!bankName.trim()) {
      Alert.alert("Error", "Please select bank");
      return;
    }

    if (!accountHolderName.trim()) {
      Alert.alert("Error", "Please enter account holder name");
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await withdrawWallet(wallet.walletId, {
        amount: amount,
        currency: wallet.currency || 'VND',
        bankAccountNumber: bankAccountNumber.trim(),
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
        note: note.trim() || null,
      });

      if (response?.status === 'success') {
        Alert.alert(
          "Success",
          "Withdrawal request submitted successfully! Your request is pending manager approval.",
          [
            {
              text: "OK",
              onPress: () => {
                setWithdrawModalVisible(false);
                resetWithdrawForm();
                loadWallet();
                loadTransactions(true);
                // Reload withdrawal requests if on that tab
                if (activeTab === "withdrawal-requests") {
                  loadWithdrawalRequests();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error withdrawing:", error);
      Alert.alert(
        "Error",
        error?.message || error?.details?.message || "Failed to withdraw from wallet"
      );
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Reset withdraw form
  const resetWithdrawForm = () => {
    setWithdrawAmount("");
    setBankAccountNumber("");
    setBankName("");
    setAccountHolderName("");
    setNote("");
  };

  // Load withdrawal requests
  const loadWithdrawalRequests = async () => {
    setWithdrawalRequestsLoading(true);
    try {
      const response = await getMyWithdrawalRequests({
        status: withdrawalStatusFilter,
        page: withdrawalRequestsPagination.current - 1,
        size: withdrawalRequestsPagination.pageSize,
      });
      if (response?.status === "success" && response?.data) {
        setWithdrawalRequests(response.data.content || []);
        setWithdrawalRequestsPagination((prev) => ({
          ...prev,
          total: response.data.totalElements || 0,
        }));
      } else {
        setWithdrawalRequests([]);
      }
    } catch (error) {
      console.error("Error loading withdrawal requests:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load withdrawal requests"
      );
      setWithdrawalRequests([]);
    } finally {
      setWithdrawalRequestsLoading(false);
    }
  };

  // Withdrawal status constants
  const WITHDRAWAL_STATUS_COLORS = {
    PENDING_REVIEW: COLORS.warning,
    APPROVED: COLORS.info,
    PROCESSING: COLORS.info,
    COMPLETED: COLORS.success,
    REJECTED: COLORS.error,
    FAILED: COLORS.error,
  };

  const WITHDRAWAL_STATUS_LABELS = {
    PENDING_REVIEW: "Pending Review",
    APPROVED: "Approved",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    FAILED: "Failed",
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return dayjs(dateString).format("DD/MM/YYYY HH:mm");
  };

  const formatPriceDisplay = (amount) => {
    if (!amount) return "N/A";
    return formatCurrency(amount, wallet?.currency || "VND");
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text, label = "Text") => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied", `${label} copied to clipboard`);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  // Get transaction description
  const getTransactionDescription = (record, contractInfo = null, milestoneInfo = null) => {
    const { txType, metadata, contractId, milestoneId } = record;

    if (metadata?.description) {
      return metadata.description;
    }

    switch (txType) {
      case "contract_deposit_payment":
        if (contractInfo?.contractNumber) {
          return `Deposit payment for contract ${contractInfo.contractNumber}`;
        }
        return contractId
          ? `Deposit payment for contract ${contractId.substring(0, 8)}...`
          : "Contract deposit payment";

      case "milestone_payment":
        if (contractInfo?.contractNumber && milestoneInfo?.name) {
          return `Milestone payment "${milestoneInfo.name}" for contract ${contractInfo.contractNumber}`;
        }
        if (contractInfo?.contractNumber) {
          return `Milestone payment for contract ${contractInfo.contractNumber}`;
        }
        if (milestoneInfo?.name) {
          return `Milestone payment "${milestoneInfo.name}"`;
        }
        return contractId
          ? `Milestone payment for contract ${contractId.substring(0, 8)}...`
          : "Milestone payment";

      case "revision_fee":
        if (metadata?.revisionRound) {
          return `Revision fee round ${metadata.revisionRound}`;
        }
        return "Revision fee";

      case "recording_booking_payment":
        return record.bookingId
          ? `Recording booking payment ${record.bookingId.substring(0, 8)}...`
          : "Recording booking payment";

      case "refund":
        if (metadata?.refund_reason) {
          return `Refund: ${metadata.refund_reason}`;
        }
        if (metadata?.reason === "REVISION_REJECTED") {
          return "Refund revision fee (request rejected)";
        }
        return "Refund";

      case "topup":
        if (metadata?.payment_method) {
          return `Top up via ${metadata.payment_method}`;
        }
        return "Top up wallet";

      case "withdrawal":
        return "Withdrawal";

      case "adjustment":
        if (metadata?.reason) {
          return `Adjustment: ${metadata.reason}`;
        }
        return "Balance adjustment";

      default:
        return getTxTypeLabel(txType);
    }
  };

  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      ...tempFilters,
      page: 0,
    }));
    setFiltersModalVisible(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      txType: null,
      fromDate: null,
      toDate: null,
    };
    setTempFilters(clearedFilters);
    setFilters((prev) => ({
      ...prev,
      ...clearedFilters,
      page: 0,
    }));
    setFiltersModalVisible(false);
  };

  const formatCurrency = (amount, currency = "VND") => {
    if (!amount) return "0 ₫";
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const getTxTypeLabel = (type) => {
    const labels = {
      topup: "Deposit",
      payment: "Payment",
      contract_deposit_payment: "Contract Deposit Payment",
      milestone_payment: "Milestone Payment",
      recording_booking_payment: "Recording Booking Payment",
      revision_fee: "Revision Fee",
      refund: "Refund",
      withdrawal: "Withdrawal",
      adjustment: "Adjustment",
    };
    return labels[type] || type;
  };

  const getTxTypeColor = (type) => {
    const colors = {
      topup: COLORS.success,
      refund: COLORS.success,
      payment: COLORS.error,
      contract_deposit_payment: COLORS.error,
      milestone_payment: COLORS.error,
      recording_booking_payment: COLORS.error,
      revision_fee: COLORS.error,
      withdrawal: COLORS.warning,
      adjustment: COLORS.textSecondary,
    };
    return colors[type] || COLORS.textSecondary;
  };

  const getTxIcon = (type) => {
    if (type === "topup" || type === "refund") {
      return "arrow-down-circle";
    }
    // All payment types are expenses (outgoing)
    if (
      type === "payment" ||
      type === "contract_deposit_payment" ||
      type === "milestone_payment" ||
      type === "recording_booking_payment" ||
      type === "revision_fee" ||
      type === "withdrawal"
    ) {
      return "arrow-up-circle";
    }
    return "arrow-up-circle";
  };

  const calculateStats = () => {
    if (!transactions || transactions.length === 0) {
      return { totalTopup: 0, totalPayment: 0, totalRefund: 0 };
    }

    return transactions.reduce(
      (acc, tx) => {
        if (tx.txType === "topup") acc.totalTopup += parseFloat(tx.amount) || 0;
        // All payment types count as payment
        if (
          tx.txType === "payment" ||
          tx.txType === "contract_deposit_payment" ||
          tx.txType === "milestone_payment" ||
          tx.txType === "recording_booking_payment" ||
          tx.txType === "revision_fee"
        ) {
          acc.totalPayment += parseFloat(tx.amount) || 0;
        }
        if (tx.txType === "refund") acc.totalRefund += parseFloat(tx.amount) || 0;
        return acc;
      },
      { totalTopup: 0, totalPayment: 0, totalRefund: 0 }
    );
  };

  const stats = calculateStats();

  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={async () => {
        setSelectedTransaction(item);
        setContractInfo(null);
        setMilestoneInfo(null);
        setTransactionDetailVisible(true);

        // Load contract info if has contractId
        if (item.contractId) {
          setDetailLoading(true);
          try {
            const contractResponse = await getContractById(item.contractId);
            if (contractResponse?.status === "success" && contractResponse?.data) {
              setContractInfo(contractResponse.data);

              // Load milestone info if has milestoneId
              if (item.milestoneId) {
                try {
                  const milestoneResponse = await getMilestoneById(
                    item.contractId,
                    item.milestoneId
                  );
                  if (
                    milestoneResponse?.status === "success" &&
                    milestoneResponse?.data
                  ) {
                    setMilestoneInfo(milestoneResponse.data);
                  }
                } catch (error) {
                  console.warn("Failed to load milestone info:", error);
                }
              }
            }
          } catch (error) {
            console.warn("Failed to load contract info:", error);
          } finally {
            setDetailLoading(false);
          }
        }
      }}
    >
      {/* Row 1: Icon + Type */}
      <View style={styles.transactionRow}>
        <Ionicons
          name={getTxIcon(item.txType)}
          size={20}
          color={getTxTypeColor(item.txType)}
        />
        <Text style={styles.transactionType}>{getTxTypeLabel(item.txType)}</Text>
      </View>

      {/* Row 2: Description if available */}
      {item.description && (
        <Text style={styles.transactionDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {/* Row 3: Amount */}
      <Text
        style={[
          styles.transactionAmount,
          {
            color:
              item.txType === "topup" || item.txType === "refund"
                ? COLORS.success
                : COLORS.error,
          },
        ]}
      >
        {item.txType === "topup" || item.txType === "refund" ? "+" : "-"}
        {formatCurrency(item.amount, item.currency)}
      </Text>

      {/* Row 4: Balance After */}
      <Text style={styles.balanceAfter}>
        Balance: {formatCurrency(item.balanceAfter, item.currency)}
      </Text>

      {/* Row 5: Date */}
      <Text style={styles.transactionDate}>
        {dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")}
      </Text>
    </TouchableOpacity>
  );

  const renderWithdrawalRequestItem = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => {
        setSelectedWithdrawalRequest(item);
        setWithdrawalDetailVisible(true);
      }}
    >
      <View style={styles.transactionRow}>
        <Ionicons name="arrow-down-circle" size={20} color={COLORS.warning} />
        <Text style={styles.transactionType}>Withdrawal Request</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: WITHDRAWAL_STATUS_COLORS[item.status] + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: WITHDRAWAL_STATUS_COLORS[item.status] },
            ]}
          >
            {WITHDRAWAL_STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>

      <Text style={[styles.transactionAmount, { color: COLORS.warning }]}>
        -{formatPriceDisplay(item.amount)}
      </Text>

      <Text style={styles.transactionDescription} numberOfLines={1}>
        {item.bankName} • {item.accountHolderName}
      </Text>
      <Text style={styles.transactionDate}>
        {formatDateTime(item.createdAt)}
      </Text>
    </TouchableOpacity>
  );

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={32} color={COLORS.primary} />
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(
              wallet?.availableBalance ?? 
                (wallet?.balance ? wallet.balance - (wallet.holdBalance || 0) : 0),
              wallet?.currency
            )}
          </Text>
          {wallet?.holdBalance > 0 && (
            <Text style={styles.balanceSubtext}>
              Total: {formatCurrency(wallet.balance, wallet.currency)} | On Hold: {formatCurrency(wallet.holdBalance, wallet.currency)}
            </Text>
          )}
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.depositButton}
              onPress={() => {
                // Show modal to input amount first
                setDepositModalVisible(true);
              }}
            >
              <Text style={styles.depositButtonText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => {
                if (bankList.length === 0) {
                  loadBankList();
                }
                setWithdrawModalVisible(true);
              }}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Total Deposit</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {formatCurrency(stats.totalTopup, wallet?.currency)}
                </Text>
              </View>
              <Ionicons name="arrow-down-circle" size={32} color={COLORS.success} />
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Total Payment</Text>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {formatCurrency(stats.totalPayment, wallet?.currency)}
                </Text>
              </View>
              <Ionicons name="arrow-up-circle" size={32} color={COLORS.error} />
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Total Refund</Text>
                <Text style={[styles.statValue, { color: COLORS.info }]}>
                  {formatCurrency(stats.totalRefund, wallet?.currency)}
                </Text>
              </View>
              <Ionicons name="refresh-circle" size={32} color={COLORS.info} />
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "transactions" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("transactions")}
          >
            <Ionicons
              name="time-outline"
              size={20}
              color={
                activeTab === "transactions" ? COLORS.primary : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "transactions" && styles.tabTextActive,
              ]}
            >
              Transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "withdrawal-requests" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("withdrawal-requests")}
          >
            <Ionicons
              name="arrow-down-circle-outline"
              size={20}
              color={
                activeTab === "withdrawal-requests"
                  ? COLORS.primary
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "withdrawal-requests" && styles.tabTextActive,
              ]}
            >
              Withdrawal
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <>
            {/* Transactions Header */}
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Transaction History</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFiltersModalVisible(true)}
              >
                <Ionicons name="filter" size={20} color={COLORS.primary} />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* Transactions List */}
            {transactionsLoading ? (
              <View style={styles.transactionsLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="wallet-outline"
                  size={50}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
                <Text style={styles.emptyStateText}>
                  Your transaction history will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.walletTxId}
                renderItem={renderTransactionItem}
                scrollEnabled={false}
                ListFooterComponent={renderListFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
              />
            )}
          </>
        )}

        {/* Withdrawal Requests Tab */}
        {activeTab === "withdrawal-requests" && (
          <>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Withdrawal Requests</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={loadWithdrawalRequests}
                disabled={withdrawalRequestsLoading}
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color={COLORS.primary}
                  style={{
                    transform: [{ rotate: withdrawalRequestsLoading ? "180deg" : "0deg" }],
                  }}
                />
              </TouchableOpacity>
            </View>

            {withdrawalRequestsLoading ? (
              <View style={styles.transactionsLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : withdrawalRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={50}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyStateTitle}>No Withdrawal Requests</Text>
                <Text style={styles.emptyStateText}>
                  Your withdrawal requests will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={withdrawalRequests}
                keyExtractor={(item) => item.withdrawalRequestId}
                renderItem={renderWithdrawalRequestItem}
                scrollEnabled={false}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Deposit Modal - Keep for backward compatibility or remove if not needed */}
      <Modal
        visible={depositModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount (VND)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />
              <Text style={styles.inputHint}>Minimum: 1,000 VND</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDepositModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleDeposit}
              >
                <Text style={styles.modalConfirmButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setWithdrawModalVisible(false);
          resetWithdrawForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.withdrawModalTitle}>Withdraw from Wallet</Text>
              <TouchableOpacity
                onPress={() => {
                  setWithdrawModalVisible(false);
                  resetWithdrawForm();
                }}
                disabled={withdrawLoading}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.withdrawInputLabel}>Withdrawal Amount (VND)</Text>
                <TextInput
                  style={styles.withdrawAmountInput}
                  placeholder="Enter withdrawal amount"
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  editable={!withdrawLoading}
                />
                <Text style={styles.withdrawInputHint}>
                  Minimum: 10,000 VND
                  {wallet && (
                    <Text>
                      {"\n"}Available balance: {formatCurrency(
                        wallet?.availableBalance ??
                          (wallet?.balance
                            ? wallet.balance - (wallet.holdBalance || 0)
                            : 0),
                        wallet?.currency
                      )}
                    </Text>
                  )}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.withdrawInputLabel}>
                  Bank Account Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.withdrawTextInput}
                  placeholder="Enter bank account number"
                  value={bankAccountNumber}
                  onChangeText={setBankAccountNumber}
                  keyboardType="numeric"
                  editable={!withdrawLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.withdrawInputLabel}>
                  Bank Name <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowBankPicker(true)}
                  disabled={withdrawLoading || loadingBanks}
                >
                  <Text
                    style={[
                      styles.withdrawPickerButtonText,
                      !bankName && styles.pickerButtonTextPlaceholder,
                    ]}
                  >
                    {bankName || "Select bank"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.withdrawInputLabel}>
                  Account Holder Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.withdrawTextInput}
                  placeholder="Enter account holder name"
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  editable={!withdrawLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.withdrawInputLabel}>Note (optional)</Text>
                <TextInput
                  style={[styles.withdrawTextInput, styles.textArea]}
                  placeholder="Enter note (if any)"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!withdrawLoading}
                />
                <Text style={styles.withdrawInputHint}>{note.length}/500</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setWithdrawModalVisible(false);
                  resetWithdrawForm();
                }}
                disabled={withdrawLoading}
              >
                <Text style={styles.withdrawModalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  withdrawLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleWithdraw}
                disabled={withdrawLoading}
              >
                {withdrawLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.withdrawModalConfirmButtonText}>Withdraw</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Picker Modal */}
      <Modal
        visible={showBankPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {loadingBanks ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading banks...</Text>
                </View>
              ) : (
                <FlatList
                  data={bankList}
                  keyExtractor={(item) => item.code || item.shortName || item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.bankItem,
                        bankName === (item.shortName || item.name) &&
                          styles.bankItemSelected,
                      ]}
                      onPress={() => {
                        setBankName(item.shortName || item.name);
                        setShowBankPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.bankItemText,
                          bankName === (item.shortName || item.name) &&
                            styles.bankItemTextSelected,
                        ]}
                      >
                        {item.shortName || item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No banks found
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={filtersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setFiltersModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Transaction Type</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: null, label: "All" },
                  { value: "topup", label: "Deposit" },
                  { value: "payment", label: "Payment" },
                  { value: "contract_deposit_payment", label: "Contract Deposit" },
                  { value: "milestone_payment", label: "Milestone Payment" },
                  { value: "recording_booking_payment", label: "Recording Booking" },
                  { value: "revision_fee", label: "Revision Fee" },
                  { value: "refund", label: "Refund" },
                  { value: "withdrawal", label: "Withdrawal" },
                  { value: "adjustment", label: "Adjustment" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value || "all"}
                    style={[
                      styles.filterOption,
                      tempFilters.txType === option.value && styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((prev) => ({ ...prev, txType: option.value }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilters.txType === option.value &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={clearFilters}
              >
                <Text style={styles.modalCancelButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={applyFilters}
              >
                <Text style={styles.modalConfirmButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        visible={transactionDetailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setTransactionDetailVisible(false);
          setSelectedTransaction(null);
          setContractInfo(null);
          setMilestoneInfo(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setTransactionDetailVisible(false);
                  setSelectedTransaction(null);
                  setContractInfo(null);
                  setMilestoneInfo(null);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : selectedTransaction ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction Type</Text>
                  <View style={styles.detailValue}>
                    <Ionicons
                      name={getTxIcon(selectedTransaction.txType)}
                      size={20}
                      color={getTxTypeColor(selectedTransaction.txType)}
                    />
                    <Text style={styles.detailText}>
                      {getTxTypeLabel(selectedTransaction.txType)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailText}>
                    {getTransactionDescription(
                      selectedTransaction,
                      contractInfo,
                      milestoneInfo
                    )}
                  </Text>
                </View>

                {contractInfo && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contract Number</Text>
                    <Text style={[styles.detailText, { fontWeight: "700" }]}>
                      {contractInfo.contractNumber || "N/A"}
                    </Text>
                  </View>
                )}

                {milestoneInfo && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Milestone Name</Text>
                    <Text style={[styles.detailText, { fontWeight: "700" }]}>
                      {milestoneInfo.name || "N/A"}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.detailText,
                      {
                        fontWeight: "700",
                        fontSize: FONT_SIZES.base,
                        color:
                          selectedTransaction.txType === "topup" ||
                          selectedTransaction.txType === "refund"
                            ? COLORS.success
                            : COLORS.error,
                      },
                    ]}
                  >
                    {selectedTransaction.txType === "topup" ||
                    selectedTransaction.txType === "refund"
                      ? "+"
                      : "-"}
                    {formatCurrency(
                      selectedTransaction.amount,
                      selectedTransaction.currency
                    )}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance Before</Text>
                  <Text style={styles.detailText}>
                    {formatCurrency(
                      selectedTransaction.balanceBefore,
                      selectedTransaction.currency
                    )}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance After</Text>
                  <Text style={[styles.detailText, { fontWeight: "700" }]}>
                    {formatCurrency(
                      selectedTransaction.balanceAfter,
                      selectedTransaction.currency
                    )}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailText}>
                    {dayjs(selectedTransaction.createdAt).format(
                      "DD/MM/YYYY HH:mm:ss"
                    )}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID</Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(selectedTransaction.walletTxId, "Transaction ID")}
                    style={styles.copyableRow}
                  >
                    <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                      {selectedTransaction.walletTxId}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Related Information Section */}
                {(selectedTransaction.contractId ||
                  selectedTransaction.milestoneId ||
                  selectedTransaction.bookingId ||
                  selectedTransaction.metadata) && (
                  <>
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Related Information</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    {selectedTransaction.contractId && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Contract</Text>
                        <View style={styles.contractRow}>
                          {contractInfo ? (
                            <>
                              <Text style={[styles.detailText, { fontWeight: "700" }]}>
                                {contractInfo.contractNumber}
                              </Text>
                              <Text
                                style={[
                                  styles.detailText,
                                  { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
                                ]}
                              >
                                ({selectedTransaction.contractId.substring(0, 8)}...)
                              </Text>
                            </>
                          ) : (
                            <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                              {selectedTransaction.contractId}
                            </Text>
                          )}
                          <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => {
                              navigation.navigate("ContractDetail", {
                                contractId: selectedTransaction.contractId,
                              });
                              setTransactionDetailVisible(false);
                            }}
                          >
                            <Text style={styles.linkButtonText}>View Contract</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {selectedTransaction.milestoneId && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Milestone</Text>
                        <View style={styles.contractRow}>
                          {milestoneInfo ? (
                            <>
                              <Text style={[styles.detailText, { fontWeight: "700" }]}>
                                {milestoneInfo.name}
                              </Text>
                              <Text
                                style={[
                                  styles.detailText,
                                  { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
                                ]}
                              >
                                ({selectedTransaction.milestoneId.substring(0, 8)}...)
                              </Text>
                            </>
                          ) : (
                            <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                              {selectedTransaction.milestoneId}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {selectedTransaction.bookingId && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking ID</Text>
                        <TouchableOpacity
                          onPress={() =>
                            copyToClipboard(selectedTransaction.bookingId, "Booking ID")
                          }
                          style={styles.copyableRow}
                        >
                          <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                            {selectedTransaction.bookingId}
                          </Text>
                          <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {selectedTransaction.metadata && (
                      <>
                        {selectedTransaction.metadata.payment_method && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment Method</Text>
                            <View
                              style={[
                                styles.tag,
                                selectedTransaction.metadata.payment_method === "sepay" &&
                                  styles.tagBlue,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.tagText,
                                  selectedTransaction.metadata.payment_method === "sepay" &&
                                    styles.tagTextBlue,
                                ]}
                              >
                                {selectedTransaction.metadata.payment_method === "sepay"
                                  ? "SePay (Bank Transfer)"
                                  : selectedTransaction.metadata.payment_method.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        )}

                        {selectedTransaction.metadata.transaction_id && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>SePay Transaction Code</Text>
                            <TouchableOpacity
                              onPress={() =>
                                copyToClipboard(
                                  selectedTransaction.metadata.transaction_id,
                                  "SePay Transaction Code"
                                )
                              }
                              style={styles.copyableRow}
                            >
                              <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                {selectedTransaction.metadata.transaction_id}
                              </Text>
                              <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        )}

                        {selectedTransaction.metadata.payment_order_id && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment Order Code</Text>
                            <TouchableOpacity
                              onPress={() =>
                                copyToClipboard(
                                  selectedTransaction.metadata.payment_order_id,
                                  "Payment Order Code"
                                )
                              }
                              style={styles.copyableRow}
                            >
                              <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                {selectedTransaction.metadata.payment_order_id}
                              </Text>
                              <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        )}

                        {selectedTransaction.metadata.gateway_response && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Information from SePay</Text>
                            <View style={styles.gatewayTableContainer}>
                              {(() => {
                                try {
                                  const gatewayData =
                                    typeof selectedTransaction.metadata.gateway_response ===
                                    "string"
                                      ? JSON.parse(
                                          selectedTransaction.metadata.gateway_response
                                        )
                                      : selectedTransaction.metadata.gateway_response;

                                  const tableRows = [];
                                  
                                  if (gatewayData.gateway) {
                                    tableRows.push({
                                      label: "Bank",
                                      value: gatewayData.gateway,
                                      copyable: false,
                                    });
                                  }
                                  if (gatewayData.transactionDate) {
                                    tableRows.push({
                                      label: "Transaction Time",
                                      value: gatewayData.transactionDate,
                                      copyable: false,
                                    });
                                  }
                                  if (gatewayData.accountNumber) {
                                    tableRows.push({
                                      label: "Account Number",
                                      value: gatewayData.accountNumber,
                                      copyable: true,
                                    });
                                  }
                                  if (gatewayData.referenceCode) {
                                    tableRows.push({
                                      label: "Reference Code",
                                      value: gatewayData.referenceCode,
                                      copyable: true,
                                    });
                                  }
                                  if (gatewayData.content) {
                                    tableRows.push({
                                      label: "Transfer Content",
                                      value: gatewayData.content,
                                      copyable: false,
                                    });
                                  }

                                  return (
                                    <ScrollView
                                      style={styles.gatewayTableScrollView}
                                      nestedScrollEnabled={true}
                                      showsVerticalScrollIndicator={true}
                                    >
                                      <View style={styles.gatewayTable}>
                                        {tableRows.map((row, index) => (
                                          <View
                                            key={index}
                                            style={[
                                              styles.gatewayTableRow,
                                              row.label === "Transfer Content" &&
                                                styles.gatewayTableRowLongContent,
                                              index < tableRows.length - 1 &&
                                                styles.gatewayTableRowBorder,
                                            ]}
                                          >
                                            <View style={styles.gatewayTableLabelCell}>
                                              <Text style={styles.gatewayTableLabel}>
                                                {row.label}
                                              </Text>
                                            </View>
                                            <View
                                              style={[
                                                styles.gatewayTableValueCell,
                                                row.label === "Transfer Content" &&
                                                  styles.gatewayTableValueCellLongContent,
                                              ]}
                                            >
                                              {row.copyable ? (
                                                <TouchableOpacity
                                                  onPress={() =>
                                                    copyToClipboard(row.value, row.label)
                                                  }
                                                  style={styles.copyableRow}
                                                >
                                                  <Text
                                                    style={[
                                                      styles.gatewayTableValue,
                                                      { fontFamily: "monospace" },
                                                    ]}
                                                    numberOfLines={0}
                                                  >
                                                    {row.value}
                                                  </Text>
                                                  <Ionicons
                                                    name="copy-outline"
                                                    size={14}
                                                    color={COLORS.primary}
                                                  />
                                                </TouchableOpacity>
                                              ) : row.label === "Transfer Content" ? (
                                                <ScrollView
                                                  style={styles.gatewayTableValueScrollView}
                                                  nestedScrollEnabled={true}
                                                  showsVerticalScrollIndicator={true}
                                                >
                                                  <Text
                                                    style={styles.gatewayTableValue}
                                                    numberOfLines={0}
                                                  >
                                                    {row.value}
                                                  </Text>
                                                </ScrollView>
                                              ) : (
                                                <Text
                                                  style={styles.gatewayTableValue}
                                                  numberOfLines={0}
                                                >
                                                  {row.value}
                                                </Text>
                                              )}
                                            </View>
                                          </View>
                                        ))}
                                      </View>
                                    </ScrollView>
                                  );
                                } catch (e) {
                                  return (
                                    <Text
                                      style={[
                                        styles.detailText,
                                        { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
                                      ]}
                                    >
                                      {typeof selectedTransaction.metadata.gateway_response ===
                                      "string"
                                        ? selectedTransaction.metadata.gateway_response.substring(
                                            0,
                                            100
                                          ) + "..."
                                        : JSON.stringify(
                                            selectedTransaction.metadata.gateway_response
                                          ).substring(0, 100) + "..."}
                                    </Text>
                                  );
                                }
                              })()}
                            </View>
                          </View>
                        )}

                        {selectedTransaction.metadata.installment_id && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Installment ID</Text>
                            <TouchableOpacity
                              onPress={() =>
                                copyToClipboard(
                                  selectedTransaction.metadata.installment_id,
                                  "Installment ID"
                                )
                              }
                              style={styles.copyableRow}
                            >
                              <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                {selectedTransaction.metadata.installment_id}
                              </Text>
                              <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        )}

                        {selectedTransaction.metadata.payment_type && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment Type</Text>
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>
                                {selectedTransaction.metadata.payment_type === "DEPOSIT"
                                  ? "Contract Deposit"
                                  : selectedTransaction.metadata.payment_type === "MILESTONE"
                                  ? "Milestone Payment"
                                  : selectedTransaction.metadata.payment_type}
                              </Text>
                            </View>
                          </View>
                        )}

                        {selectedTransaction.txType === "contract_deposit_payment" &&
                          selectedTransaction.metadata?.installment_id && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Installment (Deposit)</Text>
                              <TouchableOpacity
                                onPress={() =>
                                  copyToClipboard(
                                    selectedTransaction.metadata.installment_id,
                                    "Installment ID"
                                  )
                                }
                                style={styles.copyableRow}
                              >
                                <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                  {selectedTransaction.metadata.installment_id}
                                </Text>
                                <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                              </TouchableOpacity>
                            </View>
                          )}

                        {selectedTransaction.metadata.revisionRound && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Revision Round</Text>
                            <Text style={styles.detailText}>
                              Round {selectedTransaction.metadata.revisionRound}
                            </Text>
                          </View>
                        )}

                        {selectedTransaction.metadata.reason && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reason</Text>
                            <Text style={styles.detailText}>
                              {selectedTransaction.metadata.reason}
                            </Text>
                          </View>
                        )}

                        {selectedTransaction.metadata.refund_reason && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Refund Reason</Text>
                            <Text style={styles.detailText}>
                              {selectedTransaction.metadata.refund_reason}
                            </Text>
                          </View>
                        )}

                        {selectedTransaction.metadata.original_wallet_tx_id && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Original Transaction</Text>
                            <TouchableOpacity
                              onPress={() =>
                                copyToClipboard(
                                  selectedTransaction.metadata.original_wallet_tx_id,
                                  "Original Transaction ID"
                                )
                              }
                              style={styles.copyableRow}
                            >
                              <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                {selectedTransaction.metadata.original_wallet_tx_id}
                              </Text>
                              <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Withdrawal Request Information */}
                        {selectedTransaction.txType === "withdrawal" &&
                          selectedTransaction.metadata && (
                            <>
                              {selectedTransaction.metadata.withdrawal_request_id && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Withdrawal Request ID</Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      copyToClipboard(
                                        selectedTransaction.metadata.withdrawal_request_id,
                                        "Withdrawal Request ID"
                                      )
                                    }
                                    style={styles.copyableRow}
                                  >
                                    <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                      {selectedTransaction.metadata.withdrawal_request_id}
                                    </Text>
                                    <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                                  </TouchableOpacity>
                                </View>
                              )}
                              {selectedTransaction.metadata.bank_name && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Receiving Bank</Text>
                                  <Text style={[styles.detailText, { fontWeight: "700" }]}>
                                    {selectedTransaction.metadata.bank_name}
                                  </Text>
                                </View>
                              )}
                              {selectedTransaction.metadata.account_holder_name && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Account Holder</Text>
                                  <Text style={styles.detailText}>
                                    {selectedTransaction.metadata.account_holder_name}
                                  </Text>
                                </View>
                              )}
                              {selectedTransaction.metadata.bank_account_number && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Receiving Account Number</Text>
                                  <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                    {(() => {
                                      const accountNumber =
                                        selectedTransaction.metadata.bank_account_number;
                                      if (accountNumber && accountNumber.length > 4) {
                                        return "****" + accountNumber.slice(-4);
                                      }
                                      return accountNumber;
                                    })()}
                                  </Text>
                                </View>
                              )}
                              {selectedTransaction.metadata.provider && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Transfer Channel</Text>
                                  <View style={[styles.tag, styles.tagBlue]}>
                                    <Text style={[styles.tagText, styles.tagTextBlue]}>
                                      {selectedTransaction.metadata.provider}
                                    </Text>
                                  </View>
                                </View>
                              )}
                              {selectedTransaction.metadata.bank_ref && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Bank Reference</Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      copyToClipboard(
                                        selectedTransaction.metadata.bank_ref,
                                        "Bank Reference"
                                      )
                                    }
                                    style={styles.copyableRow}
                                  >
                                    <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                      {selectedTransaction.metadata.bank_ref}
                                    </Text>
                                    <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                                  </TouchableOpacity>
                                </View>
                              )}
                              {selectedTransaction.metadata.txn_code && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Transaction Code</Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      copyToClipboard(
                                        selectedTransaction.metadata.txn_code,
                                        "Transaction Code"
                                      )
                                    }
                                    style={styles.copyableRow}
                                  >
                                    <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                                      {selectedTransaction.metadata.txn_code}
                                    </Text>
                                    <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                                  </TouchableOpacity>
                                </View>
                              )}
                              {selectedTransaction.metadata.paid_amount &&
                                selectedTransaction.metadata.withdrawal_amount &&
                                parseFloat(selectedTransaction.metadata.paid_amount) !==
                                  parseFloat(
                                    selectedTransaction.metadata.withdrawal_amount
                                  ) && (
                                  <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Paid Amount</Text>
                                    <View>
                                      <Text
                                        style={[
                                          styles.detailText,
                                          { fontWeight: "700", color: COLORS.info },
                                        ]}
                                      >
                                        {formatCurrency(
                                          parseFloat(selectedTransaction.metadata.paid_amount),
                                          selectedTransaction.currency
                                        )}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.detailText,
                                          { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
                                        ]}
                                      >
                                        (Requested:{" "}
                                        {formatCurrency(
                                          parseFloat(
                                            selectedTransaction.metadata.withdrawal_amount
                                          ),
                                          selectedTransaction.currency
                                        )}
                                        )
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              {selectedTransaction.metadata.note && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Note</Text>
                                  <Text
                                    style={[styles.detailText, { color: COLORS.textSecondary }]}
                                  >
                                    {selectedTransaction.metadata.note}
                                  </Text>
                                </View>
                              )}
                              {selectedTransaction.metadata.admin_note && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Admin/Manager Note</Text>
                                  <Text
                                    style={[
                                      styles.detailText,
                                      { color: COLORS.textSecondary, fontStyle: "italic" },
                                    ]}
                                  >
                                    {selectedTransaction.metadata.admin_note}
                                  </Text>
                                </View>
                              )}
                              {selectedTransaction.metadata.proof_s3_key && (
                                <View style={styles.detailRow}>
                                  <Text style={styles.detailLabel}>Transfer Receipt</Text>
                                  <View style={[styles.tag, { backgroundColor: COLORS.success + "20" }]}>
                                    <Text style={[styles.tagText, { color: COLORS.success }]}>
                                      Uploaded
                                    </Text>
                                  </View>
                                  <Text
                                    style={[
                                      styles.detailText,
                                      { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
                                    ]}
                                  >
                                    (Only Admin/Manager can view)
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setTransactionDetailVisible(false);
                  setSelectedTransaction(null);
                  setContractInfo(null);
                  setMilestoneInfo(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
              {selectedTransaction?.contractId && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={() => {
                    navigation.navigate("ContractDetail", {
                      contractId: selectedTransaction.contractId,
                    });
                    setTransactionDetailVisible(false);
                  }}
                >
                  <Text style={styles.modalConfirmButtonText}>View Contract</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdrawal Request Detail Modal */}
      {selectedWithdrawalRequest && (
        <Modal
          visible={withdrawalDetailVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setWithdrawalDetailVisible(false);
            setSelectedWithdrawalRequest(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdrawal Request Details</Text>
                <TouchableOpacity
                  onPress={() => {
                    setWithdrawalDetailVisible(false);
                    setSelectedWithdrawalRequest(null);
                  }}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Request ID</Text>
                  <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                    {selectedWithdrawalRequest.withdrawalRequestId}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          WITHDRAWAL_STATUS_COLORS[selectedWithdrawalRequest.status] +
                          "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            WITHDRAWAL_STATUS_COLORS[selectedWithdrawalRequest.status],
                        },
                      ]}
                    >
                      {WITHDRAWAL_STATUS_LABELS[selectedWithdrawalRequest.status] ||
                        selectedWithdrawalRequest.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.detailText,
                      { fontWeight: "700", fontSize: FONT_SIZES.base },
                    ]}
                  >
                    {formatPriceDisplay(selectedWithdrawalRequest.amount)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Currency</Text>
                  <Text style={styles.detailText}>
                    {selectedWithdrawalRequest.currency}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank Name</Text>
                  <Text style={[styles.detailText, { fontWeight: "700" }]}>
                    {selectedWithdrawalRequest.bankName}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Holder Name</Text>
                  <Text style={styles.detailText}>
                    {selectedWithdrawalRequest.accountHolderName}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank Account Number</Text>
                  <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                    {selectedWithdrawalRequest.bankAccountNumber}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Note</Text>
                  <Text style={[styles.detailText, { color: COLORS.textSecondary }]}>
                    {selectedWithdrawalRequest.note || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailText}>
                    {formatDateTime(selectedWithdrawalRequest.createdAt)}
                  </Text>
                </View>

                {selectedWithdrawalRequest.approvedBy && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Approved By</Text>
                      <Text style={styles.detailText}>
                        {selectedWithdrawalRequest.approvedBy}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Approved At</Text>
                      <Text style={styles.detailText}>
                        {formatDateTime(selectedWithdrawalRequest.approvedAt)}
                      </Text>
                    </View>
                  </>
                )}

                {selectedWithdrawalRequest.rejectedBy && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rejected By</Text>
                      <Text style={styles.detailText}>
                        {selectedWithdrawalRequest.rejectedBy}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rejected At</Text>
                      <Text style={styles.detailText}>
                        {formatDateTime(selectedWithdrawalRequest.rejectedAt)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rejection Reason</Text>
                      <Text style={[styles.detailText, { color: COLORS.error }]}>
                        {selectedWithdrawalRequest.rejectionReason}
                      </Text>
                    </View>
                  </>
                )}

                {selectedWithdrawalRequest.completedBy && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Completed By</Text>
                      <Text style={styles.detailText}>
                        {selectedWithdrawalRequest.completedBy}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Completed At</Text>
                      <Text style={styles.detailText}>
                        {formatDateTime(selectedWithdrawalRequest.completedAt)}
                      </Text>
                    </View>
                    {selectedWithdrawalRequest.paidAmount && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Paid Amount</Text>
                        <Text
                          style={[
                            styles.detailText,
                            { fontWeight: "700", color: COLORS.success },
                          ]}
                        >
                          {formatPriceDisplay(selectedWithdrawalRequest.paidAmount)}
                        </Text>
                      </View>
                    )}
                    {selectedWithdrawalRequest.provider && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Provider</Text>
                        <Text style={styles.detailText}>
                          {selectedWithdrawalRequest.provider}
                        </Text>
                      </View>
                    )}
                    {selectedWithdrawalRequest.bankRef && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bank Reference</Text>
                        <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                          {selectedWithdrawalRequest.bankRef}
                        </Text>
                      </View>
                    )}
                    {selectedWithdrawalRequest.txnCode && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Transaction Code</Text>
                        <Text style={[styles.detailText, { fontFamily: "monospace" }]}>
                          {selectedWithdrawalRequest.txnCode}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {selectedWithdrawalRequest.failedBy && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Failed By</Text>
                      <Text style={styles.detailText}>
                        {selectedWithdrawalRequest.failedBy}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Failed At</Text>
                      <Text style={styles.detailText}>
                        {formatDateTime(selectedWithdrawalRequest.failedAt)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Failure Reason</Text>
                      <Text style={[styles.detailText, { color: COLORS.error }]}>
                        {selectedWithdrawalRequest.failureReason}
                      </Text>
                    </View>
                  </>
                )}

                {selectedWithdrawalRequest.adminNote && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Admin Note</Text>
                    <Text
                      style={[
                        styles.detailText,
                        { color: COLORS.textSecondary, fontStyle: "italic" },
                      ]}
                    >
                      {selectedWithdrawalRequest.adminNote}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={() => {
                    setWithdrawalDetailVisible(false);
                    setSelectedWithdrawalRequest(null);
                  }}
                >
                  <Text style={styles.modalConfirmButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceHeader: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.white,
    marginLeft: SPACING.sm,
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: FONT_SIZES.xxl,
    textAlign: "center",
    fontWeight: "700",
    color: COLORS.white,
    marginVertical: SPACING.md,
  },
  balanceSubtext: {
    fontSize: FONT_SIZES.xs,
    textAlign: "center",
    color: COLORS.white,
    opacity: 0.8,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  balanceActions: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  depositButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  depositButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white + "80",
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.white,
    gap: SPACING.xs,
  },
  withdrawButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  statsContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  statValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  transactionsTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary + "15",
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs / 2,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.primary,
  },
  transactionsLoading: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  transactionType: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  transactionDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  transactionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  transactionAmount: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    marginBottom: SPACING.xs / 2,
  },
  balanceAfter: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  loadingMoreText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
    maxHeight: "85%",
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
    fontSize: FONT_SIZES.base,
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
  filterSectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  filterOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
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
  inputGroup: {
    marginBottom: SPACING.md,
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
    minHeight: 80,
    textAlignVertical: "top",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    flex: 1,
  },
  pickerButtonTextPlaceholder: {
    color: COLORS.textSecondary,
  },
  required: {
    color: COLORS.error,
  },
  bankItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bankItemSelected: {
    backgroundColor: COLORS.primary + "15",
  },
  bankItemText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  bankItemTextSelected: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  // Withdraw Modal specific styles (sm font size)
  withdrawModalTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  withdrawInputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  withdrawAmountInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  withdrawTextInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  withdrawPickerButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  withdrawInputHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  withdrawModalCancelButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  withdrawModalConfirmButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
  },
  // Tabs
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  // Detail Modal
  detailRow: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: "600",
  },
  detailValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  // Copyable row
  copyableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  // Contract row
  contractRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  // Link button
  linkButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  linkButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  // Tag
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background,
    alignSelf: "flex-start",
  },
  tagBlue: {
    backgroundColor: COLORS.info + "20",
  },
  tagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  tagTextBlue: {
    color: COLORS.info,
  },
  // Gateway info - Table style
  gatewayTableContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    maxHeight: 400,
  },
  gatewayTableScrollView: {
    maxHeight: 400,
  },
  gatewayTable: {
    width: "100%",
  },
  gatewayTableRow: {
    flexDirection: "row",
    minHeight: 40,
    backgroundColor: COLORS.white,
    alignItems: "flex-start",
  },
  gatewayTableRowLongContent: {
    minHeight: 100,
    maxHeight: 200,
  },
  gatewayTableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gatewayTableLabelCell: {
    width: "40%",
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    justifyContent: "flex-start",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  gatewayTableValueCell: {
    flex: 1,
    padding: SPACING.sm,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  gatewayTableValueCellLongContent: {
    maxHeight: 200,
    minHeight: 100,
  },
  gatewayTableValueScrollView: {
    maxHeight: 180,
    width: "100%",
  },
  gatewayTableLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  gatewayTableValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flexShrink: 1,
    flexWrap: "wrap",
  },
});

export default WalletScreen;

