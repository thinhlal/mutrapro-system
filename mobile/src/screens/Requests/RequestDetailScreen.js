import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { getBookingByRequestId } from "../../services/studioBookingService";
import {
  getContractsByRequestId,
  approveContract,
  requestChangeContract,
  cancelContract,
} from "../../services/contractService";
import { getNotationInstrumentsByIds } from "../../services/instrumentService";
import { getChatRoomByContext } from "../../services/chatService";
import ContractCard from "../../components/ContractCard";
import FileItem from "../../components/FileItem";
import { getGenreLabel, getPurposeLabel } from "../../constants/musicOptionsConstants";
import { formatPrice } from "../../services/pricingMatrixService";
import ReviewModal from "../../components/ReviewModal";
import {
  createRequestReview,
  createParticipantReview,
  getRequestReviews,
} from "../../services/reviewService";

// Booking Status
const BOOKING_STATUS_COLORS = {
  TENTATIVE: COLORS.textSecondary,
  PENDING: COLORS.warning,
  CONFIRMED: COLORS.success,
  IN_PROGRESS: COLORS.primary,
  COMPLETED: COLORS.success,
  CANCELLED: COLORS.error,
};

const BOOKING_STATUS_LABELS = {
  TENTATIVE: "Tentative",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const RequestDetailScreen = ({ navigation, route }) => {
  const { requestId } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [instruments, setInstruments] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [booking, setBooking] = useState(null);

  // Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [requestChangeModalVisible, setRequestChangeModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [changeReason, setChangeReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  
  // Toggle state for request information
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  // Review states
  const [requestReviewModalVisible, setRequestReviewModalVisible] = useState(false);
  const [participantReviewModalVisible, setParticipantReviewModalVisible] = useState(false);
  const [requestReviewLoading, setRequestReviewLoading] = useState(false);
  const [participantReviewLoading, setParticipantReviewLoading] = useState(false);
  const [existingRequestReview, setExistingRequestReview] = useState(null);
  const [participantReviews, setParticipantReviews] = useState({});
  const [selectedParticipantIdForReview, setSelectedParticipantIdForReview] = useState(null);
  const [existingParticipantReview, setExistingParticipantReview] = useState(null);

  useEffect(() => {
    loadRequestDetail();
    loadContracts();
    loadBooking();
  }, [requestId]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (requestId) {
        loadRequestDetail();
        loadContracts();
        loadBooking();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId])
  );

  const loadRequestDetail = async () => {
    try {
      setLoading(true);
      const response = await getServiceRequestById(requestId);
      if (response?.status === "success" && response?.data) {
        setRequest(response.data);
        
        // Check if instruments are already in response (full objects)
        if (response.data.instruments && Array.isArray(response.data.instruments) && response.data.instruments.length > 0) {
          // Use instruments from response directly
          console.log('[Mobile] Using instruments from request payload:', response.data.instruments);
          const instrumentList = response.data.instruments.map(inst => ({
            instrumentId: inst.instrumentId || inst.id,
            instrumentName: inst.instrumentName || inst.name || inst,
            isMain: inst.isMain === true,
          })).filter(inst => inst.instrumentName);
          setInstruments(instrumentList);
        } 
        // Otherwise, load instruments by IDs if available
        else if (response.data.instrumentIds && Array.isArray(response.data.instrumentIds) && response.data.instrumentIds.length > 0) {
          console.log('[Mobile] Loading instruments by IDs:', response.data.instrumentIds);
          loadInstruments(response.data.instrumentIds);
        } else {
          console.log('[Mobile] No instruments found in request data');
          setInstruments([]);
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

  const loadBooking = async () => {
    try {
      const resp = await getBookingByRequestId(requestId);
      if (resp?.status === "success" && resp?.data) {
        setBooking(resp.data);
      } else {
        setBooking(null);
      }
    } catch (error) {
      // Silently handle - booking may not exist yet for this request type
      console.log("Booking not found or not applicable for this request");
      setBooking(null);
    }
  };

  const loadInstruments = async (instrumentIds) => {
    try {
      console.log('[Mobile] Loading instruments for IDs:', instrumentIds);
      const response = await getNotationInstrumentsByIds(instrumentIds);
      if (response?.status === "success" && response?.data) {
        console.log('[Mobile] Instruments loaded:', response.data);
        // Map to ensure consistent format
        const instrumentList = response.data.map(inst => ({
          instrumentId: inst.instrumentId || inst.id,
          instrumentName: inst.instrumentName || inst.name || inst,
          isMain: false, // Will be checked against request.mainInstrumentId
        })).filter(inst => inst.instrumentName);
        setInstruments(instrumentList);
      } else {
        console.warn('[Mobile] Failed to load instruments:', response);
        setInstruments([]);
      }
    } catch (error) {
      console.error("Error loading instruments:", error);
      setInstruments([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequestDetail();
    loadContracts();
    loadBooking();
  }, [requestId]);

  const handleApproveContract = async (contractId) => {
    try {
      setActionLoading(true);
      
      // Optimistic update: Update contract status immediately in local state
      setContracts((prev) =>
        prev.map((c) =>
          c.contractId === contractId ? { ...c, status: "approved" } : c
        )
      );
      
      await approveContract(contractId);
      
      // Reload to get latest data from server
      await loadContracts();
      await loadRequestDetail();
      
      Alert.alert("Success", "Contract approved successfully");
    } catch (error) {
      // Revert optimistic update on error
      await loadContracts();
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
      
      // Optimistic update: Update contract status immediately
      setContracts((prev) =>
        prev.map((c) =>
          c.contractId === selectedContract.contractId
            ? { ...c, status: "need_revision" }
            : c
        )
      );
      
      await requestChangeContract(selectedContract.contractId, changeReason);
      setRequestChangeModalVisible(false);
      setChangeReason("");
      setSelectedContract(null);
      
      // Reload to get latest data from server
      await loadContracts();
      await loadRequestDetail();
      
      Alert.alert("Success", "Change request sent successfully");
    } catch (error) {
      // Revert optimistic update on error
      await loadContracts();
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
      
      // Optimistic update: Update contract status immediately
      setContracts((prev) =>
        prev.map((c) =>
          c.contractId === selectedContract.contractId
            ? { ...c, status: "canceled_by_customer" }
            : c
        )
      );
      
      await cancelContract(selectedContract.contractId, cancelReason);
      setCancelModalVisible(false);
      setCancelReason("");
      setSelectedContract(null);
      
      // Reload to get latest data from server
      await loadContracts();
      await loadRequestDetail();
      
      Alert.alert("Success", "Contract cancelled successfully");
    } catch (error) {
      // Revert optimistic update on error
      await loadContracts();
      Alert.alert("Error", error.message || "Failed to cancel contract");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async () => {
    try {
      setOpeningChat(true);
      
      // Fetch chat room by requestId
      const response = await getChatRoomByContext("REQUEST_CHAT", requestId);
      
      if (response?.status === "success" && response?.data?.roomId) {
        // Navigate to ChatRoom in Chat tab
        // Need to navigate through MainTabs first since RequestDetail is in Drawer
        navigation.navigate("MainTabs", {
          screen: "Chat",
          params: {
            screen: "ChatRoom",
            params: {
              roomId: response.data.roomId,
              room: response.data, // Pass full room data for better UX
            },
          },
        });
      } else {
        Alert.alert(
          "Chat Not Available",
          "Chat room will be available after a manager is assigned to your request."
        );
      }
    } catch (error) {
      console.error("Error opening chat:", error);
      Alert.alert(
        "Chat Not Available",
        "This chat room is not available yet. It will be created when a manager is assigned."
      );
    } finally {
      setOpeningChat(false);
    }
  };

  // Load request review when request is completed
  useEffect(() => {
    if (request?.status?.toLowerCase() === 'completed') {
      loadRequestReview();
      // Load participant reviews ONLY for recording requests with booking participants
      if (
        request?.requestType === 'recording' &&
        booking?.participants &&
        booking.participants.length > 0
      ) {
        loadParticipantReviews();
      }
    } else {
      setExistingRequestReview(null);
      setParticipantReviews({});
    }
  }, [request?.status, request?.requestType, requestId, booking?.participants]);

  // Load request review
  const loadRequestReview = async () => {
    if (!requestId) return;
    try {
      const response = await getRequestReviews(requestId);
      if (response?.status === 'success' && response?.data) {
        // Filter REQUEST type review (should be only one)
        const requestReviewList = Array.isArray(response.data)
          ? response.data.filter(r => r.reviewType === 'REQUEST')
          : [];
        
        if (requestReviewList.length > 0) {
          setExistingRequestReview(requestReviewList[0]);
        } else {
          setExistingRequestReview(null);
        }
      }
    } catch (error) {
      console.error('Error loading request review:', error);
      setExistingRequestReview(null);
    }
  };

  // Load participant reviews
  const loadParticipantReviews = async () => {
    if (!requestId) return;
    try {
      const response = await getRequestReviews(requestId);
      if (response?.status === 'success' && response?.data) {
        // Filter PARTICIPANT type reviews
        const participantReviewsList = Array.isArray(response.data)
          ? response.data.filter(r => r.reviewType === 'PARTICIPANT')
          : [];

        // Map participantId -> review
        const reviewsMap = {};
        participantReviewsList.forEach(review => {
          if (review.participantId) {
            reviewsMap[review.participantId] = review;
          }
        });
        setParticipantReviews(reviewsMap);
      }
    } catch (error) {
      console.error('Error loading participant reviews:', error);
      setParticipantReviews({});
    }
  };

  // Handle rate request
  const handleRateRequest = () => {
    setRequestReviewModalVisible(true);
  };

  // Handle rate participant
  const handleRateParticipant = (participantId) => {
    setSelectedParticipantIdForReview(participantId);
    setExistingParticipantReview(participantReviews[participantId] || null);
    setParticipantReviewModalVisible(true);
  };

  // Handle submit request review
  const handleSubmitRequestReview = async (reviewData) => {
    if (!requestId) {
      Alert.alert('Error', 'Request ID does not exist');
      return;
    }

    try {
      setRequestReviewLoading(true);
      const response = await createRequestReview(requestId, reviewData);

      if (response?.status === 'success') {
        Alert.alert('Success', 'Request review submitted successfully');
        setExistingRequestReview(response.data);
        setRequestReviewModalVisible(false);
      } else {
        Alert.alert('Error', response?.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting request review:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit request review'
      );
    } finally {
      setRequestReviewLoading(false);
    }
  };

  // Handle submit participant review
  const handleSubmitParticipantReview = async (reviewData) => {
    if (!selectedParticipantIdForReview) return;

    try {
      setParticipantReviewLoading(true);
      const response = await createParticipantReview(
        selectedParticipantIdForReview,
        reviewData
      );

      if (response?.status === 'success') {
        Alert.alert('Success', 'Participant review submitted successfully');
        // Update participant reviews map
        setParticipantReviews(prev => ({
          ...prev,
          [selectedParticipantIdForReview]: response.data,
        }));
        setExistingParticipantReview(response.data);
        setParticipantReviewModalVisible(false);
        setSelectedParticipantIdForReview(null);
      } else {
        Alert.alert('Error', response?.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting participant review:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit participant review'
      );
    } finally {
      setParticipantReviewLoading(false);
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
        text: "Contract approved - awaiting signature",
        bgColor: COLORS.info + "15",
      },
      contract_signed: {
        color: COLORS.primary,
        icon: "document-text",
        text: "Contract signed",
        bgColor: COLORS.primary + "15",
      },
      awaiting_assignment: {
        color: COLORS.warning,
        icon: "time-outline",
        text: "Awaiting assignment",
        bgColor: COLORS.warning + "15",
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
    const status = request.status || "";
    
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
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textSecondary} />
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
          <View style={styles.titleInfoRow}>
            <Text style={styles.titleLabel}>Title:</Text>
            <Text style={styles.title}>{request.title}</Text>
          </View>
          <View style={styles.statusInfoRowVertical}>
            <Text style={styles.statusLabel}>Service:</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {getRequestTypeText(request.requestType)}
              </Text>
            </View>
          </View>
          <View style={styles.statusInfoRowVertical}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          {/* Open Chat Button - Only show if manager assigned */}
          {request.managerUserId && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleOpenChat}
              disabled={openingChat}
              activeOpacity={0.8}
            >
              {openingChat ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="chatbubbles" size={16} color={COLORS.white} />
                  <Text style={styles.chatButtonText}>Open Chat with Manager</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Request Info Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Request Information</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowRequestDetails(!showRequestDetails)}
            >
              <Ionicons
                name={showRequestDetails ? "chevron-up-outline" : "chevron-down-outline"}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.toggleButtonText}>
                {showRequestDetails ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {showRequestDetails && (
            <>
          {/* Table Container for fields before Contact Information */}
          <View style={styles.tableContainer}>
            {/* Request ID */}
            <View style={styles.tableRowVertical}>
              <Text style={styles.tableLabelVertical}>Request ID</Text>
              <Text style={[styles.tableValueVertical, styles.monospace]}>
                {request.requestId}
              </Text>
            </View>

            {/* Title */}
            <View style={styles.tableRowVertical}>
              <Text style={styles.tableLabelVertical}>Title</Text>
              <Text style={styles.tableValueVertical}>{request.title || "N/A"}</Text>
            </View>

            {/* Description */}
            <View style={styles.tableRowVertical}>
              <Text style={styles.tableLabelVertical}>Description</Text>
              <Text style={styles.tableValueVertical}>
                {request.description || "No description"}
              </Text>
            </View>

            {/* Duration - Only for transcription */}
            {request.durationMinutes && request.requestType === "transcription" && (
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Duration</Text>
                <Text style={[styles.tableValueVertical, { color: COLORS.success }]}>
                  {formatDuration(request.durationMinutes)}
                </Text>
              </View>
            )}

            {/* Tempo - Only for transcription */}
            {request.tempoPercentage && request.requestType === "transcription" && (
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Tempo</Text>
                <Text style={styles.tableValueVertical}>{request.tempoPercentage}%</Text>
              </View>
            )}

            {/* Instruments - Hidden for recording type */}
            {request.requestType !== "recording" && (() => {
              const instrumentsToShow = instruments.length > 0 
                ? instruments 
                : (request.instruments && Array.isArray(request.instruments) ? request.instruments : []);
              
              if (instrumentsToShow.length > 0) {
                return (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Instruments</Text>
                    <View style={styles.instrumentsContainer}>
                      {instrumentsToShow.map((inst, idx) => {
                        const instrumentId = inst.instrumentId || inst.id || request.instrumentIds?.[idx];
                        const instrumentName = inst.instrumentName || inst.name || inst;
                        const isMain = request.mainInstrumentId === instrumentId || inst.isMain === true;
                        const isArrangement = request.requestType === "arrangement" || request.requestType === "arrangement_with_recording";
                        return (
                          <View 
                            key={instrumentId || idx} 
                            style={[
                              styles.instrumentTag, 
                              isMain && isArrangement && styles.mainInstrumentTag
                            ]}
                          >
                            {isMain && isArrangement ? (
                              <Ionicons name="star" size={12} color={COLORS.warning} style={styles.instrumentIcon} />
                            ) : (
                              <View style={styles.instrumentIconPlaceholder} />
                            )}
                            <Text style={[
                              styles.instrumentTagText,
                              isMain && isArrangement && styles.mainInstrumentTagText
                            ]}>
                              {instrumentName || "Unknown Instrument"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              } else {
                return (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Instruments</Text>
                    <Text style={styles.tableValueVertical}>N/A</Text>
                  </View>
                );
              }
            })()}

            {/* Instruments Price - Hidden for recording type */}
            {request.requestType !== "recording" && request.instrumentPrice && request.instrumentPrice > 0 && (
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Instruments Price</Text>
                <Text style={[styles.tableValueVertical, { color: COLORS.primary, fontWeight: "600" }]}>
                  {formatPrice(request.instrumentPrice, request.currency || "VND")}
                </Text>
              </View>
            )}

            {/* Service Price - Hidden for recording type */}
            {request.requestType !== "recording" && request.servicePrice && (
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Service Price</Text>
                <Text style={[styles.tableValueVertical, { color: COLORS.primary, fontWeight: "600" }]}>
                  {formatPrice(request.servicePrice, request.currency || "VND")}
                </Text>
              </View>
            )}

            {/* Total Price - Hidden for recording type (uses booking totalCost) */}
            {request.requestType !== "recording" && request.totalPrice && (
              <View style={styles.tableRowVertical}>
                <Text style={styles.tableLabelVertical}>Total Price</Text>
                <Text style={[styles.tableValueVertical, { color: COLORS.success, fontWeight: "600", fontSize: FONT_SIZES.base }]}>
                  {formatPrice(request.totalPrice, request.currency || "VND")}
                </Text>
              </View>
            )}
          </View>

          {/* Divider before contact information */}
          <View style={styles.divider} />

          {/* Contact Name */}
          <InfoRow
            label="Contact Name"
            value={request.contactName}
          />

          {/* Contact Email */}
          <InfoRow label="Email" value={request.contactEmail} />

          {/* Phone Number */}
          <InfoRow label="Phone Number" value={request.contactPhone} />

          {/* Divider before arrangement-specific fields */}
          {((request.requestType === "arrangement" || request.requestType === "arrangement_with_recording") && 
            (request.genres || request.purpose)) && (
            <View style={styles.divider} />
          )}

          {/* Genres - Only for arrangement */}
          {((request.requestType === "arrangement" || request.requestType === "arrangement_with_recording") && 
           request.genres && 
           Array.isArray(request.genres) && 
           request.genres.length > 0) && (
            <View style={styles.infoRow}>
              <View style={styles.infoContentNoIcon}>
                <Text style={styles.infoLabel}>Genres</Text>
                <View style={styles.genresContainer}>
                  {request.genres.filter(g => g).map((genre, idx) => (
                    <View key={idx} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{getGenreLabel(genre)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Purpose - Only for arrangement, right after Genres */}
          {((request.requestType === "arrangement" || request.requestType === "arrangement_with_recording") && 
           request.purpose) && (
            <InfoRow
              label="Purpose"
              value={getPurposeLabel(request.purpose)}
            />
          )}

          {/* Divider before recording-specific fields */}
          {(request.requestType === "recording" || request.requestType === "arrangement_with_recording") && 
           (request.hasVocalist !== undefined || 
            (request.requestType === "arrangement_with_recording" && 
             request.preferredSpecialists && 
             Array.isArray(request.preferredSpecialists) && 
             request.preferredSpecialists.length > 0)) && (
            <View style={styles.divider} />
          )}

          {/* Vocalist - Only for recording/arrangement_with_recording */}
          {request.hasVocalist !== undefined && request.requestType !== "transcription" && (
            <InfoRow
              label="Vocalist"
              value={request.hasVocalist ? "Yes" : "No"}
              valueColor={request.hasVocalist ? COLORS.success : COLORS.textSecondary}
            />
          )}

          {/* Preferred Vocalists - Right after Vocalist for arrangement_with_recording */}
          {request.requestType === "arrangement_with_recording" &&
            request.preferredSpecialists &&
            Array.isArray(request.preferredSpecialists) &&
            request.preferredSpecialists.length > 0 && (
              <View style={styles.infoRow}>
                <View style={styles.infoContentNoIcon}>
                  <Text style={styles.infoLabel}>Preferred Vocalists</Text>
                  <View style={styles.genresContainer}>
                    {request.preferredSpecialists.map((specialist, idx) => (
                      <View key={idx} style={[styles.genreTag]}>
                        <Text style={styles.genreTagText}>
                          {specialist.name || `Vocalist ${specialist.specialistId}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

          {/* Guests */}
          {request.externalGuestCount > 0 && (
            <>
              <View style={styles.divider} />
              <InfoRow
                label="Guests"
                value={`${request.externalGuestCount} ${request.externalGuestCount === 1 ? "person" : "people"}`}
              />
            </>
          )}
          </>
          )}

          {/* Manager Info */}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoContentNoIcon}>
              <Text style={styles.infoLabel}>Manager</Text>
              {request.managerInfo ? (
                <View style={styles.managerInfo}>
                  <View style={styles.managerDetailRow}>
                    <Text style={styles.managerDetailLabel}>Name:</Text>
                    <Text style={styles.managerName}>{request.managerInfo.fullName || "N/A"}</Text>
                  </View>
                  <View style={styles.managerDetailRow}>
                    <Text style={styles.managerDetailLabel}>Email:</Text>
                    <Text style={styles.managerDetail}>{request.managerInfo.email || "N/A"}</Text>
                  </View>
                  {request.managerInfo.phone && (
                    <View style={styles.managerDetailRow}>
                      <Text style={styles.managerDetailLabel}>Phone:</Text>
                      <Text style={styles.managerDetail}>{request.managerInfo.phone}</Text>
                    </View>
                  )}
                  <View style={styles.managerDetailRow}>
                    <Text style={styles.managerDetailLabel}>Status:</Text>
                    <View style={styles.managerStatusBadge}>
                      <Text style={styles.managerStatusText}>{getManagerStatusText()}</Text>
                    </View>
                  </View>
                </View>
              ) : request.managerUserId ? (
                <View style={styles.managerInfo}>
                  <View style={styles.managerDetailRow}>
                    <Text style={styles.managerDetailLabel}>ID:</Text>
                    <Text style={styles.managerDetail}>{request.managerUserId}</Text>
                  </View>
                  <View style={styles.managerDetailRow}>
                    <Text style={styles.managerDetailLabel}>Status:</Text>
                    <View style={styles.managerStatusBadge}>
                      <Text style={styles.managerStatusText}>{getManagerStatusText()}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.managerInfo}>
                  <View style={styles.managerDetailRow}>
                    <Text style={styles.managerDetailLabel}>Status:</Text>
                    <View style={styles.managerStatusBadge}>
                      <Text style={styles.managerStatusText}>{getManagerStatusText()}</Text>
                    </View>
                  </View>
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
            label="Created At"
            value={formatDate(request.createdAt)}
          />
          <InfoRow
            label="Last Updated"
            value={formatDate(request.updatedAt)}
          />

          {/* Review Button - Only show when request is completed */}
          {request.status?.toLowerCase() === 'completed' && (
            <View style={styles.reviewSection}>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={handleRateRequest}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={existingRequestReview ? "star" : "star-outline"} 
                  size={16} 
                  color={COLORS.white} 
                />
                <Text style={styles.reviewButtonText}>
                  {existingRequestReview ? 'View Request Review' : 'Rate Request'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Booking Info (Recording) */}
        {request.requestType === "recording" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Booking Information</Text>
            {booking ? (
              <View style={styles.tableContainer}>
                {/* Booking Date */}
                {booking.bookingDate && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Booking Date</Text>
                    <Text style={styles.tableValueVertical}>
                      {booking.bookingDate}
                    </Text>
                  </View>
                )}

                {/* Time Slot */}
                {booking.startTime && booking.endTime && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Time Slot</Text>
                    <Text style={styles.tableValueVertical}>
                      {booking.startTime} - {booking.endTime}
                    </Text>
                  </View>
                )}

                {/* Duration */}
                {booking.durationHours && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Duration</Text>
                    <Text style={styles.tableValueVertical}>
                      {booking.durationHours} hours
                    </Text>
                  </View>
                )}

                {/* Booking Status */}
                {booking.status && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Status</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: BOOKING_STATUS_COLORS[booking.status] + "15",
                      alignSelf: "flex-start"
                    }]}>
                      <Text style={[styles.statusText, { color: BOOKING_STATUS_COLORS[booking.status] }]}>
                        {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Participants */}
                {booking.participants && booking.participants.length > 0 && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Participants</Text>
                    <View style={styles.itemsListContainer}>
                      {booking.participants.map((p, idx) => {
                        const roleLabel =
                          p.roleType === "VOCAL"
                            ? "Vocal"
                            : p.roleType === "INSTRUMENT"
                            ? "Instrument"
                            : p.roleType || "Participant";

                        const performerLabel =
                          p.performerSource === "CUSTOMER_SELF"
                            ? "Self"
                            : p.specialistName || "Internal artist";

                        const skillLabel = p.skillName ? p.skillName : null;

                        const feeNumber =
                          typeof p.participantFee === "number"
                            ? p.participantFee
                            : p.participantFee
                            ? Number(p.participantFee)
                            : 0;

                        const participantReview = participantReviews[p.participantId];
                        const canReview = request?.status?.toLowerCase() === 'completed' && 
                                          booking?.status === 'COMPLETED';

                        return (
                          <View key={idx} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                              <View style={[
                                styles.roleBadge,
                                p.roleType === "VOCAL" ? styles.roleBadgeVocal : styles.roleBadgeInstrument
                              ]}>
                                <Text style={[
                                  styles.roleBadgeText,
                                  { color: p.roleType === "VOCAL" ? COLORS.info : COLORS.primary }
                                ]}>
                                  {roleLabel}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.itemContent}>
                              <Text style={styles.itemMainText}>{performerLabel}</Text>
                              {skillLabel && (
                                <Text style={styles.itemSubText}>Skill: {skillLabel}</Text>
                              )}
                              {feeNumber > 0 && (
                                <Text style={styles.itemFeeText}>
                                  {feeNumber.toLocaleString("vi-VN")} VND
                                </Text>
                              )}
                              {/* Participant Review Button - Only for completed bookings */}
                              {canReview && p.participantId && (
                                <TouchableOpacity
                                  style={styles.participantReviewButton}
                                  onPress={() => handleRateParticipant(p.participantId)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons 
                                    name={participantReview ? "star" : "star-outline"} 
                                    size={16} 
                                    color={COLORS.primary} 
                                  />
                                  <Text style={styles.participantReviewButtonText}>
                                    {participantReview ? 'View Review' : 'Rate Artist'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Equipment */}
                {booking.requiredEquipment && booking.requiredEquipment.length > 0 && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Equipment</Text>
                    <View style={styles.itemsListContainer}>
                      {booking.requiredEquipment.map((eq, idx) => (
                        <View key={idx} style={styles.itemCard}>
                          <View style={styles.itemHeader}>
                            <Text style={styles.itemMainText}>
                              {eq.equipmentName || eq.equipmentId || "Equipment"}
                            </Text>
                            <View style={styles.quantityBadge}>
                              <Text style={styles.quantityBadgeText}>x{eq.quantity}</Text>
                            </View>
                          </View>
                          {eq.totalRentalFee && eq.totalRentalFee > 0 && (
                            <View style={styles.itemContent}>
                              <Text style={styles.itemFeeText}>
                                {eq.totalRentalFee.toLocaleString("vi-VN")} VND
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Participant Fee (Total) */}
                <View style={styles.tableRowVertical}>
                  <Text style={styles.tableLabelVertical}>Participant Fee</Text>
                  <Text style={styles.tableValueVertical}>
                    {(booking.artistFee || 0).toLocaleString("vi-VN")} VND
                  </Text>
                </View>

                {/* Equipment Fee (Total) */}
                <View style={styles.tableRowVertical}>
                  <Text style={styles.tableLabelVertical}>Equipment Fee</Text>
                  <Text style={styles.tableValueVertical}>
                    {(booking.equipmentRentalFee || 0).toLocaleString("vi-VN")} VND
                  </Text>
                </View>

                {/* Guest Fee */}
                {booking.externalGuestFee !== undefined && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>
                      {(() => {
                        const count =
                          typeof booking.externalGuestCount === "number"
                            ? booking.externalGuestCount
                            : 0;
                        const freeLimit =
                          typeof booking.freeExternalGuestsLimit === "number"
                            ? booking.freeExternalGuestsLimit
                            : 0;
                        const paidGuests = Math.max(0, count - freeLimit);
                        const freeGuests = Math.max(0, count - paidGuests);

                        if (count === 0) {
                          return "Guest Fee (0 guests)";
                        }

                        if (paidGuests > 0 && freeLimit > 0) {
                          return `Guest Fee (${count} guests: ${freeGuests} free, ${paidGuests} paid)`;
                        }

                        if (paidGuests > 0) {
                          return `Guest Fee (${count} paid guest${count === 1 ? "" : "s"})`;
                        }

                        return `Guest Fee (${count} free guest${count === 1 ? "" : "s"})`;
                      })()}
                    </Text>
                    <Text style={styles.tableValueVertical}>
                      {booking.externalGuestFee && booking.externalGuestFee > 0
                        ? `${booking.externalGuestFee.toLocaleString("vi-VN")} VND`
                        : "0 VND"}
                    </Text>
                  </View>
                )}

                {/* Studio Fee */}
                {booking.totalCost && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Studio Fee</Text>
                    <Text style={styles.tableValueVertical}>
                      {(() => {
                        const artistFee = booking.artistFee || 0;
                        const equipmentFee = booking.equipmentRentalFee || 0;
                        const guestFee = booking.externalGuestFee || 0;
                        const rawStudioFee =
                          booking.totalCost - artistFee - equipmentFee - guestFee;
                        const studioFee = rawStudioFee > 0 ? rawStudioFee : 0;
                        return `${studioFee.toLocaleString("vi-VN")} VND`;
                      })()}
                    </Text>
                  </View>
                )}

                {/* Total Cost */}
                {booking.totalCost && (
                  <View style={styles.tableRowVertical}>
                    <Text style={styles.tableLabelVertical}>Total Cost</Text>
                    <Text style={[styles.tableValueVertical, { color: COLORS.error, fontWeight: "700", fontSize: FONT_SIZES.base }]}>
                      {booking.totalCost.toLocaleString("vi-VN")} VND
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.helperText}>No booking information yet.</Text>
            )}
          </View>
        )}

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
                    requestId: requestId, // Pass requestId so we can navigate back
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
                style={[styles.modalButton, styles.modalButtonSmall, styles.modalCancelButton]}
                onPress={() => {
                  setRequestChangeModalVisible(false);
                  setChangeReason("");
                  setSelectedContract(null);
                }}
              >
                <Text style={styles.modalCancelButtonTextSmall}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSmall,
                  styles.modalConfirmButton,
                  actionLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleRequestChange}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmButtonTextSmall}>Send Request</Text>
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

      {/* Request Review Modal */}
      <ReviewModal
        visible={requestReviewModalVisible}
        onCancel={() => {
          setRequestReviewModalVisible(false);
        }}
        onConfirm={handleSubmitRequestReview}
        loading={requestReviewLoading}
        type="request"
        existingReview={existingRequestReview}
      />

      {/* Participant Review Modal */}
      <ReviewModal
        visible={participantReviewModalVisible}
        onCancel={() => {
          setParticipantReviewModalVisible(false);
          setSelectedParticipantIdForReview(null);
          setExistingParticipantReview(null);
        }}
        onConfirm={handleSubmitParticipantReview}
        loading={participantReviewLoading}
        type="participant"
        existingReview={existingParticipantReview}
      />
    </View>
  );
};

// Helper component for info rows
const InfoRow = ({ icon, label, value, monospace, valueColor }) => (
  <View style={styles.infoRow}>
    {icon && <Ionicons name={icon} size={18} color={COLORS.textSecondary} />}
    <View style={[styles.infoContent, !icon && styles.infoContentNoIcon]}>
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
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  titleSection: {
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
  titleInfoRow: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
    alignItems: "flex-start",
  },
  titleLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 60,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  serviceInfoRow: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
    alignItems: "center",
  },
  serviceLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 60,
  },
  statusInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusInfoRowVertical: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  statusLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    minWidth: 60,
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.sm,
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
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chatButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: SPACING.xs,
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
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  toggleButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoContentNoIcon: {
    flex: 1,
    marginLeft: 0,
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
  tableContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  tableRowVertical: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
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
  instrumentsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  instrumentTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  mainInstrumentTag: {
    backgroundColor: COLORS.warning + "20",
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  instrumentIcon: {
    marginRight: SPACING.xs / 2,
  },
  instrumentIconPlaceholder: {
    width: 12,
    marginRight: SPACING.xs / 2,
  },
  instrumentTagText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
    lineHeight: FONT_SIZES.sm * 1.2,
  },
  mainInstrumentTagText: {
    color: COLORS.warning,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.xs / 2,
  },
  genreTag: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  genreTagText: {
    fontSize: FONT_SIZES.sm,
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
  managerDetailRow: {
    flexDirection: "row",
    marginBottom: SPACING.xs / 2,
    alignItems: "flex-start",
  },
  managerDetailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
    minWidth: 60,
  },
  managerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  managerDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  managerStatusBadge: {
    backgroundColor: COLORS.primary + "15",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  managerStatusText: {
    fontSize: FONT_SIZES.sm,
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
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  contractsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
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
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
  },
  noContractsText: {
    fontSize: FONT_SIZES.sm,
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
    padding: SPACING.md,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  modalContractNumber: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalTextArea: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    minHeight: 100,
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
  modalButtonSmall: {
    paddingVertical: SPACING.sm,
  },
  modalCancelButtonTextSmall: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalConfirmButtonTextSmall: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
  },
  // Items list styles (Participants & Equipment)
  itemsListContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  itemCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  itemContent: {
    marginTop: SPACING.xs / 2,
  },
  itemMainText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  itemSubText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  itemFeeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: SPACING.xs / 2,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  roleBadgeVocal: {
    backgroundColor: COLORS.info + "20",
  },
  roleBadgeInstrument: {
    backgroundColor: COLORS.primary + "20",
  },
  roleBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  quantityBadge: {
    backgroundColor: COLORS.warning + "20",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  quantityBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.warning,
  },
  // Review section styles
  reviewSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  reviewButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  participantReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.primary + "15",
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    gap: SPACING.xs,
  },
  participantReviewButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default RequestDetailScreen;

