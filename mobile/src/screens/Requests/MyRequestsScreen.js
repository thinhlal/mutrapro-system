import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import RequestCard from "../../components/RequestCard";
import { getMyRequests } from "../../services/serviceRequestService";

const MyRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
  });

  const STATUS_OPTIONS = [
    { value: "", label: "All Status" },
    { value: "pending_no_manager", label: "Waiting for manager" },
    { value: "pending_has_manager", label: "Assigned - pending" },
    { value: "contract_sent", label: "Contract sent" },
    { value: "contract_approved", label: "Contract approved - awaiting signature" },
    { value: "contract_signed", label: "Contract signed" },
    { value: "awaiting_assignment", label: "Awaiting assignment" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "rejected", label: "Rejected" },
  ];

  useEffect(() => {
    loadRequests(selectedStatus, 0, pagination.pageSize);
  }, [selectedStatus]);

  const loadRequests = async (status = "", page = 0, size = 10, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      }

      // Handle special pending cases
      const isPendingNoManager = status === "pending_no_manager";
      const isPendingHasManager = status === "pending_has_manager";

      // Build filters
      const filters = {
        page: page,
        size: size,
        sort: "createdAt,desc",
      };

      // Add status filter
      if (isPendingNoManager || isPendingHasManager) {
        filters.status = "pending";
      } else if (status && status.trim() !== "") {
        filters.status = status;
      }

      const response = await getMyRequests(filters);

      if (response && response.status === "success") {
        const pageData = response.data;

        let data = [];
        let paginationInfo = {
          current: 1,
          pageSize: size,
          total: 0,
          hasMore: false,
        };

        if (Array.isArray(pageData)) {
          data = pageData;
          paginationInfo = {
            current: 1,
            pageSize: size,
            total: pageData.length,
            hasMore: false,
          };
        } else if (pageData && typeof pageData === "object") {
          data = pageData.content || [];
          paginationInfo = {
            current: (pageData.number || 0) + 1,
            pageSize: pageData.size || size,
            total: pageData.totalElements || 0,
            hasMore: !pageData.last,
          };
        }

        // Client-side filtering for special pending cases
        if (isPendingNoManager) {
          data = data.filter((r) => !r.managerUserId);
        } else if (isPendingHasManager) {
          data = data.filter((r) => !!r.managerUserId);
        }

        if (isLoadMore) {
          setRequests((prev) => [...prev, ...data]);
        } else {
          setRequests(data);
        }
        setPagination(paginationInfo);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests(selectedStatus, 0, pagination.pageSize);
  }, [selectedStatus, pagination.pageSize]);

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      loadRequests(selectedStatus, pagination.current, pagination.pageSize, true);
    }
  };

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    setShowFilterModal(false);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleRequestPress = (request) => {
    // Navigate to request detail screen
    navigation.navigate("RequestDetail", { requestId: request.requestId });
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Status</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={STATUS_OPTIONS}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedStatus === item.value && styles.filterOptionSelected,
                ]}
                onPress={() => handleStatusChange(item.value)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedStatus === item.value && styles.filterOptionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedStatus === item.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>My Requests</Text>
          <Text style={styles.headerSubtitle}>
            {pagination.total > 0 ? `${pagination.total} requests` : "No requests"}
          </Text>
        </View>
      </View>

      {/* Filter Button */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
      >
        <Ionicons name="filter" size={20} color={COLORS.primary} />
        <Text style={styles.filterButtonText}>
          {selectedStatus
            ? STATUS_OPTIONS.find((opt) => opt.value === selectedStatus)?.label
            : "All Status"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={80} color={COLORS.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Requests</Text>
      <Text style={styles.emptyStateText}>
        {selectedStatus
          ? `No requests with status "${STATUS_OPTIONS.find((opt) => opt.value === selectedStatus)?.label}"`
          : "You haven't created any service requests yet."}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!pagination.hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.requestId}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={
          requests.length === 0 ? styles.emptyListContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}
    </View>
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
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  headerTop: {
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  filterButtonText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: SPACING.sm,
    marginRight: SPACING.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  footerLoaderText: {
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
    maxHeight: "80%",
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
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + "10",
  },
  filterOptionText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    fontWeight: "700",
    color: COLORS.primary,
  },
});

export default MyRequestsScreen;

