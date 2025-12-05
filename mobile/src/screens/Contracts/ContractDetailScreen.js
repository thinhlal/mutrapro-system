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
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS } from "../../config/constants";
import {
  getContractById,
  approveContract,
  initESign,
  verifyOTPAndSign,
  requestChangeContract,
  cancelContract,
} from "../../services/contractService";
import { getServiceRequestById } from "../../services/serviceRequestService";
import SignaturePadModal from "../../components/SignaturePadModal";
import OTPVerificationModal from "../../components/OTPVerificationModal";
import ContractPreview from "../../components/ContractPreview";

const ContractDetailScreen = ({ navigation, route }) => {
  const { contractId, requestId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contract, setContract] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestDetails, setRequestDetails] = useState(null);
  const [pricingBreakdown, setPricingBreakdown] = useState({
    instruments: [],
    transcriptionDetails: null,
  });

  // Tab state: 'details' or 'preview'
  const [activeTab, setActiveTab] = useState("details");

  // E-Signature states
  const [signaturePadVisible, setSignaturePadVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [eSignSession, setESignSession] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [maxOtpAttempts, setMaxOtpAttempts] = useState(3);

  // Modals
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [viewReasonModalVisible, setViewReasonModalVisible] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadContract();
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const response = await getContractById(contractId);
      if (response?.status === "success" && response?.data) {
        setContract(response.data);
        
        // Load request details for preview
        if (response.data.requestId) {
          await loadRequestAndPricing(response.data.requestId);
        }
      } else {
        const errorMessage = response?.error || response?.message || "Failed to load contract";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error loading contract:", error);
      
      // Show error details for debugging
      const errorMsg = error.message || error.error || "Failed to load contract";
      const errorDetails = error.status ? `\nStatus: ${error.status}` : "";
      
      Alert.alert(
        "Error Loading Contract", 
        `${errorMsg}${errorDetails}\n\nPlease try again or contact support if the issue persists.`,
        [
          { text: "Go Back", onPress: () => navigation.goBack(), style: "cancel" },
          { text: "Retry", onPress: () => loadContract() }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRequestAndPricing = async (requestId) => {
    try {
      const requestResponse = await getServiceRequestById(requestId);
      if (requestResponse?.status === "success" && requestResponse?.data) {
        const request = requestResponse.data;
        setRequestDetails(request);

        // Build pricing breakdown
        const breakdown = {
          instruments: [],
          transcriptionDetails: null,
        };

        // Instruments info
        if (request.instruments && Array.isArray(request.instruments)) {
          breakdown.instruments = request.instruments.map((instr) => ({
            instrumentId: instr.instrumentId,
            instrumentName: instr.instrumentName,
            basePrice: instr.basePrice || 0,
          }));
        }

        setPricingBreakdown(breakdown);
      }
    } catch (error) {
      console.warn("Error loading request details:", error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadContract();
  }, [contractId]);

  // ============ CONTRACT ACTIONS ============

  const handleApprove = () => {
    Alert.alert(
      "Approve Contract",
      "Are you sure you want to approve this contract? After approval, you will need to sign it electronically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await approveContract(contractId);
              
              if (response?.status === "success") {
                Alert.alert("Success", "Contract approved successfully!");
                
                // Try to reload, but don't fail if reload has issues
                try {
                  await loadContract();
                } catch (reloadError) {
                  console.warn("Error reloading contract after approve:", reloadError);
                  // Contract was approved successfully, just reload failed
                  // Navigate back and let user see updated contract from list
                  setTimeout(() => {
                    Alert.alert(
                      "Notice",
                      "Contract approved successfully. Please go back and view the updated contract.",
                      [{ text: "OK", onPress: () => navigation.goBack() }]
                    );
                  }, 500);
                }
              }
            } catch (error) {
              console.error("Error approving contract:", error);
              Alert.alert(
                "Error", 
                error.message || error.error || "Failed to approve contract. Please try again."
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ============ E-SIGNATURE FLOW ============

  const handleStartESign = () => {
    setSignatureData(null);
    setOtpError(null);
    setESignSession(null);
    setOtpExpiresAt(null);
    setMaxOtpAttempts(3);
    setSignaturePadVisible(true);
  };

  const handleSignatureConfirm = async (signatureBase64) => {
    try {
      setActionLoading(true);
      setSignatureData(signatureBase64);
      
      const response = await initESign(contractId, signatureBase64);
      if (response?.status === "success" && response?.data) {
        const session = response.data;
        const expireAtMs = session.expireAt
          ? dayjs(session.expireAt).valueOf()
          : null;

        setESignSession(session);
        setOtpExpiresAt(expireAtMs);
        setMaxOtpAttempts(session.maxAttempts || 3);
        setOtpError(null);
        setSignaturePadVisible(false);
        setOtpModalVisible(true);

        Alert.alert("Success", response.message || "OTP has been sent to your email");
      }
    } catch (error) {
      console.error("Error initializing e-signature:", error);
      Alert.alert("Error", error?.message || "Failed to initialize e-signature");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    if (!eSignSession?.sessionId) {
      Alert.alert("Error", "Signing session not found. Please restart the signing process.");
      setOtpModalVisible(false);
      return;
    }

    try {
      setActionLoading(true);
      const response = await verifyOTPAndSign(
        contractId,
        eSignSession.sessionId,
        otpCode
      );
      if (response?.status === "success") {
        Alert.alert("Success", response.message || "Contract signed successfully!");
        setOtpModalVisible(false);
        setSignatureData(null);
        setESignSession(null);
        setOtpError(null);
        setOtpExpiresAt(null);

        await loadContract();

        // Navigate to ContractSignedSuccessScreen
        setTimeout(() => {
          navigation.navigate("ContractSignedSuccess", { contractId });
        }, 500);
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      const errorMessage = error?.message || "Invalid OTP. Please try again.";
      setOtpError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!signatureData) {
      setOtpModalVisible(false);
      setSignaturePadVisible(true);
      return;
    }

    try {
      setActionLoading(true);
      const response = await initESign(contractId, signatureData);
      if (response?.status === "success" && response?.data) {
        const session = response.data;
        const expireAtMs = session.expireAt
          ? dayjs(session.expireAt).valueOf()
          : null;

        setESignSession(session);
        setOtpExpiresAt(expireAtMs);
        setMaxOtpAttempts(session.maxAttempts || 3);
        setOtpError(null);

        Alert.alert("Success", response.message || "A new OTP has been sent to your email");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      Alert.alert("Error", error?.message || "Failed to resend OTP");
    } finally {
      setActionLoading(false);
    }
  };

  // ============ REQUEST REVISION ============

  const handleRequestRevision = async () => {
    if (!revisionReason.trim()) {
      Alert.alert("Error", "Please enter the reason for requesting changes");
      return;
    }
    if (revisionReason.trim().length < 10) {
      Alert.alert("Error", "Reason must be at least 10 characters");
      return;
    }

    try {
      setActionLoading(true);
      await requestChangeContract(contractId, revisionReason);
      Alert.alert("Success", "Revision request sent successfully");
      setRevisionModalVisible(false);
      setRevisionReason("");
      await loadContract();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to request changes");
    } finally {
      setActionLoading(false);
    }
  };

  // ============ CANCEL CONTRACT ============

  const handleCancelContract = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Error", "Please enter the reason for cancelling");
      return;
    }
    if (cancelReason.trim().length < 10) {
      Alert.alert("Error", "Reason must be at least 10 characters");
      return;
    }

    try {
      setActionLoading(true);
      await cancelContract(contractId, cancelReason);
      Alert.alert("Success", "Contract cancelled successfully");
      setCancelModalVisible(false);
      setCancelReason("");
      await loadContract();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to cancel contract");
    } finally {
      setActionLoading(false);
    }
  };

  // ============ HELPERS ============

  const getStatusConfig = (status) => {
    const configs = {
      draft: { color: COLORS.textSecondary, text: "Draft" },
      sent: { color: COLORS.info, text: "Sent to Customer" },
      approved: { color: COLORS.info, text: "Approved - Waiting for Signature" },
      signed: { color: COLORS.warning, text: "Signed - Pending Deposit Payment" },
      active_pending_assignment: {
        color: COLORS.warning,
        text: "Deposit Paid - Pending Assignment",
      },
      active: { color: COLORS.success, text: "Active - Deposit Paid" },
      rejected_by_customer: { color: COLORS.error, text: "Rejected by Customer" },
      need_revision: { color: COLORS.warning, text: "Needs Revision" },
      canceled_by_customer: { color: COLORS.error, text: "Canceled by Customer" },
      canceled_by_manager: { color: COLORS.error, text: "Canceled by Manager" },
      expired: { color: COLORS.textSecondary, text: "Expired" },
    };
    return configs[status] || { color: COLORS.textSecondary, text: status };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return dayjs(dateString).format("DD/MM/YYYY HH:mm");
  };

  const formatCurrency = (amount, currency = "VND") => {
    if (currency === "VND") {
      return `${amount?.toLocaleString("vi-VN")} ₫`;
    }
    return `${currency} ${amount?.toLocaleString()}`;
  };

  // ============ RENDER ============

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading contract...</Text>
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>Contract not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusConfig = getStatusConfig(contract.status?.toLowerCase());
  const currentStatus = contract.status?.toLowerCase();

  // Determine available actions
  const isSent = currentStatus === "sent";
  const isApproved = currentStatus === "approved";
  const isSigned = currentStatus === "signed";
  const isActive = currentStatus === "active" || currentStatus === "active_pending_assignment";
  const isCanceled = currentStatus?.includes("canceled");
  const isNeedRevision = currentStatus === "need_revision";
  const isExpired = currentStatus === "expired";

  const canApprove = isSent;
  const canSign = isApproved;
  const canPayDeposit = isSigned && !isCanceled && !isExpired;
  const canViewReason = isCanceled || isNeedRevision;

  // Get deposit installment
  const depositInstallment = contract?.installments?.find(
    (inst) => inst.type === "DEPOSIT"
  );
  const isDepositPaid = depositInstallment?.status === "PAID";

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "details" && styles.tabActive]}
          onPress={() => setActiveTab("details")}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={activeTab === "details" ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "details" && styles.tabTextActive,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "preview" && styles.tabActive]}
          onPress={() => setActiveTab("preview")}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={activeTab === "preview" ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "preview" && styles.tabTextActive,
            ]}
          >
            Preview
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "details" ? (
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
        {/* Status Alert */}
        {isApproved && (
          <View style={[styles.alertBox, { backgroundColor: COLORS.success + "15" }]}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={[styles.alertText, { color: COLORS.success }]}>
              Contract approved! Please sign to proceed.
            </Text>
          </View>
        )}

        {isSigned && (
          <View style={[styles.alertBox, { backgroundColor: COLORS.warning + "15" }]}>
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <Text style={[styles.alertText, { color: COLORS.warning }]}>
              Contract signed! Please pay the deposit to activate.
            </Text>
          </View>
        )}

        {(isCanceled || isExpired || isNeedRevision) && (
          <View style={[styles.alertBox, { backgroundColor: COLORS.error + "15" }]}>
            <Ionicons name="information-circle" size={24} color={COLORS.error} />
            <Text style={[styles.alertText, { color: COLORS.error }]}>
              {isCanceled && "This contract has been cancelled."}
              {isExpired && "This contract has expired."}
              {isNeedRevision && "You have requested revisions."}
            </Text>
            {canViewReason && (
              <TouchableOpacity onPress={() => setViewReasonModalVisible(true)}>
                <Text style={styles.viewReasonLink}>View Reason</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Contract Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Contract Information</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + "15" }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          <InfoRow icon="document-text-outline" label="Contract Number" value={contract.contractNumber || "N/A"} />
          <InfoRow icon="briefcase-outline" label="Contract Type" value={contract.contractType?.toUpperCase() || "N/A"} />
          <InfoRow
            icon="cash-outline"
            label="Total Price"
            value={formatCurrency(contract.totalPrice, contract.currency)}
            valueColor={COLORS.primary}
          />
          {depositInstallment && (
            <InfoRow
              icon="wallet-outline"
              label={`Deposit (${depositInstallment.percent}%)`}
              value={formatCurrency(depositInstallment.amount, depositInstallment.currency)}
              valueColor={isDepositPaid ? COLORS.success : COLORS.warning}
            />
          )}
          <InfoRow icon="time-outline" label="SLA Days" value={`${contract.slaDays || 0} days`} />
          {contract.expectedStartDate && (
            <InfoRow icon="calendar-outline" label="Expected Start" value={formatDate(contract.expectedStartDate)} />
          )}
          {contract.sentToCustomerAt && (
            <InfoRow icon="send-outline" label="Sent At" value={formatDate(contract.sentToCustomerAt)} />
          )}
          {contract.signedAt && (
            <InfoRow icon="create-outline" label="Signed At" value={formatDate(contract.signedAt)} />
          )}
        </View>

        {/* Deposit Payment Section */}
        {depositInstallment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deposit Payment</Text>
            <View
              style={[
                styles.paymentCard,
                {
                  borderLeftColor: isDepositPaid ? COLORS.success : COLORS.warning,
                },
              ]}
            >
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>
                  Deposit ({depositInstallment.percent}%)
                </Text>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(depositInstallment.amount, depositInstallment.currency)}
                </Text>
              </View>
              <Text style={styles.paymentDescription}>
                Initial deposit payment required to activate the contract
              </Text>
              <View style={styles.paymentFooter}>
                <View
                  style={[
                    styles.paymentStatusBadge,
                    {
                      backgroundColor: isDepositPaid
                        ? COLORS.success + "15"
                        : COLORS.warning + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentStatusText,
                      { color: isDepositPaid ? COLORS.success : COLORS.warning },
                    ]}
                  >
                    {isDepositPaid ? "PAID" : "PENDING"}
                  </Text>
                </View>
                {canPayDeposit && !isDepositPaid && (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => navigation.navigate("PaymentDeposit", { contractId })}
                  >
                    <Ionicons name="card-outline" size={18} color={COLORS.white} />
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Milestones Section */}
        {contract?.milestones && contract.milestones.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Milestones</Text>
            {contract.milestones
              .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
              .map((milestone, index) => {
                const installment = contract?.installments?.find(
                  (inst) => inst.milestoneId === milestone.milestoneId
                );
                const isPaid = installment?.status === "PAID";
                const isDue = installment?.status === "DUE";
                const workStatus = milestone.workStatus || "PLANNED";

                return (
                  <View
                    key={milestone.milestoneId || index}
                    style={[
                      styles.milestoneCard,
                      {
                        borderLeftColor: isPaid
                          ? COLORS.success
                          : isDue
                          ? COLORS.warning
                          : COLORS.border,
                      },
                    ]}
                  >
                    <View style={styles.milestoneHeader}>
                      <Text style={styles.milestoneTitle}>
                        {milestone.name || `Milestone ${milestone.orderIndex || index + 1}`}
                      </Text>
                    </View>
                    {installment && (
                      <View style={styles.milestonePriceRow}>
                        <Text style={styles.milestonePriceLabel}>Price:</Text>
                        <Text style={styles.milestoneAmount}>
                          {formatCurrency(installment.amount, installment.currency)}
                        </Text>
                      </View>
                    )}
                    {milestone.description && (
                      <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                    )}
                    <View style={styles.milestoneFooter}>
                      <View style={styles.milestoneTags}>
                        {installment && (
                          <View
                            style={[
                              styles.tag,
                              {
                                backgroundColor: isPaid
                                  ? COLORS.success + "15"
                                  : isDue
                                  ? COLORS.warning + "15"
                                  : COLORS.border + "50",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                {
                                  color: isPaid
                                    ? COLORS.success
                                    : isDue
                                    ? COLORS.warning
                                    : COLORS.textSecondary,
                                },
                              ]}
                            >
                              {isPaid ? "PAID" : isDue ? "DUE" : "PENDING"}
                            </Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.tag,
                            {
                              backgroundColor:
                                workStatus === "COMPLETED"
                                  ? COLORS.success + "15"
                                  : workStatus === "IN_PROGRESS"
                                  ? COLORS.primary + "15"
                                  : COLORS.border + "50",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              {
                                color:
                                  workStatus === "COMPLETED"
                                    ? COLORS.success
                                    : workStatus === "IN_PROGRESS"
                                    ? COLORS.primary
                                    : COLORS.textSecondary,
                              },
                            ]}
                          >
                            {workStatus}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.milestoneActions}>
                        {/* Pay Button */}
                        {isDue &&
                          !isPaid &&
                          (workStatus === "READY_FOR_PAYMENT" ||
                            workStatus === "COMPLETED") && (
                            <TouchableOpacity
                              style={styles.payButton}
                              onPress={() =>
                                navigation.navigate("PaymentMilestone", {
                                  contractId,
                                  milestoneId: milestone.milestoneId,
                                  installmentId: installment?.installmentId,
                                })
                              }
                            >
                              <Text style={styles.payButtonText}>Pay</Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                    {/* View Deliveries Button - chỉ hiển thị khi milestone có work status WAITING_CUSTOMER, READY_FOR_PAYMENT, hoặc COMPLETED */}
                    {(workStatus === "WAITING_CUSTOMER" ||
                      workStatus === "READY_FOR_PAYMENT" ||
                      workStatus === "COMPLETED") && (
                      <View style={styles.viewDeliveriesContainer}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.viewDeliveriesButton]}
                          onPress={() =>
                            navigation.navigate("MilestoneDeliveries", {
                              contractId,
                              milestoneId: milestone.milestoneId,
                              milestoneName:
                                milestone.name ||
                                `Milestone ${milestone.orderIndex || index + 1}`,
                            })
                          }
                        >
                          <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.viewDeliveriesButtonText}>View Deliveries</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* Action Buttons */}
        {(canApprove || canSign) && (
          <View style={styles.actionsCard}>
            {canApprove && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Approve Contract</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.revisionButton]}
                  onPress={() => setRevisionModalVisible(true)}
                  disabled={actionLoading}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                  <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                    Request Revision
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setCancelModalVisible(true)}
                  disabled={actionLoading}
                >
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                  <Text style={[styles.actionButtonText, { color: COLORS.error }]}>
                    Cancel Contract
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {canSign && (
              <TouchableOpacity
                style={[styles.actionButton, styles.signButton]}
                onPress={handleStartESign}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="create" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>E-Sign Contract</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        </ScrollView>
      ) : (
        <ContractPreview
          contract={contract}
          requestDetails={requestDetails}
          pricingBreakdown={pricingBreakdown}
        />
      )}

      {/* Modals */}
      <SignaturePadModal
        visible={signaturePadVisible}
        onCancel={() => setSignaturePadVisible(false)}
        onConfirm={handleSignatureConfirm}
        loading={actionLoading}
      />

      <OTPVerificationModal
        visible={otpModalVisible}
        onCancel={() => {
          setOtpModalVisible(false);
          setOtpError(null);
          setESignSession(null);
          setSignatureData(null);
        }}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        loading={actionLoading}
        error={otpError}
        expiresAt={otpExpiresAt}
        maxAttempts={maxOtpAttempts}
        email={contract?.emailSnapshot || ""}
      />

      {/* Request Revision Modal */}
      <Modal
        visible={revisionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRevisionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Revision</Text>
              <TouchableOpacity onPress={() => setRevisionModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Please explain what changes you would like to see in the contract:
            </Text>
            <TextInput
              style={styles.modalTextArea}
              placeholder="Minimum 10 characters..."
              placeholderTextColor={COLORS.textSecondary}
              value={revisionReason}
              onChangeText={setRevisionReason}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{revisionReason.length}/500</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setRevisionModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleRequestRevision}
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
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Contract</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Are you sure you want to cancel this contract? This action cannot be undone.
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
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>No, keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDangerButton]}
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

      {/* View Reason Modal */}
      <Modal
        visible={viewReasonModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewReasonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCanceled ? "Cancellation Reason" : "Revision Request"}
              </Text>
              <TouchableOpacity onPress={() => setViewReasonModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>
                {contract?.cancellationReason || "No reason provided"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={() => setViewReasonModalVisible(false)}
            >
              <Text style={styles.modalConfirmButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper Component
const InfoRow = ({ icon, label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
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
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  alertText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
    fontWeight: "600",
  },
  viewReasonLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
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
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
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
  paymentCard: {
    borderLeftWidth: 4,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  paymentTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
  },
  paymentAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.primary,
  },
  paymentDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  paymentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  paymentStatusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs / 2,
  },
  payButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.white,
  },
  milestoneCard: {
    borderLeftWidth: 4,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  milestoneTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  milestonePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  milestonePriceLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  milestoneAmount: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.primary,
  },
  milestoneDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  milestoneFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  milestoneTags: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  viewDeliveriesButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs / 2,
  },
  viewDeliveriesButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  viewDeliveriesContainer: {
    marginTop: SPACING.sm,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  actionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  signButton: {
    backgroundColor: COLORS.primary,
  },
  revisionButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: "700",
    color: COLORS.white,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
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
  reasonBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  reasonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    lineHeight: 22,
  },
});

export default ContractDetailScreen;

