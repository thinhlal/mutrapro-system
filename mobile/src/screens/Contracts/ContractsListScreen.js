import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getAllContracts } from "../../services/contractService";

const ContractsListScreen = ({ navigation }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await getAllContracts();
      if (response?.status === "success" && response?.data) {
        setContracts(response.data || []);
      } else {
        setContracts([]);
      }
    } catch (error) {
      console.error("Error loading contracts:", error);
      Alert.alert("Error", error.message || "Failed to load contracts");
      setContracts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadContracts();
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const contractType = contract.contractType?.toLowerCase() || "";
      const statusLower = contract.status?.toLowerCase() || "";
      const searchLower = (search || "").toLowerCase().trim();
      
      const searchMatch =
        !searchLower ||
        (contract.contractNumber || "").toLowerCase().includes(searchLower) ||
        (contract.nameSnapshot || "").toLowerCase().includes(searchLower) ||
        contractType.includes(searchLower);
      
      const statusMatch = !filterStatus || statusLower === filterStatus.toLowerCase();
      
      return searchMatch && statusMatch;
    });
  }, [contracts, search, filterStatus]);

  const formatCurrency = (amount, currency = "VND") => {
    if (!amount) return "0 ₫";
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const colorMap = {
      completed: COLORS.success,
      draft: COLORS.textSecondary,
      sent: COLORS.info,
      approved: COLORS.success,
      signed: COLORS.warning,
      active_pending_assignment: COLORS.warning,
      active: COLORS.success,
      rejected_by_customer: COLORS.error,
      need_revision: COLORS.warning,
      canceled_by_customer: COLORS.textSecondary,
      canceled_by_manager: COLORS.warning,
      expired: COLORS.error,
    };
    return colorMap[statusLower] || COLORS.textSecondary;
  };

  const getStatusLabel = (status) => {
    const statusLower = status?.toLowerCase() || "";
    const labelMap = {
      draft: "Draft",
      sent: "Đã gửi",
      approved: "Đã duyệt",
      signed: "Đã ký - Chờ thanh toán deposit",
      active_pending_assignment: "Đã nhận cọc - Chờ gán task",
      active: "Đã ký - Đã thanh toán deposit",
      completed: "Hoàn thành - Đã thanh toán hết",
      rejected_by_customer: "Bị từ chối",
      need_revision: "Cần chỉnh sửa",
      canceled_by_customer: "Đã hủy",
      canceled_by_manager: "Đã thu hồi",
      expired: "Hết hạn",
    };
    return labelMap[statusLower] || status;
  };

  const getServiceName = (contractType) => {
    if (!contractType) return "N/A";
    const typeMap = {
      transcription: "Transcription",
      arrangement: "Arrangement",
      arrangement_with_recording: "Arrangement with Recording",
      recording: "Recording",
      bundle: "Bundle (T+A+R)",
    };
    const typeLower = contractType.toLowerCase();
    return typeMap[typeLower] || contractType;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading contracts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Contracts</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contracts..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !filterStatus && styles.filterChipActive,
            ]}
            onPress={() => setFilterStatus(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !filterStatus && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {["sent", "approved", "signed", "active", "completed"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                filterStatus === status && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === status && styles.filterChipTextActive,
                ]}
              >
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Contracts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredContracts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-outline"
              size={64}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>
              {search || filterStatus
                ? "No contracts found"
                : "No contracts yet"}
            </Text>
            {search || filterStatus ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearch("");
                  setFilterStatus(null);
                }}
              >
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filteredContracts.map((contract) => (
            <ContractCard
              key={contract.contractId}
              contract={contract}
              onPress={() =>
                navigation.navigate("ContractDetail", {
                  contractId: contract.contractId,
                })
              }
              formatCurrency={formatCurrency}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getServiceName={getServiceName}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

// Contract Card Component
const ContractCard = ({
  contract,
  onPress,
  formatCurrency,
  getStatusColor,
  getStatusLabel,
  getServiceName,
}) => {
  const statusColor = getStatusColor(contract.status);
  const statusLabel = getStatusLabel(contract.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.contractNumber}>
              {contract.contractNumber || contract.contractId}
            </Text>
            <Text style={styles.contractType}>
              {getServiceName(contract.contractType)}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + "20" },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoLabel}>Total Price:</Text>
          <Text style={styles.infoValue}>
            {formatCurrency(contract.totalPrice, contract.currency)}
          </Text>
        </View>
        {contract.depositAmount && (
          <View style={styles.infoRow}>
            <Ionicons name="wallet-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>Deposit:</Text>
            <Text style={styles.infoValue}>
              {formatCurrency(contract.depositAmount, contract.currency)}
            </Text>
          </View>
        )}
        {contract.createdAt && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {dayjs(contract.createdAt).format("DD/MM/YYYY")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

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
  searchContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  filterContainer: {
    marginTop: SPACING.sm,
  },
  filterContent: {
    paddingRight: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  clearButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardHeaderText: {
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
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
  cardBody: {
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    marginRight: SPACING.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  cardFooter: {
    alignItems: "flex-end",
    marginTop: SPACING.xs,
  },
});

export default ContractsListScreen;

