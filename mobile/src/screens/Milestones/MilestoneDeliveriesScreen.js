import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import {
  getDeliveredSubmissionsByMilestone,
  customerReviewSubmission,
} from "../../services/fileSubmissionService";
import { getServiceRequestById } from "../../services/serviceRequestService";
import { getContractById } from "../../services/contractService";
import FileItem from "../../components/FileItem";
import axiosInstance from "../../utils/axiosInstance";
import { API_CONFIG } from "../../config/apiConfig";

const MilestoneDeliveriesScreen = ({ navigation, route }) => {
  const { contractId, milestoneId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);
  const [requestInfoLoading, setRequestInfoLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal states
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewAction, setReviewAction] = useState(""); // 'accept' or 'request_revision'
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionDescription, setRevisionDescription] = useState("");

  useEffect(() => {
    if (contractId && milestoneId) {
      loadDeliveries();
    }
  }, [contractId, milestoneId]);

  const loadRequestInfo = async (requestId) => {
    if (!requestId) return;

    try {
      setRequestInfoLoading(true);
      const response = await getServiceRequestById(requestId);
      if (response?.status === "success" && response?.data) {
        setRequestInfo(response.data);
      } else {
        setRequestInfo(null);
      }
    } catch (error) {
      console.error("Error loading request info:", error);
      setRequestInfo(null);
    } finally {
      setRequestInfoLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await getDeliveredSubmissionsByMilestone(
        milestoneId,
        contractId
      );

      if (response?.status === "success" && response?.data) {
        const data = response.data;
        setContractInfo(data.contract);
        setMilestoneInfo(data.milestone);

        // Lazy load request info
        if (data.contract?.requestId) {
          loadRequestInfo(data.contract.requestId);
        } else {
          setRequestInfo(null);
        }

        // Set revision requests
        const allRevisionRequests = Array.isArray(data.revisionRequests)
          ? data.revisionRequests
          : [];
        setRevisionRequests(allRevisionRequests);

        // Set submissions
        const allSubmissions = Array.isArray(data.submissions)
          ? data.submissions
          : [];
        setSubmissions(allSubmissions);
      } else {
        setContractInfo(null);
        setMilestoneInfo(null);
        setRequestInfo(null);
        setSubmissions([]);
        setRevisionRequests([]);
      }
    } catch (error) {
      console.error("Error loading deliveries:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to load deliveries"
      );
      setContractInfo(null);
      setMilestoneInfo(null);
      setRequestInfo(null);
      setSubmissions([]);
      setRevisionRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/projects/files/download/${fileId}`;
      const response = await axiosInstance.get(url, {
        responseType: "blob",
      });

      // For mobile, we'll open the file URL directly
      const fileUrl = `${API_CONFIG.BASE_URL}/api/v1/projects/files/download/${fileId}`;
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert("Error", "Cannot open this file type");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      Alert.alert("Error", "Failed to download file");
    }
  };

  const handlePreviewFile = async (file) => {
    try {
      const fileUrl = `${API_CONFIG.BASE_URL}/api/v1/projects/files/preview/${file.fileId}`;
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert("Error", "Cannot preview this file type");
      }
    } catch (error) {
      console.error("Error previewing file:", error);
      Alert.alert("Error", "Failed to preview file");
    }
  };

  const handleOpenReviewModal = (submission, action) => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setRevisionTitle("");
    setRevisionDescription("");
    setReviewModalVisible(true);
  };

  const handleReviewSubmission = async () => {
    if (!selectedSubmission) return;

    if (reviewAction === "request_revision") {
      if (!revisionTitle.trim()) {
        Alert.alert("Validation Error", "Please enter revision title");
        return;
      }
      if (!revisionDescription.trim()) {
        Alert.alert("Validation Error", "Please enter revision description");
        return;
      }
    }

    try {
      setActionLoading(true);
      const response = await customerReviewSubmission(
        selectedSubmission.submissionId,
        reviewAction,
        reviewAction === "request_revision" ? revisionTitle : "",
        reviewAction === "request_revision" ? revisionDescription : ""
      );

      if (response?.status === "success") {
        Alert.alert(
          "Success",
          reviewAction === "accept"
            ? "Submission accepted successfully"
            : "Revision request sent successfully",
          [
            {
              text: "OK",
              onPress: () => {
                setReviewModalVisible(false);
                setSelectedSubmission(null);
                setRevisionTitle("");
                setRevisionDescription("");
                loadDeliveries();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", response?.message || "Failed to review submission");
      }
    } catch (error) {
      console.error("Error reviewing submission:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to review submission"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Helper function to check if submission can show action buttons
  const canShowActionButtons = (submission) => {
    if (submission.status?.toLowerCase() !== "delivered") {
      return false;
    }

    const submissionId = submission.submissionId;

    // Find all related revision requests
    const relatedRevisions = revisionRequests.filter(
      (rr) =>
        rr.originalSubmissionId === submissionId ||
        rr.revisedSubmissionId === submissionId
    );

    if (relatedRevisions.length === 0) {
      // No revision requests - can accept or request revision
      return true;
    }

    // Check for rejected revisions
    const rejectedRevision = relatedRevisions.find((rr) => {
      const status = rr.status?.toUpperCase();
      return status === "REJECTED" && rr.originalSubmissionId === submissionId;
    });

    if (rejectedRevision) {
      // Check if there's a newer revision
      const hasNewerRevision = relatedRevisions.some((rr) => {
        const rrStatus = rr.status?.toUpperCase();
        const isNewer =
          (rr.revisionRound || 0) > (rejectedRevision.revisionRound || 0) ||
          (rr.requestedAt &&
            rejectedRevision.requestedAt &&
            new Date(rr.requestedAt) > new Date(rejectedRevision.requestedAt));
        const isActive =
          rrStatus === "PENDING_MANAGER_REVIEW" ||
          rrStatus === "IN_REVISION" ||
          rrStatus === "WAITING_MANAGER_REVIEW" ||
          rrStatus === "APPROVED_PENDING_DELIVERY" ||
          rrStatus === "WAITING_CUSTOMER_CONFIRM" ||
          rrStatus === "COMPLETED";
        return isNewer && isActive && rr.originalSubmissionId === submissionId;
      });

      if (!hasNewerRevision) {
        return true; // Can show buttons after rejection
      }
    }

    // Check for pending revisions
    const pendingRevision = relatedRevisions.find((rr) => {
      const status = rr.status?.toUpperCase();
      return (
        status === "PENDING_MANAGER_REVIEW" ||
        status === "IN_REVISION" ||
        status === "WAITING_MANAGER_REVIEW" ||
        status === "APPROVED_PENDING_DELIVERY"
      );
    });

    if (pendingRevision) {
      const isOriginal = pendingRevision.originalSubmissionId === submissionId;
      if (isOriginal) {
        return false; // Already requested revision
      }
    }

    // Check for completed revisions
    const completedRevision = relatedRevisions.find((rr) => {
      const status = rr.status?.toUpperCase();
      return status === "COMPLETED" || status === "WAITING_CUSTOMER_CONFIRM";
    });

    if (completedRevision) {
      const status = completedRevision.status?.toUpperCase();
      const isOriginal = completedRevision.originalSubmissionId === submissionId;
      const isRevised = completedRevision.revisedSubmissionId === submissionId;

      if (isOriginal) {
        return false; // Already has new submission
      }

      if (isRevised && status === "WAITING_CUSTOMER_CONFIRM") {
        return true; // New submission after revision, needs review
      }

      if (isRevised && status === "COMPLETED") {
        // Check if there's another pending revision
        const hasPendingRevision = relatedRevisions.some((rr) => {
          const rrStatus = rr.status?.toUpperCase();
          return (
            rr.revisionRequestId !== completedRevision.revisionRequestId &&
            (rrStatus === "PENDING_MANAGER_REVIEW" ||
              rrStatus === "IN_REVISION" ||
              rrStatus === "WAITING_MANAGER_REVIEW" ||
              rrStatus === "APPROVED_PENDING_DELIVERY") &&
            rr.originalSubmissionId === submissionId
          );
        });

        return !hasPendingRevision; // Show accepted if no pending revisions
      }
    }

    return true; // Default: can show buttons
  };

  // Helper function to check if free revisions are available
  const hasFreeRevisionsLeft = () => {
    if (contractInfo?.freeRevisionsIncluded == null) {
      return false;
    }

    const freeRevisionsUsed = revisionRequests.filter(
      (rr) =>
        rr.isFreeRevision === true &&
        rr.status?.toUpperCase() !== "REJECTED" &&
        rr.status?.toUpperCase() !== "CANCELED"
    ).length;

    return freeRevisionsUsed < contractInfo.freeRevisionsIncluded;
  };

  const handleRequestRevision = (submission) => {
    const hasFreeLeft = hasFreeRevisionsLeft();

    if (!hasFreeLeft) {
      // Paid revision - navigate to payment
      const feeAmount = contractInfo?.additionalRevisionFeeVnd || 0;
      Alert.alert(
        "Paid Revision",
        `You have used all ${contractInfo?.freeRevisionsIncluded || 0} free revisions. This revision will cost ${feeAmount.toLocaleString("vi-VN")} VND.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Pay Now",
            onPress: () => {
              navigation.navigate("PaymentRevisionFee", {
                contractId,
                milestoneId: milestoneInfo?.milestoneId,
                submissionId: submission.submissionId,
                taskAssignmentId: submission.assignmentId,
                feeAmount: feeAmount,
                revisionRound: (revisionRequests.length || 0) + 1,
              });
            },
          },
        ]
      );
    } else {
      // Free revision - open modal
      handleOpenReviewModal(submission, "request_revision");
    }
  };

  const formatCurrency = (amount, currency = "VND") => {
    if (!amount) return "0 ₫";
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "delivered") return COLORS.success;
    if (statusLower === "revision_requested") return COLORS.warning;
    return COLORS.textSecondary;
  };

  const getStatusLabel = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "delivered") return "Đã gửi";
    if (statusLower === "revision_requested") return "Yêu cầu chỉnh sửa";
    return status || "Unknown";
  };

  const getWorkStatusColor = (status) => {
    const statusUpper = status?.toUpperCase() || "";
    if (statusUpper === "WAITING_CUSTOMER") return COLORS.warning;
    if (statusUpper === "COMPLETED") return COLORS.success;
    if (statusUpper === "IN_PROGRESS") return COLORS.info;
    return COLORS.textSecondary;
  };

  const getWorkStatusLabel = (status) => {
    const statusUpper = status?.toUpperCase() || "";
    if (statusUpper === "WAITING_CUSTOMER") return "Chờ khách hàng phản hồi";
    if (statusUpper === "COMPLETED") return "Hoàn thành";
    if (statusUpper === "IN_PROGRESS") return "Đang thực hiện";
    return status || "Unknown";
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("ContractDetail", { contractId })}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Deliveries - {milestoneInfo?.name || "Milestone"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Contract & Milestone Info Card */}
        {contractInfo && milestoneInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contract & Milestone Info</Text>
            <InfoRow
              icon="document-text-outline"
              label="Contract Number"
              value={contractInfo.contractNumber || contractId}
            />
            <InfoRow
              icon="briefcase-outline"
              label="Contract Type"
              value={contractInfo.contractType?.toUpperCase() || "N/A"}
            />
            <InfoRow
              icon="flag-outline"
              label="Milestone Name"
              value={milestoneInfo.name || "N/A"}
            />
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={18}
                color={COLORS.textSecondary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Milestone Status</Text>
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getWorkStatusColor(milestoneInfo.workStatus) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getWorkStatusColor(milestoneInfo.workStatus) },
                    ]}
                  >
                    {getWorkStatusLabel(milestoneInfo.workStatus)}
                  </Text>
                </View>
              </View>
            </View>
            {milestoneInfo.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>
                  {milestoneInfo.description}
                </Text>
              </View>
            )}
            {milestoneInfo.plannedDueDate && (
              <InfoRow
                icon="calendar-outline"
                label="Planned Due Date"
                value={dayjs(milestoneInfo.plannedDueDate).format("DD/MM/YYYY")}
              />
            )}
            <InfoRow
              icon="document-outline"
              label="Total Submissions"
              value={submissions.length.toString()}
            />
            <InfoRow
              icon="folder-outline"
              label="Total Files"
              value={submissions
                .reduce((total, sub) => total + (sub.files?.length || 0), 0)
                .toString()}
            />
            {contractInfo.freeRevisionsIncluded != null && (
              <>
                <InfoRow
                  icon="repeat-outline"
                  label="Free Revisions Included"
                  value={contractInfo.freeRevisionsIncluded.toString()}
                />
                <View style={styles.infoRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Revisions Used</Text>
                    <Text style={styles.infoValue}>
                      {revisionRequests.length} / {contractInfo.freeRevisionsIncluded} (Free)
                    </Text>
                    <Text style={styles.infoHint}>
                      Free:{" "}
                      {revisionRequests.filter(
                        (rr) =>
                          rr.isFreeRevision === true &&
                          rr.status?.toUpperCase() !== "REJECTED" &&
                          rr.status?.toUpperCase() !== "CANCELED"
                      ).length}{" "}
                      | Paid:{" "}
                      {revisionRequests.filter(
                        (rr) => rr.isFreeRevision === false
                      ).length}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Request Info Card (if available) */}
        {contractInfo?.requestId && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Request Information</Text>
              {requestInfoLoading && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </View>
            {requestInfo ? (
              <>
                <InfoRow
                  icon="document-text-outline"
                  label="Request ID"
                  value={requestInfo.requestId || "N/A"}
                />
                <InfoRow
                  icon="briefcase-outline"
                  label="Service Type"
                  value={
                    (requestInfo.requestType || requestInfo.serviceType)
                      ?.toUpperCase() || "N/A"
                  }
                />
                <InfoRow
                  icon="text-outline"
                  label="Title"
                  value={requestInfo.title || "N/A"}
                />
                {requestInfo.description && (
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {requestInfo.description}
                    </Text>
                  </View>
                )}
                {requestInfo.durationMinutes && (
                  <InfoRow
                    icon="time-outline"
                    label="Duration"
                    value={`${Math.floor(requestInfo.durationMinutes)} phút ${Math.round((requestInfo.durationMinutes % 1) * 60)} giây`}
                  />
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>Loading request info...</Text>
            )}
          </View>
        )}

        {/* Submissions List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Delivered Submissions</Text>
            <TouchableOpacity onPress={loadDeliveries}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {submissions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={48}
                color={COLORS.textSecondary}
              />
              <Text style={styles.emptyText}>
                No submissions delivered yet
              </Text>
            </View>
          ) : (
            submissions.map((submission) => {
              const canShowActions = canShowActionButtons(submission);
              const hasFreeLeft = hasFreeRevisionsLeft();

              return (
                <View key={submission.submissionId} style={styles.submissionCard}>
                  <View style={styles.submissionHeader}>
                    <View style={styles.submissionTitleRow}>
                      <Text style={styles.submissionTitle}>
                        {submission.submissionName || "Submission"}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(submission.status) + "20" },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: getStatusColor(submission.status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(submission.status) },
                          ]}
                        >
                          {getStatusLabel(submission.status)}
                        </Text>
                      </View>
                    </View>
                    {submission.deliveredAt && (
                      <Text style={styles.deliveredAt}>
                        Delivered:{" "}
                        {dayjs(submission.deliveredAt).format("DD/MM/YYYY HH:mm")}
                      </Text>
                    )}
                  </View>

                  {/* Files List */}
                  {submission.files && submission.files.length > 0 ? (
                    <View style={styles.filesContainer}>
                      {submission.files.map((file, index) => (
                        <View key={index} style={styles.fileRow}>
                          <FileItem file={file} />
                          <View style={styles.fileActions}>
                            <TouchableOpacity
                              style={styles.fileActionButton}
                              onPress={() => handlePreviewFile(file)}
                            >
                              <Ionicons
                                name="eye-outline"
                                size={18}
                                color={COLORS.primary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.fileActionButton}
                              onPress={() =>
                                handleDownloadFile(file.fileId, file.fileName)
                              }
                            >
                              <Ionicons
                                name="download-outline"
                                size={18}
                                color={COLORS.primary}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No files in this submission</Text>
                  )}

                  {/* Action Buttons */}
                  {canShowActions && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleOpenReviewModal(submission, "accept")}
                        disabled={actionLoading}
                      >
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.revisionButton,
                          !hasFreeLeft && styles.revisionButtonPaid,
                        ]}
                        onPress={() => handleRequestRevision(submission)}
                        disabled={actionLoading}
                      >
                        <Ionicons
                          name="refresh-circle"
                          size={18}
                          color={hasFreeLeft ? COLORS.white : COLORS.warning}
                        />
                        <Text
                          style={[
                            styles.actionButtonText,
                            !hasFreeLeft && styles.revisionButtonTextPaid,
                          ]}
                        >
                          Request Revision
                        </Text>
                        {!hasFreeLeft && (
                          <View style={styles.paidBadge}>
                            <Text style={styles.paidBadgeText}>(Paid)</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Revision Status Info */}
                  {!canShowActions && (() => {
                    const submissionId = submission.submissionId;
                    const relatedRevisions = revisionRequests.filter(
                      (rr) =>
                        rr.originalSubmissionId === submissionId ||
                        rr.revisedSubmissionId === submissionId
                    );

                    if (relatedRevisions.length > 0) {
                      const pendingRevision = relatedRevisions.find((rr) => {
                        const status = rr.status?.toUpperCase();
                        return (
                          status === "PENDING_MANAGER_REVIEW" ||
                          status === "IN_REVISION" ||
                          status === "WAITING_MANAGER_REVIEW" ||
                          status === "APPROVED_PENDING_DELIVERY"
                        );
                      });

                      if (pendingRevision) {
                        const isOriginal =
                          pendingRevision.originalSubmissionId === submissionId;
                        if (isOriginal) {
                          return (
                            <View style={styles.infoBadge}>
                              <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                              <Text style={styles.infoBadgeText}>
                                Revision requested - Processing
                              </Text>
                            </View>
                          );
                        }
                      }

                      const completedRevision = relatedRevisions.find((rr) => {
                        const status = rr.status?.toUpperCase();
                        return status === "COMPLETED" || status === "WAITING_CUSTOMER_CONFIRM";
                      });

                      if (completedRevision) {
                        const isOriginal =
                          completedRevision.originalSubmissionId === submissionId;
                        if (isOriginal) {
                          return (
                            <View style={styles.infoBadge}>
                              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                              <Text style={styles.infoBadgeText}>
                                Revised - See new submission
                              </Text>
                            </View>
                          );
                        }
                      }
                    }

                    return null;
                  })()}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setReviewModalVisible(false);
          setSelectedSubmission(null);
          setRevisionTitle("");
          setRevisionDescription("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reviewAction === "accept"
                  ? "Accept Submission"
                  : "Request Revision"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setReviewModalVisible(false);
                  setSelectedSubmission(null);
                  setRevisionTitle("");
                  setRevisionDescription("");
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {reviewAction === "request_revision" && (
                <>
                  <View style={styles.alertBox}>
                    <Ionicons name="information-circle" size={20} color={COLORS.info} />
                    <Text style={styles.alertText}>
                      Please enter title and detailed description of what needs to be revised.
                      Manager will review and send to specialist.
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Revision Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter revision title (e.g., Need to adjust tempo)"
                    value={revisionTitle}
                    onChangeText={setRevisionTitle}
                    maxLength={255}
                  />
                  <Text style={styles.inputHint}>
                    {revisionTitle.length}/255 characters
                  </Text>

                  <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>
                    Revision Description *
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter detailed description of what needs to be revised..."
                    value={revisionDescription}
                    onChangeText={setRevisionDescription}
                    multiline
                    numberOfLines={6}
                    maxLength={2000}
                  />
                  <Text style={styles.inputHint}>
                    {revisionDescription.length}/2000 characters
                  </Text>
                </>
              )}

              {reviewAction === "accept" && (
                <View style={styles.alertBox}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.alertText}>
                    You are accepting this submission. The submission will be marked as accepted.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setReviewModalVisible(false);
                  setSelectedSubmission(null);
                  setRevisionTitle("");
                  setRevisionDescription("");
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
                onPress={handleReviewSubmission}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {reviewAction === "accept" ? "Accept" : "Request Revision"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    textAlign: "center",
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
  scrollContent: {
    padding: SPACING.lg,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
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
  infoHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  descriptionBox: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  descriptionLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  descriptionText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
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
  emptyContainer: {
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  submissionCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submissionHeader: {
    marginBottom: SPACING.md,
  },
  submissionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  submissionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  deliveredAt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  filesContainer: {
    marginBottom: SPACING.md,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  fileActions: {
    flexDirection: "row",
    marginLeft: SPACING.sm,
  },
  fileActionButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  actionButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  revisionButton: {
    backgroundColor: COLORS.primary,
  },
  revisionButtonPaid: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
  },
  revisionButtonTextPaid: {
    color: COLORS.warning,
  },
  paidBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  paidBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.white,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
  },
  infoBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
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
    maxHeight: "90%",
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
    maxHeight: 400,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.info + "15",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  alertText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
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
    minHeight: 120,
    textAlignVertical: "top",
  },
  inputHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  modalActions: {
    flexDirection: "row",
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  modalButtonDisabled: {
    opacity: 0.6,
  },
});

export default MilestoneDeliveriesScreen;

