import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import { getServiceRequestById } from "../../services/serviceRequestService";
import {
  getContractsByRequestId,
  approveContract,
  requestChangeContract,
  cancelContract,
} from "../../services/contractService";
import { getNotationInstrumentsByIds } from "../../services/instrumentService";
import ContractCard from "../../components/ContractCard";
import FileItem from "../../components/FileItem";

const RequestDetailScreen = ({ navigation, route }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [instruments, setInstruments] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [requestChangeModalVisible, setRequestChangeModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [changeReason, setChangeReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadRequestDetail();
    loadContracts();
  }, [requestId]);

  const loadRequestDetail = async () => {
    try {
      setLoading(true);
      const response = await getServiceRequestById(requestId);
      if (response?.status === "success" && response?.data) {
        setRequest(response.data);
        
        // Load instruments if available
        if (response.data.instrumentIds && response.data.instrumentIds.length > 0) {
          loadInstruments(response.data.instrumentIds);
        }
      } else {
        Alert.alert("Error", "Failed to load request details");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading request:", error);
      Alert.alert("Error", error.message || "Failed to load request details");
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadContracts = async () => {
    try {
      setLoadingContracts(true);
      const response = await getContractsByRequestId(requestId);
      if (response?.status === "success" && response?.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      console.error("Error loading contracts:", error);
      // Don't show error if no contracts yet
    } finally {
      setLoadingContracts(false);
    }
  };

  const loadInstruments = async (instrumentIds) => {
    try {
      const response = await getNotationInstrumentsByIds(instrumentIds);
      if (response?.status === "success" && response?.data) {
        setInstruments(response.data);
      }
    } catch (error) {
      console.error("Error loading instruments:", error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequestDetail();
    loadContracts();
  }, [requestId]);

  const handleApproveContract = async (contractId) => {
    try {
      setActionLoading(true);
      await approveContract(contractId);
      Alert.alert("Success", "Contract approved successfully");
      await loadContracts();
      await loadRequestDetail();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to approve contract");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChange = async () => {
    if (!selectedContract || !changeReason.trim()) {
      Alert.alert("Error", "Please enter the reason for requesting changes");
      return;
    }
    if (changeReason.trim().length < 10) {
      Alert.alert("Error", "Reason must be at least 10 characters");
      return;
    }

    try {
      setActionLoading(true);
      await requestChangeContract(selectedContract.contractId, changeReason);
      Alert.alert("Success", "Change request sent successfully");
      setRequestChangeModalVisible(false);
      setChangeReason("");
      setSelectedContract(null);
      await loadContracts();
      await loadRequestDetail();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to request change");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelContract = async () => {
    if (!selectedContract || !cancelReason.trim()) {
      Alert.alert("Error", "Please enter the reason for cancelling");
      return;
    }
    if (cancelReason.trim().length < 10) {
      Alert.alert("Error", "Reason must be at least 10 characters");
      return;
    }

    try {
      setActionLoading(true);
      await cancelContract(selectedContract.contractId, cancelReason);
      Alert.alert("Success", "Contract cancelled successfully");
      setCancelModalVisible(false);
      setCancelReason("");
      setSelectedContract(null);
      await loadContracts();
      await loadRequestDetail();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to cancel contract");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusConfig = (status, hasManager) => {
    const configs = {
      pending: {
        color: hasManager ? COLORS.warning : COLORS.textSecondary,
        icon: hasManager ? "time-outline" : "alert-circle-outline",
        text: hasManager ? "Assigned - pending" : "Waiting for manager",
        bgColor: hasManager ? COLORS.warning + "15" : COLORS.textSecondary + "15",
      },
      contract_sent: {
        color: COLORS.info,
        icon: "document-text-outline",
        text: "Contract sent",
        bgColor: COLORS.info + "15",
      },
      contract_approved: {
        color: COLORS.info,
        icon: "checkmark-circle-outline",
        text: "Contract approved",
        bgColor: COLORS.info + "15",
      },
      contract_signed: {
        color: COLORS.primary,
        icon: "document-text",
        text: "Contract signed",
        bgColor: COLORS.primary + "15",
      },
      in_progress: {
        color: COLORS.primary,
        icon: "sync-outline",
        text: "In progress",
        bgColor: COLORS.primary + "15",
      },
      completed: {
        color: COLORS.success,
        icon: "checkmark-circle",
        text: "Completed",
        bgColor: COLORS.success + "15",
      },
      cancelled: {
        color: COLORS.textSecondary,
        icon: "close-circle-outline",
        text: "Cancelled",
        bgColor: COLORS.textSecondary + "15",
      },
      rejected: {
        color: COLORS.error,
        icon: "close-circle",
        text: "Rejected",
        bgColor: COLORS.error + "15",
      },
    };
    return configs[status] || {
      color: COLORS.textSecondary,
      icon: "help-circle-outline",
      text: status,
      bgColor: COLORS.textSecondary + "15",
    };
  };

  const getRequestTypeText = (type) => {
    const types = {
      transcription: "Transcription",
      arrangement: "Arrangement",
      arrangement_with_recording: "Arrangement + Recording",
      recording: "Recording",
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "N/A";
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getManagerStatusText = () => {
    if (!request) return "";
    const hasManager = !!request.managerUserId;
    const status = request.status;
    
    if (hasManager) {
      if (status === "completed") return "Completed";
      if (status === "cancelled" || status === "rejected") return "Closed";
      return "Manager processing";
    }
    
    if (status === "completed") return "Completed";
    if (status === "cancelled" || status === "rejected") return "Closed";
    return "Not assigned • Pending";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Request not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = getStatusConfig(request.status, !!request.managerUserId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {/* Title and Status */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{request.title}</Text>
          <View style={styles.badges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {getRequestTypeText(request.requestType)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>
        </View>

        {/* Request Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request Information</Text>

          <InfoRow
            icon="finger-print-outline"
            label="Request ID"
            value={request.requestId}
            monospace
          />
          <InfoRow
            icon="document-text-outline"
            label="Description"
            value={request.description || "No description"}
          />
          <InfoRow
            icon="person-outline"
            label="Contact Name"
            value={request.contactName}
          />
          <InfoRow icon="mail-outline" label="Email" value={request.contactEmail} />
          <InfoRow icon="call-outline" label="Phone" value={request.contactPhone} />

          {request.durationMinutes && (
            <InfoRow
              icon="time-outline"
              label="Duration"
              value={formatDuration(request.durationMinutes)}
              valueColor={COLORS.success}
            />
          )}

          {request.tempoPercentage && request.requestType === "transcription" && (
            <InfoRow
              icon="musical-note-outline"
              label="Tempo"
              value={`${request.tempoPercentage}%`}
            />
          )}

          {request.hasVocalist !== undefined && request.requestType !== "transcription" && (
            <InfoRow
              icon="mic-outline"
              label="Vocalist"
              value={request.hasVocalist ? "Yes" : "No"}
              valueColor={request.hasVocalist ? COLORS.success : COLORS.textSecondary}
            />
          )}

          {request.externalGuestCount > 0 && (
            <InfoRow
              icon="people-outline"
              label="Guests"
              value={`${request.externalGuestCount} ${request.externalGuestCount === 1 ? "person" : "people"}`}
            />
          )}

          {instruments.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="musical-notes-outline" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Instruments</Text>
                <View style={styles.instrumentsContainer}>
                  {instruments.map((inst) => (
                    <View key={inst.instrumentId} style={styles.instrumentTag}>
                      <Text style={styles.instrumentTagText}>{inst.instrumentName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Manager Info */}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={18} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Manager</Text>
              {request.managerInfo ? (
                <View style={styles.managerInfo}>
                  <Text style={styles.managerName}>{request.managerInfo.fullName || "N/A"}</Text>
                  <Text style={styles.managerDetail}>{request.managerInfo.email || "N/A"}</Text>
                  {request.managerInfo.phone && (
                    <Text style={styles.managerDetail}>{request.managerInfo.phone}</Text>
                  )}
                  <View style={styles.managerStatusBadge}>
                    <Text style={styles.managerStatusText}>{getManagerStatusText()}</Text>
                  </View>
                </View>
              ) : request.managerUserId ? (
                <View style={styles.managerInfo}>
                  <Text style={styles.managerDetail}>ID: {request.managerUserId}</Text>
                  <View style={styles.managerStatusBadge}>
                    <Text style={styles.managerStatusText}>{getManagerStatusText()}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.managerStatusBadge}>
                  <Text style={styles.managerStatusText}>{getManagerStatusText()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Files */}
          {request.files && request.files.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.filesSection}>
                <Text style={styles.filesSectionTitle}>Uploaded Files</Text>
                {request.files.map((file, index) => (
                  <FileItem key={index} file={file} />
                ))}
              </View>
            </>
          )}

          <View style={styles.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Created At"
            value={formatDate(request.createdAt)}
          />
          <InfoRow
            icon="sync-outline"
            label="Last Updated"
            value={formatDate(request.updatedAt)}
          />
        </View>

        {/* Contracts Section */}
        <View style={styles.contractsSection}>
          <Text style={styles.sectionTitle}>Contracts</Text>
          {loadingContracts ? (
            <View style={styles.contractsLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.contractsLoadingText}>Loading contracts...</Text>
            </View>
          ) : contracts.length > 0 ? (
            contracts.map((contract) => (
              <TouchableOpacity
                key={contract.contractId}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("ContractDetail", {
                    contractId: contract.contractId,
                  })
                }
              >
                <ContractCard
                  contract={contract}
                  onApprove={handleApproveContract}
                  onRequestChange={(c) => {
                    setSelectedContract(c);
                    setRequestChangeModalVisible(true);
                  }}
                  onCancel={(c) => {
                    setSelectedContract(c);
                    setCancelModalVisible(true);
                  }}
                  loading={actionLoading}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noContracts}>
              <Ionicons name="document-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.noContractsText}>No contracts yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Request Change Modal */}
      <Modal
        visible={requestChangeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setRequestChangeModalVisible(false);
          setChangeReason("");
          setSelectedContract(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Contract Change</Text>
              <TouchableOpacity
                onPress={() => {
                  setRequestChangeModalVisible(false);
                  setChangeReason("");
                  setSelectedContract(null);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Please enter the reason you want to change contract{" "}
              <Text style={styles.modalContractNumber}>
                {selectedContract?.contractNumber}
              </Text>
            </Text>

            <TextInput
              style={styles.modalTextArea}
              placeholder="Please enter the reason for requesting changes (minimum 10 characters)..."
              placeholderTextColor={COLORS.textSecondary}
              value={changeReason}
              onChangeText={setChangeReason}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{changeReason.length}/500</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setRequestChangeModalVisible(false);
                  setChangeReason("");
                  setSelectedContract(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  actionLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleRequestChange}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Contract Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCancelModalVisible(false);
          setCancelReason("");
          setSelectedContract(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Contract</Text>
              <TouchableOpacity
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancelReason("");
                  setSelectedContract(null);
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Are you sure you want to cancel contract{" "}
              <Text style={styles.modalContractNumber}>
                {selectedContract?.contractNumber}
              </Text>
              ? This action cannot be undone.
            </Text>

            <TextInput
              style={styles.modalTextArea}
              placeholder="Please enter the reason for cancelling (minimum 10 characters)..."
              placeholderTextColor={COLORS.textSecondary}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{cancelReason.length}/500</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancelReason("");
                  setSelectedContract(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>No, keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalDangerButton,
                  actionLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleCancelContract}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalDangerButtonText}>Yes, cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper component for info rows
const InfoRow = ({ icon, label, value, monospace, valueColor }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          monospace && styles.monospace,
          valueColor && { color: valueColor },
        ]}
      >
        {value}
      </Text>
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
  backButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  titleSection: {
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
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  typeBadge: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  typeBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: SPACING.xs / 2,
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
  monospace: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: FONT_SIZES.sm,
  },
  instrumentsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.xs / 2,
  },
  instrumentTag: {
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  instrumentTagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  managerInfo: {
    marginTop: SPACING.xs / 2,
  },
  managerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  managerDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  managerStatusBadge: {
    backgroundColor: COLORS.primary + "15",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  managerStatusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  filesSection: {
    marginTop: SPACING.md,
  },
  filesSectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  contractsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  contractsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
  },
  contractsLoadingText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  noContracts: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
  },
  noContractsText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
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
    padding: SPACING.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalDescription: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  modalContractNumber: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalTextArea: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: SPACING.xs,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
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
  modalDangerButton: {
    backgroundColor: COLORS.error,
  },
  modalDangerButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});

export default RequestDetailScreen;

