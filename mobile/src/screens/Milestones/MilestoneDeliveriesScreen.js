import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  Platform,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import {
  getDeliveredSubmissionsByMilestone,
  customerReviewSubmission,
} from "../../services/fileSubmissionService";
import { getServiceRequestById } from "../../services/serviceRequestService";
import { getContractById } from "../../services/contractService";
import { getStudioBookings } from "../../services/studioBookingService";
import { getContractRevisionStats } from "../../services/revisionRequestService";
import FileItem from "../../components/FileItem";
import ReviewModal from "../../components/ReviewModal";
import axiosInstance from "../../utils/axiosInstance";
import { API_CONFIG } from "../../config/apiConfig";
import { getItem } from "../../utils/storage";
import { STORAGE_KEYS } from "../../config/constants";
import { createTaskReview, getTaskReview } from "../../services/reviewService";

const MilestoneDeliveriesScreen = ({ navigation, route }) => {
  const { contractId, milestoneId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);
  const [requestInfoLoading, setRequestInfoLoading] = useState(false);
  const [studioBooking, setStudioBooking] = useState(null);
  const [studioBookingLoading, setStudioBookingLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [revisionStats, setRevisionStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal states (for submission review: accept/revision)
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewAction, setReviewAction] = useState(""); // 'accept' or 'request_revision'
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionDescription, setRevisionDescription] = useState("");

  // Task review states
  const [taskReviewModalVisible, setTaskReviewModalVisible] = useState(false);
  const [selectedAssignmentForReview, setSelectedAssignmentForReview] = useState(null);
  const [taskReviewLoading, setTaskReviewLoading] = useState(false);
  const [existingTaskReviews, setExistingTaskReviews] = useState({}); // Map assignmentId -> review

  useEffect(() => {
    if (contractId && milestoneId) {
      loadDeliveries();
    }
  }, [contractId, milestoneId]);

  // Reload deliveries when screen comes into focus with polling for updates
  useFocusEffect(
    useCallback(() => {
      if (!contractId || !milestoneId) return;

      let isCancelled = false;
      let pollingTimeout = null;

      // Load deliveries first
      const loadAndPoll = async () => {
        await loadDeliveries();
        if (isCancelled) return;

        // Start polling for updates after initial load
        // This helps detect when payment is completed or new submissions are delivered
        const pollForUpdates = async () => {
          // Store initial state to detect changes
          let initialSubmissionCount = 0;
          let initialRevisionCount = 0;
          let initialInstallmentStatus = null;
          
          try {
            const initialResponse = await getDeliveredSubmissionsByMilestone(
              milestoneId,
              contractId
            );
            if (isCancelled) return;
            
            if (initialResponse?.status === "success" && initialResponse?.data) {
              const initialData = initialResponse.data;
              initialSubmissionCount = initialData.submissions?.length || 0;
              initialRevisionCount = initialData.revisionRequests?.length || 0;
              initialInstallmentStatus = initialData.milestone?.installmentStatus;
            }
          } catch (error) {
            console.error("Error getting initial state:", error);
            return; // Exit if initial load fails
          }

          // Poll for max 10 seconds (10 attempts with 1 second delay)
          const maxRetries = 10;
          const delay = 1000;

          for (let attempt = 0; attempt < maxRetries && !isCancelled; attempt++) {
            // Wait before checking (except first attempt)
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
              if (isCancelled) return;
            }

            try {
              const response = await getDeliveredSubmissionsByMilestone(
                milestoneId,
                contractId
              );
              if (isCancelled) return;
              
              if (response?.status === "success" && response?.data) {
                const data = response.data;
                const currentSubmissionCount = data.submissions?.length || 0;
                const currentRevisionCount = data.revisionRequests?.length || 0;
                const currentInstallmentStatus = data.milestone?.installmentStatus;

                // Check if there are changes
                const hasNewSubmissions = currentSubmissionCount > initialSubmissionCount;
                const hasNewRevisions = currentRevisionCount > initialRevisionCount;
                const installmentStatusChanged = 
                  currentInstallmentStatus !== initialInstallmentStatus &&
                  currentInstallmentStatus === "PAID";

                // If there are changes, reload the data
                if (hasNewSubmissions || hasNewRevisions || installmentStatusChanged) {
                  await loadDeliveries();
                  if (installmentStatusChanged) {
                    Alert.alert("Success", "Payment has been confirmed!");
                  }
                  return; // Stop polling once changes are detected
                }

                // Update data even if no changes detected (to show latest state)
                setContractInfo(data.contract);
                setMilestoneInfo(data.milestone);
                setRevisionRequests(data.revisionRequests || []);
                setSubmissions(data.submissions || []);
              }
            } catch (error) {
              console.error("Error polling for updates:", error);
              // Continue polling even on error
            }
          }
        };

        // Start polling after a short delay to allow initial load to complete
        pollingTimeout = setTimeout(() => {
          if (!isCancelled) {
            pollForUpdates();
          }
        }, 1500);
      };
      
      loadAndPoll();

      // Cleanup function
      return () => {
        isCancelled = true;
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractId, milestoneId])
  );

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

  const loadRevisionStats = async (contractId) => {
    if (!contractId) return;

    try {
      const response = await getContractRevisionStats(contractId);
      if (response?.status === "success" && response?.data) {
        setRevisionStats(response.data);
      } else {
        setRevisionStats(null);
      }
    } catch (error) {
      console.error("Error loading revision stats:", error);
      // Không hiển thị error message vì đây là lazy load, không ảnh hưởng đến chức năng chính
      setRevisionStats(null);
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

        // Load studio booking cho recording milestone (nếu có)
        if (data.milestone?.milestoneType === "recording") {
          try {
            setStudioBookingLoading(true);
            const bookingResp = await getStudioBookings(
              data.contract?.contractId || contractId,
              data.milestone.milestoneId,
              null
            );
            if (
              bookingResp?.status === "success" &&
              Array.isArray(bookingResp.data) &&
              bookingResp.data.length > 0
            ) {
              setStudioBooking(bookingResp.data[0]);
            } else {
              setStudioBooking(null);
            }
          } catch (e) {
            console.error("Error loading studio booking for deliveries:", e);
            setStudioBooking(null);
          } finally {
            setStudioBookingLoading(false);
          }
        } else {
          setStudioBooking(null);
        }

        // Load revision stats của contract (để tính free/paid revisions chính xác)
        loadRevisionStats(contractId);

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

        // Load existing task reviews for accepted submissions
        loadExistingTaskReviews(allSubmissions);
      } else {
        setContractInfo(null);
        setMilestoneInfo(null);
        setRequestInfo(null);
        setStudioBooking(null);
        setSubmissions([]);
        setRevisionRequests([]);
        setRevisionStats(null);
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

  // Load existing task reviews for accepted submissions
  const loadExistingTaskReviews = async (submissions) => {
    // Load reviews cho các submissions đã accepted
    const acceptedSubmissions = submissions.filter(
      s => s.status?.toLowerCase() === 'customer_accepted' && s.assignmentId
    );

    const reviewsMap = {};
    for (const submission of acceptedSubmissions) {
      try {
        const reviewResponse = await getTaskReview(submission.assignmentId);
        if (reviewResponse?.status === 'success' && reviewResponse?.data) {
          reviewsMap[submission.assignmentId] = reviewResponse.data;
        }
      } catch (error) {
        // Nếu không có review hoặc lỗi, bỏ qua (có thể chưa rate)
        console.log(
          `No review found for assignment ${submission.assignmentId}`
        );
      }
    }
    setExistingTaskReviews(reviewsMap);
  };

  // Handle rate task assignment
  const handleRateTask = (assignmentId) => {
    setSelectedAssignmentForReview(assignmentId);
    setTaskReviewModalVisible(true);
  };

  // Handle submit task review
  const handleSubmitTaskReview = async (reviewData) => {
    if (!selectedAssignmentForReview) return;

    try {
      setTaskReviewLoading(true);
      const response = await createTaskReview(
        selectedAssignmentForReview,
        reviewData
      );

      if (response?.status === 'success') {
        Alert.alert('Success', 'Review submitted successfully');
        // Update existing reviews map
        setExistingTaskReviews(prev => ({
          ...prev,
          [selectedAssignmentForReview]: response.data,
        }));
        setTaskReviewModalVisible(false);
        setSelectedAssignmentForReview(null);
      } else {
        Alert.alert('Error', response?.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting task review:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit review'
      );
    } finally {
      setTaskReviewLoading(false);
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      // Get download URL
      const downloadUrl = `${API_CONFIG.BASE_URL}/api/v1/projects/files/download/${fileId}`;
      
      // Get auth token from storage
      const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      // Sanitize file name
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Create file path in document directory
      const fileUri = `${FileSystem.documentDirectory}${sanitizedFileName}`;

      // Download file with authentication headers
      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        fileUri,
        {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        }
      );

      if (downloadResult.status === 200) {
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          // Share the file (allows user to save to Downloads or open with other apps)
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/octet-stream',
            dialogTitle: 'Save File',
            UTI: 'public.data',
          });
          Alert.alert("Success", "File downloaded successfully!");
        } else {
          // Fallback: show file location
          Alert.alert("Success", `File saved to: ${downloadResult.uri}`);
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      Alert.alert("Error", error?.message || "Failed to download file. Please try again.");
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
    // ƯU TIÊN 1: Nếu submission đã được customer accept → không hiển thị nút
    if (submission.status?.toLowerCase() === "customer_accepted") {
      return false;
    }
    
    // ƯU TIÊN 2: Nếu submission đã bị customer reject → không hiển thị nút (đã request revision)
    if (submission.status?.toLowerCase() === "customer_rejected") {
      return false;
    }
    
    // Chỉ hiển thị nút nếu submission status là delivered
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

    // Nếu không có revision requests liên quan → hiển thị nút
    if (relatedRevisions.length === 0) {
      return true;
    }

    // Logic đơn giản:
    // - Nếu submission là originalSubmissionId của revision request đang pending → không hiển thị nút
    // - Nếu không có pending revision → hiển thị nút Accept và Request Revision
    // Note: Nếu submission là originalSubmissionId và revision request đã completed → submission đã được set thành customer_rejected → đã return ở trên
    const pendingRevision = relatedRevisions.find((rr) => {
      const status = rr.status?.toUpperCase();
      return (
        status === "PENDING_MANAGER_REVIEW" ||
        status === "IN_REVISION" ||
        status === "WAITING_MANAGER_REVIEW" ||
        status === "APPROVED_PENDING_DELIVERY"
      );
    });

    // Nếu submission là originalSubmissionId và revision request đang pending → không hiển thị nút
    if (pendingRevision) {
      const isOriginal = pendingRevision.originalSubmissionId === submissionId;
      if (isOriginal) {
        return false;
      }
    }

    // Mặc định: hiển thị nút
    return true;
  };

  // Helper function to check if free revisions are available
  const hasFreeRevisionsLeft = () => {
    // Sử dụng revisionStats từ API nếu có, fallback về logic cũ
    if (revisionStats && revisionStats.freeRevisionsRemaining != null) {
      return revisionStats.freeRevisionsRemaining > 0;
    }

    // Fallback logic cũ
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
    if (statusLower === "customer_accepted") return COLORS.success;
    if (statusLower === "customer_rejected") return COLORS.error;
    if (statusLower === "revision_requested") return COLORS.warning;
    return COLORS.textSecondary;
  };

  const getStatusLabel = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "delivered") return "Delivered";
    if (statusLower === "customer_accepted") return "Accepted";
    if (statusLower === "customer_rejected") return "Rejected - Revision Requested";
    if (statusLower === "revision_requested") return "Revision Requested";
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
    if (statusUpper === "WAITING_CUSTOMER") return "Waiting for Customer";
    if (statusUpper === "COMPLETED") return "Completed";
    if (statusUpper === "IN_PROGRESS") return "In Progress";
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
            <View style={styles.tableContainer}>
              <InfoRow
                label="Contract Number"
                value={contractInfo.contractNumber || contractId}
              />
              <InfoRow
                label="Contract Type"
                value={contractInfo.contractType?.toUpperCase() || "N/A"}
              />
              <InfoRow
                label="Milestone Name"
                value={milestoneInfo.name || "N/A"}
              />
              <InfoRow
                label="Milestone Type"
                value={
                  milestoneInfo.milestoneType === "transcription"
                    ? "Transcription"
                    : milestoneInfo.milestoneType === "arrangement"
                      ? "Arrangement"
                      : milestoneInfo.milestoneType === "recording"
                        ? "Recording"
                        : milestoneInfo.milestoneType?.toUpperCase() || "N/A"
                }
              />
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Milestone Status</Text>
                <View style={styles.statusRow}>
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
                  {/* Pay button when milestone READY_FOR_PAYMENT/COMPLETED AND installment not PAID */}
                  {(milestoneInfo.workStatus === "READY_FOR_PAYMENT" ||
                    milestoneInfo.workStatus === "COMPLETED") &&
                    milestoneInfo.installmentStatus !== "PAID" && (
                      <TouchableOpacity
                        style={styles.payMilestoneButton}
                        onPress={() =>
                          navigation.navigate("PaymentMilestone", {
                            contractId,
                            milestoneId: milestoneInfo.milestoneId,
                          })
                        }
                      >
                        <Ionicons name="card-outline" size={16} color={COLORS.white} />
                        <Text style={styles.payMilestoneButtonText}>Pay</Text>
                      </TouchableOpacity>
                    )}
                  {/* Paid tag if installment is PAID */}
                  {milestoneInfo.installmentStatus === "PAID" && (
                    <View style={[styles.revisionTag, { backgroundColor: COLORS.success + "20" }]}>
                      <Text style={[styles.revisionTagText, { color: COLORS.success }]}>
                        Paid
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {milestoneInfo.description && (
                <View style={styles.tableRowVertical}>
                  <Text style={styles.tableLabelVertical}>Description</Text>
                  <Text style={styles.tableValueVertical}>
                    {milestoneInfo.description}
                  </Text>
                </View>
              )}
              {/* Timeline Information */}
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Timeline</Text>
                <View style={{ marginTop: SPACING.xs }}>
                  {/* Planned Dates */}
                  {milestoneInfo.targetDeadline && (
                    <View style={{ marginBottom: SPACING.sm }}>
                      <Text style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary }]}>
                        Planned: {dayjs(milestoneInfo.targetDeadline).format("DD/MM/YYYY")}
                      </Text>
                    </View>
                  )}
                  {/* SLA status */}
                  {milestoneInfo.firstSubmissionAt &&
                    milestoneInfo.firstSubmissionLate != null && (
                      <View style={{ marginBottom: SPACING.xs }}>
                        <View style={[styles.revisionTag, {
                          backgroundColor: milestoneInfo.firstSubmissionLate
                            ? COLORS.error + "20"
                            : COLORS.success + "20"
                        }]}>
                          <Text style={[styles.revisionTagText, {
                            color: milestoneInfo.firstSubmissionLate
                              ? COLORS.error
                              : COLORS.success
                          }]}>
                            {milestoneInfo.firstSubmissionLate
                              ? "Late submission (first version)"
                              : "On time submission (first version)"}
                          </Text>
                        </View>
                      </View>
                    )}
                  {!milestoneInfo.firstSubmissionAt &&
                    milestoneInfo.overdueNow === true && (
                      <View style={{ marginBottom: SPACING.xs }}>
                        <View style={[styles.revisionTag, { backgroundColor: COLORS.error + "20" }]}>
                          <Text style={[styles.revisionTagText, { color: COLORS.error }]}>
                            Overdue (not submitted)
                          </Text>
                        </View>
                      </View>
                    )}
                  {/* Actual Dates */}
                  {(milestoneInfo.actualStartAt ||
                    milestoneInfo.firstSubmissionAt ||
                    milestoneInfo.finalCompletedAt ||
                    milestoneInfo.actualEndAt) && (
                    <View style={{ marginTop: SPACING.sm }}>
                      <Text style={[styles.tableLabelVertical, { fontSize: FONT_SIZES.xs }]}>
                        Actual Time:
                      </Text>
                      {milestoneInfo.actualStartAt && (
                        <Text style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs }]}>
                          Start: {dayjs(milestoneInfo.actualStartAt).format("DD/MM/YYYY HH:mm")}
                        </Text>
                      )}
                      {milestoneInfo.firstSubmissionAt && (
                        <View>
                          <Text style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs }]}>
                            First submission: {dayjs(milestoneInfo.firstSubmissionAt).format("DD/MM/YYYY HH:mm")}
                          </Text>
                          <Text style={[styles.infoHint, { fontSize: FONT_SIZES.xs - 1 }]}>
                            (First time specialist assigned work)
                          </Text>
                        </View>
                      )}
                      {milestoneInfo.finalCompletedAt && (
                        <View>
                          <Text style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs }]}>
                            Work Completed: {dayjs(milestoneInfo.finalCompletedAt).format("DD/MM/YYYY HH:mm")}
                          </Text>
                          <Text style={[styles.infoHint, { fontSize: FONT_SIZES.xs - 1 }]}>
                            (Customer accepted work)
                          </Text>
                        </View>
                      )}
                      {milestoneInfo.actualEndAt && (
                        <View>
                          <Text style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs }]}>
                            Payment Completed: {dayjs(milestoneInfo.actualEndAt).format("DD/MM/YYYY HH:mm")}
                          </Text>
                          <Text style={[styles.infoHint, { fontSize: FONT_SIZES.xs - 1 }]}>
                            (Milestone paid)
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
              <InfoRow
                label="Total Submissions"
                value={submissions.length.toString()}
              />
              <InfoRow
                label="Total Files"
                value={submissions
                  .reduce((total, sub) => total + (sub.files?.length || 0), 0)
                  .toString()}
              />
              {contractInfo.freeRevisionsIncluded != null && revisionStats && (
                <>
                  <InfoRow
                    label="Free Revisions Included"
                    value={revisionStats.freeRevisionsIncluded.toString()}
                  />
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Revisions Used</Text>
                    <Text style={styles.tableValueVertical}>
                      {revisionStats.totalRevisionsUsed} / {revisionStats.freeRevisionsIncluded} (Free)
                    </Text>
                    <Text style={styles.infoHint}>
                      Used {revisionStats.freeRevisionsUsed} times for free revision, {revisionStats.paidRevisionsUsed} times for paid revision
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Studio Booking Info - Cho recording milestone */}
        {milestoneInfo?.milestoneType === "recording" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Studio Booking Information</Text>
              {studioBookingLoading && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </View>
            {studioBooking ? (
              <View style={styles.tableContainer}>
                <InfoRow
                  label="Booking ID"
                  value={studioBooking.bookingId || "N/A"}
                />
                <InfoRow
                  label="Studio"
                  value={studioBooking.studioName || "N/A"}
                />
                <InfoRow
                  label="Date"
                  value={
                    studioBooking.bookingDate
                      ? dayjs(studioBooking.bookingDate).format("DD/MM/YYYY")
                      : "N/A"
                  }
                />
                <InfoRow
                  label="Time"
                  value={
                    studioBooking.startTime && studioBooking.endTime
                      ? `${studioBooking.startTime} - ${studioBooking.endTime}`
                      : "N/A"
                  }
                />
                <View style={styles.tableRowVertical}>
                  <Text style={styles.tableLabelVertical}>Status</Text>
                  <View style={styles.statusBadge}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            studioBooking.status === "CONFIRMED" ||
                            studioBooking.status === "COMPLETED"
                              ? COLORS.success
                              : studioBooking.status === "CANCELLED"
                                ? COLORS.error
                                : COLORS.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            studioBooking.status === "CONFIRMED" ||
                            studioBooking.status === "COMPLETED"
                              ? COLORS.success
                              : studioBooking.status === "CANCELLED"
                                ? COLORS.error
                                : COLORS.warning,
                        },
                      ]}
                    >
                      {studioBooking.status === "TENTATIVE"
                        ? "Tentative"
                        : studioBooking.status === "PENDING"
                          ? "Pending"
                          : studioBooking.status === "CONFIRMED"
                            ? "Confirmed"
                            : studioBooking.status === "IN_PROGRESS"
                              ? "In Progress"
                              : studioBooking.status === "COMPLETED"
                                ? "Completed"
                                : studioBooking.status === "CANCELLED"
                                  ? "Cancelled"
                                  : studioBooking.status || "N/A"}
                    </Text>
                  </View>
                </View>
                {studioBooking.sessionType && (
                  <InfoRow
                    label="Session Type"
                    value={studioBooking.sessionType}
                  />
                )}
                {/* Participants summary */}
                {studioBooking.participants &&
                  Array.isArray(studioBooking.participants) &&
                  studioBooking.participants.length > 0 && (
                    <View style={styles.tableRowVertical}>
                      <Text style={styles.tableLabelVertical}>Participants</Text>
                      {studioBooking.participants.map((p, idx) => {
                        const roleLabel =
                          p.roleType === "VOCAL"
                            ? "Vocal"
                            : p.roleType === "INSTRUMENT"
                              ? "Instrument"
                              : p.roleType || "Participant";

                        let performerLabel = "";
                        if (p.performerSource === "CUSTOMER_SELF") {
                          const customerName = p.name || p.customerName;
                          performerLabel = customerName
                            ? `Customer (self) (${customerName})`
                            : "Customer (self)";
                        } else if (p.performerSource === "INTERNAL_ARTIST") {
                          performerLabel = p.specialistName || "Internal artist";
                        } else if (p.performerSource === "EXTERNAL_GUEST") {
                          const guestName = p.name;
                          performerLabel = guestName
                            ? `External guest (${guestName})`
                            : "External guest";
                        } else {
                          performerLabel = p.performerSource || "Unknown";
                        }

                        const skillLabel = p.skillName ? ` (${p.skillName})` : "";
                        return (
                          <Text
                            key={idx}
                            style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs, marginTop: idx > 0 ? SPACING.xs / 2 : 0 }]}
                          >
                            • {roleLabel} – {performerLabel}
                            {skillLabel}
                          </Text>
                        );
                      })}
                    </View>
                  )}
                {/* Equipment summary */}
                {studioBooking.requiredEquipment &&
                  Array.isArray(studioBooking.requiredEquipment) &&
                  studioBooking.requiredEquipment.length > 0 && (
                    <View style={styles.tableRowVertical}>
                      <Text style={styles.tableLabelVertical}>Equipment</Text>
                      {studioBooking.requiredEquipment.map((eq, idx) => (
                        <Text
                          key={idx}
                          style={[styles.tableValueVertical, { fontSize: FONT_SIZES.xs, marginTop: idx > 0 ? SPACING.xs / 2 : 0 }]}
                        >
                          • {eq.equipmentName} × {eq.quantity}
                        </Text>
                      ))}
                    </View>
                  )}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                No studio booking information available
              </Text>
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
                <View style={styles.tableContainer}>
                  <InfoRow
                    label="Request ID"
                    value={requestInfo.requestId || "N/A"}
                  />
                  <InfoRow
                    label="Service Type"
                    value={
                      (requestInfo.requestType || requestInfo.serviceType)
                        ?.toUpperCase() || "N/A"
                    }
                  />
                  <InfoRow
                    label="Title"
                    value={requestInfo.title || "N/A"}
                  />
                  {requestInfo.description && (
                    <View style={styles.tableRowVertical}>
                      <Text style={styles.tableLabelVertical}>Description</Text>
                      <Text style={styles.tableValueVertical}>
                        {requestInfo.description}
                      </Text>
                    </View>
                  )}
                  {(requestInfo.durationMinutes || requestInfo.durationSeconds) && (
                    <InfoRow
                      label="Duration"
                      value={
                        requestInfo.durationMinutes
                          ? `${Math.floor(requestInfo.durationMinutes)} min ${Math.round((requestInfo.durationMinutes % 1) * 60)} sec`
                          : `${Math.floor((requestInfo.durationSeconds || 0) / 60)} min ${(requestInfo.durationSeconds || 0) % 60} sec`
                      }
                    />
                  )}
                  {(requestInfo.tempoPercentage || requestInfo.tempo) && (
                    <InfoRow
                      label="Tempo"
                      value={`${requestInfo.tempoPercentage || requestInfo.tempo}%`}
                    />
                  )}
                  {requestInfo.instruments &&
                    Array.isArray(requestInfo.instruments) &&
                    requestInfo.instruments.length > 0 && (
                      <View style={styles.tableRowVertical}>
                        <Text style={styles.tableLabelVertical}>Instruments</Text>
                        <View style={styles.tagsContainer}>
                          {requestInfo.instruments.map((instrument, index) => (
                            <View key={index} style={styles.tag}>
                              <Text style={styles.tagText}>
                                {instrument.instrumentName ||
                                  instrument.name ||
                                  instrument}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                </View>
                {/* Customer Uploaded Files - Filter out contract PDF */}
                {requestInfo.files &&
                  Array.isArray(requestInfo.files) &&
                  requestInfo.files.length > 0 &&
                  (() => {
                    const customerFiles = requestInfo.files.filter(
                      (file) =>
                        file.fileSource !== "contract_pdf" &&
                        file.contentType !== "contract_pdf"
                    );
                    if (customerFiles.length === 0) return null;
                    return (
                      <View style={styles.filesSection}>
                        <Text style={styles.sectionTitle}>Uploaded Files</Text>
                        {customerFiles.map((file, index) => {
                          const fileName = file.fileName || file.name || "File";
                          const fileId = file.fileId || file;
                          return (
                            <View key={index} style={styles.fileRow}>
                              <FileItem file={file} />
                              <View style={styles.fileActions}>
                                {/* Preview button - commented out */}
                                {/* <TouchableOpacity
                                  style={styles.fileActionButton}
                                  onPress={() => handlePreviewFile(file)}
                                >
                                  <Ionicons
                                    name="eye-outline"
                                    size={18}
                                    color={COLORS.primary}
                                  />
                                  <Text style={styles.fileActionText}>Preview</Text>
                                </TouchableOpacity> */}
                                <TouchableOpacity
                                  style={styles.fileActionButton}
                                  onPress={() =>
                                    handleDownloadFile(fileId, fileName)
                                  }
                                >
                                  <Ionicons
                                    name="download-outline"
                                    size={18}
                                    color={COLORS.primary}
                                  />
                                  <Text style={styles.fileActionText}>Download</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })()}
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
                    {/* Title Row */}
                    <Text style={styles.submissionTitle}>
                      {submission.submissionName || "Submission"}
                    </Text>
                    {/* Status Row */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(submission.status) + "20" },
                        styles.statusBadgeFullWidth,
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
                            {/* Preview button - commented out */}
                            {/* <TouchableOpacity
                              style={styles.fileActionButton}
                              onPress={() => handlePreviewFile(file)}
                            >
                              <Ionicons
                                name="eye-outline"
                                size={18}
                                color={COLORS.primary}
                              />
                              <Text style={styles.fileActionText}>Preview</Text>
                            </TouchableOpacity> */}
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
                              <Text style={styles.fileActionText}>Download</Text>
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
                          styles.revisionButtonColumn,
                        ]}
                        onPress={() => handleRequestRevision(submission)}
                        disabled={actionLoading}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            !hasFreeLeft && styles.revisionButtonTextPaid,
                          ]}
                        >
                          Request Revision
                        </Text>
                        {!hasFreeLeft && (
                          <Text style={styles.paidBadgeTextInline}>(Paid)</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Revision Requests liên quan đến submission này */}
                  {(() => {
                    const submissionId = submission.submissionId;
                    const relatedRevisions = revisionRequests.filter(
                      (rr) =>
                        rr.originalSubmissionId === submissionId ||
                        rr.revisedSubmissionId === submissionId
                    );

                    if (relatedRevisions.length === 0) return null;

                    const originalRevisions = relatedRevisions.filter(
                      (rr) => rr.originalSubmissionId === submissionId
                    );
                    const revisedRevisions = relatedRevisions.filter(
                      (rr) => rr.revisedSubmissionId === submissionId
                    );

                    return (
                      <View style={styles.revisionSection}>
                        <Text style={styles.sectionTitle}>
                          Related Revision Requests
                        </Text>
                        {originalRevisions.length > 0 && (
                          <View style={styles.revisionList}>
                            {originalRevisions.map((revision) => (
                              <View
                                key={revision.revisionRequestId}
                                style={styles.revisionItem}
                              >
                                <View style={styles.revisionTag}>
                                  <Text style={styles.revisionTagText}>
                                    Round #{revision.revisionRound}
                                  </Text>
                                </View>
                                <Text style={styles.revisionTitle}>
                                  {revision.title}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {revisedRevisions.length > 0 && (
                          <View style={styles.revisionList}>
                            {revisedRevisions.map((revision) => (
                              <CollapsibleRevision
                                key={revision.revisionRequestId}
                                revision={revision}
                                submission={submission}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Review Button - Only for accepted submissions */}
                  {submission.status?.toLowerCase() === "customer_accepted" && 
                   submission.assignmentId && (
                    <View style={styles.reviewButtonContainer}>
                      <TouchableOpacity
                        style={styles.taskReviewButton}
                        onPress={() => handleRateTask(submission.assignmentId)}
                        activeOpacity={0.8}
                      >
                        <Ionicons 
                          name={existingTaskReviews[submission.assignmentId] ? "star" : "star-outline"} 
                          size={16} 
                          color={COLORS.primary} 
                        />
                        <Text style={styles.taskReviewButtonText}>
                          {existingTaskReviews[submission.assignmentId] 
                            ? 'View Task Review' 
                            : 'Rate Task'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Revision Status Info */}
                  {!canShowActions && (() => {
                    // Nếu submission đã được customer accept → hiển thị status tag (đã có ở trên)
                    if (submission.status?.toLowerCase() === "customer_accepted") {
                      return null; // Status tag đã được hiển thị ở trên
                    }

                    // Nếu submission đã bị customer reject → hiển thị status tag (đã có ở trên)
                    if (submission.status?.toLowerCase() === "customer_rejected") {
                      return null; // Status tag đã được hiển thị ở trên
                    }

                    // Check revision request đang pending
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
                                Revision requested - Pending processing
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

        {/* Revision Requests Tổng hợp - Hiển thị tất cả revision requests */}
        {revisionRequests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>All Revision Requests</Text>
              <View style={[styles.revisionTag, { backgroundColor: COLORS.warning + "20" }]}>
                <Text style={[styles.revisionTagText, { color: COLORS.warning }]}>
                  {revisionRequests.length}
                </Text>
              </View>
            </View>
            {revisionRequests.map((revision) => {
              const status = revision.status?.toLowerCase();
              const statusColors = {
                pending_manager_review: COLORS.warning,
                in_revision: COLORS.info,
                waiting_manager_review: COLORS.info,
                approved_pending_delivery: COLORS.info,
                waiting_customer_confirm: COLORS.primary,
                completed: COLORS.success,
                rejected: COLORS.error,
                canceled: COLORS.textSecondary,
              };
              const statusLabels = {
                pending_manager_review: "Pending Manager Review",
                in_revision: "In Revision",
                waiting_manager_review: "Waiting Manager Review",
                approved_pending_delivery: "Approved - Pending Delivery",
                waiting_customer_confirm: "Waiting Customer Confirm",
                completed: "Completed",
                rejected: "Rejected",
                canceled: "Canceled",
              };

              const displayedSubmissionIds = new Set(
                submissions.map((s) => s.submissionId)
              );
              const hasOriginalMatch =
                revision.originalSubmissionId &&
                displayedSubmissionIds.has(revision.originalSubmissionId);
              const hasRevisedMatch =
                revision.revisedSubmissionId &&
                displayedSubmissionIds.has(revision.revisedSubmissionId);
              const isOrphan = !hasOriginalMatch && !hasRevisedMatch;

              return (
                <CollapsibleRevision
                  key={revision.revisionRequestId}
                  revision={revision}
                  submission={null}
                  showStatus={true}
                  statusColor={statusColors[status]}
                  statusLabel={statusLabels[status]}
                  isOrphan={isOrphan}
                />
              );
            })}
          </View>
        )}
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

      {/* Task Review Modal - Để rate task assignment */}
      <ReviewModal
        visible={taskReviewModalVisible}
        onCancel={() => {
          setTaskReviewModalVisible(false);
          setSelectedAssignmentForReview(null);
        }}
        onConfirm={handleSubmitTaskReview}
        loading={taskReviewLoading}
        type="task"
        existingReview={
          selectedAssignmentForReview
            ? existingTaskReviews[selectedAssignmentForReview]
            : null
        }
      />
    </View>
  );
};

// Collapsible Revision Component
const CollapsibleRevision = ({
  revision,
  submission,
  showStatus = false,
  statusColor,
  statusLabel,
  isOrphan = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const daysRemaining = revision.revisionDueAt
    ? dayjs(revision.revisionDueAt).diff(dayjs(), "day")
    : null;
  const isOverdue =
    revision.revisionDueAt && dayjs(revision.revisionDueAt).isBefore(dayjs());

  return (
    <View style={styles.collapsibleRevision}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.collapsibleHeaderLeft}>
          {/* Tags Row */}
          <View style={styles.revisionTagsRow}>
            <View style={styles.revisionTag}>
              <Text style={styles.revisionTagText}>
                Round #{revision.revisionRound}
              </Text>
            </View>
            {submission && (
              <View style={[styles.revisionTag, { backgroundColor: COLORS.success + "20" }]}>
                <Text style={[styles.revisionTagText, { color: COLORS.success }]}>
                  Revised Version
                </Text>
              </View>
            )}
            {isOrphan && (
              <View style={[styles.revisionTag, { backgroundColor: COLORS.warning + "20" }]}>
                <Text style={[styles.revisionTagText, { color: COLORS.warning }]}>
                  Not Linked
                </Text>
              </View>
            )}
            {revision.isFreeRevision && (
              <View style={[styles.revisionTag, { backgroundColor: COLORS.success + "20" }]}>
                <Text style={[styles.revisionTagText, { color: COLORS.success }]}>
                  Free
                </Text>
              </View>
            )}
            {!revision.isFreeRevision && (
              <View style={[styles.revisionTag, { backgroundColor: COLORS.warning + "20" }]}>
                <Text style={[styles.revisionTagText, { color: COLORS.warning }]}>
                  Paid
                </Text>
              </View>
            )}
            {revision.revisionDueAt && (
              <View
                style={[
                  styles.revisionTag,
                  {
                    backgroundColor: isOverdue
                      ? COLORS.error + "20"
                      : COLORS.info + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.revisionTagText,
                    { color: isOverdue ? COLORS.error : COLORS.info },
                  ]}
                >
                  {isOverdue
                    ? "Overdue"
                    : daysRemaining !== null
                      ? `${daysRemaining}d left`
                      : dayjs(revision.revisionDueAt).format("DD/MM/YYYY")}
                </Text>
              </View>
            )}
          </View>
          {/* Status Row */}
          {showStatus && statusColor && statusLabel && (
            <View style={styles.revisionInfoRow}>
              <Text style={styles.revisionLabel}>Status:</Text>
              <View style={[styles.revisionTag, { backgroundColor: statusColor + "20" }]}>
                <Text style={[styles.revisionTagText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          )}
          {/* Title Row */}
          <View style={styles.revisionInfoRow}>
            <Text style={styles.revisionLabel}>Title:</Text>
            <Text style={styles.revisionTitleSmall}>
              {revision.title}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.collapsibleContent}>
          <View style={styles.tableContainer}>
            <InfoRow
              label="Description"
              value={revision.description || "N/A"}
            />
            {showStatus && statusColor && statusLabel && (
              <InfoRow
                label="Status"
                value={statusLabel}
              />
            )}
            {revision.revisionRound && (
              <InfoRow
                label="Revision Round"
                value={`#${revision.revisionRound}`}
              />
            )}
            <InfoRow
              label="Free Revision"
              value={revision.isFreeRevision ? "Yes" : "No (Paid)"}
            />
            {revision.originalSubmissionId && (
              <InfoRow
                label="Original Submission"
                value={revision.originalSubmissionId}
              />
            )}
            {revision.revisedSubmissionId && (
              <InfoRow
                label="Revised Submission"
                value={revision.revisedSubmissionId}
              />
            )}
            {revision.revisionDueAt && (
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Revision Deadline</Text>
                <View style={styles.deadlineRow}>
                  <Text style={styles.tableValueVertical}>
                    {dayjs(revision.revisionDueAt).format("DD/MM/YYYY HH:mm")}
                  </Text>
                  {revision.revisionDeadlineDays && (
                    <Text style={styles.infoHint}>
                      (+{revision.revisionDeadlineDays} days SLA)
                    </Text>
                  )}
                  {isOverdue ? (
                    <View style={[styles.revisionTag, { backgroundColor: COLORS.error + "20" }]}>
                      <Text style={[styles.revisionTagText, { color: COLORS.error }]}>
                        Overdue
                      </Text>
                    </View>
                  ) : daysRemaining !== null ? (
                    <View style={[styles.revisionTag, { backgroundColor: COLORS.info + "20" }]}>
                      <Text style={[styles.revisionTagText, { color: COLORS.info }]}>
                        {daysRemaining} days left
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
            {revision.managerNote && (
              <InfoRow
                label="Manager Note"
                value={revision.managerNote}
              />
            )}
            {revision.requestedAt && (
              <InfoRow
                label="Requested At"
                value={dayjs(revision.requestedAt).format("DD/MM/YYYY HH:mm")}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// Helper Component
const InfoRow = ({ label, value }) => (
  <View style={styles.tableRowVertical}>
    <Text style={styles.tableLabelVertical}>{label}</Text>
    <Text style={styles.tableValueVertical}>{value}</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
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
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
    flex: 1,
    flexShrink: 1,
  },
  tableContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  tableRowVertical: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableLabelVertical: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  tableValueVertical: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
    marginLeft: 0,
    minWidth: 0, // Allow text to wrap
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
    flexWrap: "wrap",
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
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  statusBadgeFullWidth: {
    alignSelf: "flex-start",
    marginBottom: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs - 1,
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
    width: "100%",
  },
  submissionHeader: {
    marginBottom: SPACING.md,
  },
  submissionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  deliveredAt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  filesContainer: {
    marginBottom: SPACING.md,
    width: "100%",
  },
  fileRow: {
    marginBottom: SPACING.sm,
    width: "100%",
  },
  fileActions: {
    flexDirection: "row",
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  fileActionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.xs,
    gap: SPACING.xs / 2,
  },
  fileActionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "column",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs / 2,
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
  revisionButtonColumn: {
    flexDirection: "column",
    gap: SPACING.xs / 2,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
    flexShrink: 1,
  },
  revisionButtonTextPaid: {
    color: COLORS.warning,
  },
  paidBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.xs / 2,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs / 2,
  },
  paidBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.white,
  },
  paidBadgeTextInline: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.warning,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    flexWrap: "wrap",
  },
  infoBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    flex: 1,
    flexShrink: 1,
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
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    flexShrink: 1,
  },
  modalBody: {
    padding: SPACING.lg,
    maxHeight: 400,
    flexGrow: 0,
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
    width: "100%",
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flexWrap: "wrap",
    marginTop: SPACING.xs / 2,
  },
  payMilestoneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs / 2,
    flexShrink: 0,
  },
  payMilestoneButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.white,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.xs / 2,
  },
  tag: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  filesSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: "100%",
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  revisionSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: "100%",
  },
  revisionList: {
    marginTop: SPACING.sm,
  },
  revisionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  revisionTag: {
    backgroundColor: COLORS.error + "20",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
  },
  revisionTagText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: "600",
    color: COLORS.error,
  },
  revisionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  revisionTitleSmall: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  collapsibleRevision: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  collapsibleHeaderLeft: {
    flexDirection: "column",
    flex: 1,
    paddingRight: SPACING.xs,
  },
  revisionTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs / 2,
    marginBottom: SPACING.sm,
  },
  revisionInfoRow: {
    marginBottom: SPACING.xs,
  },
  revisionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  collapsibleContent: {
    padding: SPACING.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs / 2,
    marginTop: SPACING.xs / 2,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs / 2,
    marginTop: SPACING.xs / 2,
  },
  tag: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    flexShrink: 0,
  },
  tagText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: "600",
    color: COLORS.primary,
  },
  // Task review styles
  reviewButtonContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taskReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary + "15",
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  taskReviewButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default MilestoneDeliveriesScreen;

