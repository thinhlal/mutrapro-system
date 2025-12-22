import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
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

  // Reload contracts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadContracts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

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
      sent: "Sent",
      approved: "Approved",
      signed: "Signed - Pending deposit payment",
      active_pending_assignment: "Deposit paid - Pending assignment",
      active: "Signed - Deposit paid",
      completed: "Completed - Fully paid",
      rejected_by_customer: "Rejected",
      need_revision: "Needs revision",
      canceled_by_customer: "Cancelled",
      canceled_by_manager: "Cancelled by manager",
      expired: "Expired",
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <TouchableOpacity 
              onPress={() => setSearch("")}
              style={styles.clearSearchButton}
            >
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
            activeOpacity={0.7}
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
              activeOpacity={0.7}
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
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
    </SafeAreaView>
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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.contractNumber} numberOfLines={1}>
                {contract.contractNumber || contract.contractId}
              </Text>
              <Text style={styles.contractType} numberOfLines={1}>
                Service: {getServiceName(contract.contractType)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.arrowIcon} />
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body Section */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Text style={styles.infoLabel}>Total Price</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatCurrency(contract.totalPrice, contract.currency)}
            </Text>
          </View>
          {contract.depositAmount && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="wallet-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Deposit</Text>
              </View>
              <Text style={styles.infoValue}>
                {formatCurrency(contract.depositAmount, contract.currency)}
              </Text>
            </View>
          )}
          {contract.createdAt && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Text style={styles.infoLabel}>Created</Text>
              </View>
              <Text style={styles.infoValue}>
                {dayjs(contract.createdAt).format("DD/MM/YYYY")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingRight: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: 36,
    justifyContent: "center",
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
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    textAlign: "center",
    fontWeight: "500",
  },
  clearButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  cardContent: {
    padding: SPACING.md + 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  statusLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  contractNumber: {
    fontSize: FONT_SIZES.base + 1,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  contractType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  arrowIcon: {
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
    marginHorizontal: -SPACING.md - 2,
  },
  cardBody: {
    paddingTop: SPACING.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "right",
  },
});

export default ContractsListScreen;

