import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Alert,
  Spin,
  Typography,
  Divider,
  message,
  Modal,
  Empty,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FormOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  DownloadOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import {
  Document,
  Page,
  Text as PdfText,
  View,
  StyleSheet,
  pdf,
  Image as PdfImage,
  Font,
  Svg,
  Circle,
  Path,
} from '@react-pdf/renderer';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getContractById,
  approveContract,
  cancelContract,
  requestChangeContract,
  initESign,
  verifyOTPAndSign,
  getSignatureImage,
  uploadContractPdf,
} from '../../../services/contractService';
import {
  getServiceRequestById,
  calculatePricing,
} from '../../../services/serviceRequestService';
import { getContractRevisionStats } from '../../../services/revisionRequestService';
import {
  formatDurationMMSS,
  formatTempoPercentage,
} from '../../../utils/timeUtils';
import { getGenreLabel, getPurposeLabel } from '../../../constants/musicOptionsConstants';
import { API_CONFIG } from '../../../config/apiConfig';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import RevisionRequestModal from '../../../components/modal/RevisionRequestModal/RevisionRequestModal';
import ViewCancellationReasonModal from '../../../components/modal/ViewCancellationReasonModal/ViewCancellationReasonModal';
import SignaturePadModal from '../../../components/modal/SignaturePadModal/SignaturePadModal';
import OTPVerificationModal from '../../../components/modal/OTPVerificationModal/OTPVerificationModal';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import styles from './ContractDetailPage.module.css';
import Header from '../../../components/common/Header/Header';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;

// Helper function to format date
const formatDate = date => {
  if (!date) return 'N/A';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

// Helper function để format description, thay thế "X.XX phút" bằng format mm:ss
const formatDescriptionDuration = description => {
  if (!description) return description;

  // Tìm pattern: số thập phân + " phút" hoặc "phút" (ví dụ: "4.38 phút", "5.5 phút", "4.38phút")
  const pattern = /(\d+\.?\d*)\s*phút/gi;

  return description.replace(pattern, (match, minutes) => {
    const minutesNum = parseFloat(minutes);
    if (!isNaN(minutesNum) && minutesNum > 0) {
      return formatDurationMMSS(minutesNum);
    }
    return match;
  });
};

// Generate contract title from contract type
const getContractTitle = contractType => {
  const titleMap = {
    transcription: 'Transcription Service Agreement',
    arrangement: 'Arrangement Service Agreement',
    arrangement_with_recording: 'Arrangement with Recording Service Agreement',
    recording: 'Recording Service Agreement',
    bundle:
      'Bundle Service Agreement (Transcription + Arrangement + Recording)',
  };
  return titleMap[contractType] || 'Service Agreement';
};

const ContractDetailPage = () => {
  useDocumentTitle('Contract Details');
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const previewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [partyBSignatureUrl, setPartyBSignatureUrl] = useState(null); // Secure signature image URL from backend

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [viewReasonModalOpen, setViewReasonModalOpen] = useState(false);

  // E-Signature modals and state
  const [signaturePadModalOpen, setSignaturePadModalOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [eSignSession, setESignSession] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [maxOtpAttempts, setMaxOtpAttempts] = useState(3);

  // Pricing breakdown information
  const [pricingBreakdown, setPricingBreakdown] = useState({
    instruments: [], // Array of { instrumentId, instrumentName, basePrice }
    transcriptionDetails: null, // { basePrice, quantity, unitPrice, breakdown }
  });
  const [requestDetails, setRequestDetails] = useState(null);

  // Deposit milestone state
  const [depositMilestone, setDepositMilestone] = useState(null);

  // Revision stats state
  const [revisionStats, setRevisionStats] = useState(null);

  // Load contract data
  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  // Reload contract when returning from payment page with polling
  useEffect(() => {
    if (location.state?.paymentSuccess) {
      // Clear the state to avoid reloading on every render
      window.history.replaceState({}, document.title);

      // Poll for payment status update (Kafka event processing is async)
      const pollPaymentStatus = async () => {
        const maxRetries = 8; // Try for ~8 seconds
        const delay = 1000; // 1 second between retries

        // Store initial payment status to detect changes
        let initialPaidCount = 0;
        try {
          const initialResponse = await getContractById(contractId);
          if (initialResponse?.status === 'success' && initialResponse?.data) {
            const initialData = initialResponse.data;
            // Count how many installments/milestones are currently paid
            initialPaidCount =
              (initialData.installments?.filter(inst => inst.status === 'PAID')
                .length || 0) +
              (initialData.milestones?.filter(m => m.paymentStatus === 'PAID')
                .length || 0);
          }
        } catch (error) {
          console.error('Error getting initial payment status:', error);
        }

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          // Wait before checking (except first attempt)
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          try {
            const response = await getContractById(contractId);
            if (response?.status === 'success' && response?.data) {
              const contractData = response.data;

              // Count current paid installments/milestones
              const currentPaidCount =
                (contractData.installments?.filter(
                  inst => inst.status === 'PAID'
                ).length || 0) +
                (contractData.milestones?.filter(
                  m => m.paymentStatus === 'PAID'
                ).length || 0);

              // If payment count increased, payment was processed
              if (currentPaidCount > initialPaidCount) {
                setContract(contractData);
                message.success('Payment confirmed!');
                return;
              }

              // Update contract data even if not paid yet (to show latest state)
              setContract(contractData);
            }
          } catch (error) {
            console.error('Error polling payment status:', error);
          }
        }

        // After max retries, show info message
        message.info(
          'Payment is processing. Please refresh if status is not updated.'
        );
      };

      // Start polling
      pollPaymentStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.paymentSuccess, contractId]);

  // Fetch signature image securely from backend when contract is signed
  useEffect(() => {
    const fetchSignature = async () => {
      if (!contract?.contractId || !contract?.customerSignedAt) {
        setPartyBSignatureUrl(null);
        return;
      }

      try {
        const signatureResponse = await getSignatureImage(contract.contractId);
        if (signatureResponse?.data) {
          // signatureResponse.data is base64 data URL from backend
          setPartyBSignatureUrl(signatureResponse.data);
        }
      } catch (error) {
        console.error('Error loading signature image:', error);
        setPartyBSignatureUrl(null);
        // Don't show error message - just don't display signature
      }
    };

    fetchSignature();
  }, [contract?.contractId, contract?.customerSignedAt]);

  const loadRevisionStats = async contractId => {
    try {
      const response = await getContractRevisionStats(contractId);
      if (response?.status === 'success' && response?.data) {
        setRevisionStats(response.data);
      } else {
        setRevisionStats(null);
      }
    } catch (error) {
      console.error('Error loading revision stats:', error);
      // Không hiển thị error message vì đây là lazy load, không ảnh hưởng đến chức năng chính
      setRevisionStats(null);
    }
  };

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        const contractData = response.data;
        console.log('Contract data:', contractData);
        setContract(contractData);

        // Debug: Log milestones
        console.log('Contract loaded:', {
          contractId: contractData.contractId,
          status: contractData.status,
          milestones: contractData.milestones,
          milestonesLength: contractData.milestones?.length || 0,
        });

        // Lấy milestone đầu tiên (deposit milestone) từ contract.milestones
        if (contractData.milestones && contractData.milestones.length > 0) {
          // Tìm milestone đầu tiên có paymentStatus = DUE hoặc NOT_DUE (chưa thanh toán)
          const firstMilestone =
            contractData.milestones.find(
              m => m.paymentStatus === 'DUE' || m.paymentStatus === 'NOT_DUE'
            ) || contractData.milestones[0]; // Fallback: lấy milestone đầu tiên

          if (firstMilestone) {
            setDepositMilestone(firstMilestone);
          } else {
            setDepositMilestone(null);
          }
        } else {
          setDepositMilestone(null);
          console.warn('No milestones found in contract response');
        }

        // Load pricing breakdown if requestId is available
        if (response.data.requestId) {
          await loadPricingBreakdown(response.data.requestId);
        }

        // Load revision stats của contract (để hiển thị thống kê free/paid revisions)
        if (contractData.freeRevisionsIncluded != null) {
          loadRevisionStats(contractId);
        }
      } else {
        throw new Error('Failed to load contract');
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      setError(error?.message || 'Failed to load contract');
      message.error('Failed to load contract data');
    } finally {
      setLoading(false);
    }
  };

  // Load pricing breakdown (instruments and transcription details)
  const loadPricingBreakdown = async requestId => {
    try {
      setRequestDetails(null);
      const requestResponse = await getServiceRequestById(requestId);
      if (requestResponse?.status !== 'success' || !requestResponse?.data) {
        return;
      }

      const request = requestResponse.data;
      setRequestDetails(request);
      const breakdown = {
        instruments: [],
        transcriptionDetails: null,
      };

      // Use full instruments info from response (backend trả về đầy đủ thông tin)
      if (
        request.instruments &&
        Array.isArray(request.instruments) &&
        request.instruments.length > 0
      ) {
        const selectedInstruments = request.instruments.map(instr => ({
          instrumentId: instr.instrumentId,
          instrumentName: instr.instrumentName,
          basePrice: instr.basePrice || 0,
          isMain: instr.isMain === true, // Include isMain field
        }));
        breakdown.instruments = selectedInstruments;
      }

      // Load transcription pricing details if request type is transcription
      const requestType = request.requestType || request.serviceType;
      if (requestType === 'transcription' && request.durationMinutes) {
        try {
          const pricingResponse = await calculatePricing('transcription', {
            durationMinutes: request.durationMinutes,
          });
          if (pricingResponse?.status === 'success' && pricingResponse?.data) {
            breakdown.transcriptionDetails = pricingResponse.data;
          }
        } catch (error) {
          console.warn('Failed to load transcription pricing:', error);
        }
      }

      setPricingBreakdown(breakdown);
    } catch (error) {
      console.warn('Error loading pricing breakdown:', error);
    }
  };

  // Handle pay deposit
  const handlePayDeposit = () => {
    navigate(`/contracts/${contractId}/pay-deposit`);
  };

  // Handle approve
  const handleApprove = async () => {
    try {
      setApproveLoading(true);
      const response = await approveContract(contractId);
      if (response?.status === 'success') {
        message.success('Contract approved successfully!');
        loadContract(); // Reload to get updated status
      }
    } catch (error) {
      console.error('Error approving contract:', error);
      message.error(error?.message || 'Failed to approve contract');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleStartESign = () => {
    setSignatureData(null);
    setOtpError(null);
    setESignSession(null);
    setOtpExpiresAt(null);
    setMaxOtpAttempts(3);
    setSignaturePadModalOpen(true);
  };

  const handleSignatureConfirm = async signatureBase64 => {
    try {
      setSignatureLoading(true);
      setSignatureData(signatureBase64);
      const response = await initESign(contractId, signatureBase64);
      if (response?.status === 'success' && response?.data) {
        const session = response.data;
        const expireAtMs = session.expireAt
          ? dayjs(session.expireAt).valueOf()
          : null;

        setESignSession(session);
        setOtpExpiresAt(expireAtMs);
        setMaxOtpAttempts(session.maxAttempts || 3);
        setOtpError(null);
        setSignaturePadModalOpen(false);
        setOtpModalOpen(true);

        message.success(response.message || 'OTP has been sent to your email');
      }
    } catch (error) {
      console.error('Error initializing e-signature:', error);
      message.error(
        error?.message || 'Failed to initialize e-signature. Please try again.'
      );
    } finally {
      setSignatureLoading(false);
    }
  };

  const handleSignatureCancel = () => {
    setSignaturePadModalOpen(false);
    setSignatureData(null);
    setSignatureLoading(false);
  };

  // Helper function to generate PDF blob
  const generatePdfBlob = async (
    contractData = contract,
    pricingData = pricingBreakdown,
    requestData = requestDetails
  ) => {
    // Fetch Party A signature image and convert to base64
    let partyASignatureBase64 = null;
    try {
      partyASignatureBase64 = await imageUrlToBase64('/images/signature.png');
    } catch (error) {
      // Continue without Party A signature
    }

    // Fetch Party B signature image via backend proxy
    let partyBSignatureBase64 = null;
    const contractStatus = contractData?.status?.toLowerCase();
    if (
      (contractStatus === 'signed' ||
        contractStatus === 'active' ||
        contractStatus === 'active_pending_assignment' ||
        contractStatus === 'completed') &&
      contractData?.customerSignedAt
    ) {
      try {
        const signatureResponse = await getSignatureImage(contractId);
        if (signatureResponse?.data) {
          partyBSignatureBase64 = signatureResponse.data;
        }
      } catch (error) {
        // Continue without signature image
      }
    }

    // Create PDF document
    const doc = (
      <ContractPdfDocument
        contract={contractData}
        pricingBreakdown={pricingData}
        statusConfig={getStatusConfig(contractData?.status)}
        partyASignatureBase64={partyASignatureBase64}
        partyBSignatureBase64={partyBSignatureBase64}
        requestDetails={requestData}
      />
    );

    // Generate PDF blob
    return await pdf(doc).toBlob();
  };

  // Helper function to upload PDF to backend
  const uploadPdfToBackend = async pdfBlob => {
    const contractNumber =
      contract?.contractNumber || contract?.contractId || 'contract';
    const filename = `contract-${contractNumber}-${dayjs().format('YYYYMMDD')}.pdf`;

    try {
      const response = await uploadContractPdf(contractId, pdfBlob, filename);
      if (response?.status === 'success') {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      return false;
    }
  };

  const handleVerifyOtp = async otpCode => {
    if (!eSignSession?.sessionId) {
      message.error(
        'Signing session not found. Please restart the signing process.'
      );
      setOtpModalOpen(false);
      return;
    }

    try {
      setOtpLoading(true);
      const response = await verifyOTPAndSign(
        contractId,
        eSignSession.sessionId,
        otpCode
      );
      if (response?.status === 'success') {
        message.success(response.message || 'Contract signed successfully!');
        setOtpModalOpen(false);
        setSignatureData(null);
        setESignSession(null);
        setOtpError(null);
        setOtpExpiresAt(null);

        // Reload contract to get updated status
        await loadContract();

        // Fetch fresh contract data to ensure we have the latest signature URL
        // Wait a bit for state to update, then generate and upload PDF automatically
        setTimeout(async () => {
          try {
            message.loading('Generating and uploading PDF...', 0);

            // Fetch fresh contract data to ensure we have up-to-date contract information
            const freshContractResponse = await getContractById(contractId);
            const freshContractData =
              freshContractResponse?.status === 'success'
                ? freshContractResponse.data
                : contract;

            // Use fresh contract data to ensure signatures are included
            const pdfBlob = await generatePdfBlob(
              freshContractData,
              pricingBreakdown,
              requestDetails
            );
            const uploadSuccess = await uploadPdfToBackend(pdfBlob);
            message.destroy();

            if (uploadSuccess) {
              message.success('Contract PDF uploaded successfully!');
            } else {
              message.warning(
                'Contract signed but PDF upload failed. You can export PDF manually.'
              );
            }
          } catch (error) {
            console.error('Error generating/uploading PDF:', error);
            message.destroy();
            message.warning(
              'Contract signed but PDF generation failed. You can export PDF manually.'
            );
          }
        }, 1000); // Increased delay to ensure backend has processed the signature

        // Redirect to success page after a short delay
        setTimeout(() => {
          navigate(`/contracts/${contractId}/signed-success`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const errorMessage = error?.message || 'Invalid OTP. Please try again.';
      setOtpError(errorMessage);
      message.error(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!signatureData) {
      setOtpModalOpen(false);
      setSignaturePadModalOpen(true);
      return;
    }

    try {
      setOtpLoading(true);
      const response = await initESign(contractId, signatureData);
      if (response?.status === 'success' && response?.data) {
        const session = response.data;
        const expireAtMs = session.expireAt
          ? dayjs(session.expireAt).valueOf()
          : null;

        setESignSession(session);
        setOtpExpiresAt(expireAtMs);
        setMaxOtpAttempts(session.maxAttempts || 3);
        setOtpError(null);

        message.success(
          response.message || 'A new OTP has been sent to your email'
        );
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      message.error(
        error?.message || 'Failed to resend OTP. Please try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpCancel = () => {
    setOtpModalOpen(false);
    setOtpError(null);
    setESignSession(null);
    setSignatureData(null);
    setOtpExpiresAt(null);
  };

  // Handle cancel contract
  const handleCancel = async reason => {
    try {
      setCancelLoading(true);
      const response = await cancelContract(contractId, reason);
      if (response?.status === 'success') {
        message.success('Contract canceled successfully');
        setCancelModalOpen(false);
        loadContract();
      }
    } catch (error) {
      console.error('Error canceling contract:', error);
      message.error(error?.message || 'Failed to cancel contract');
      throw error; // Re-throw để modal không đóng
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle revision request
  const handleRevision = async reason => {
    try {
      setRevisionLoading(true);
      const response = await requestChangeContract(contractId, reason);
      if (response?.status === 'success') {
        message.success('Revision request sent successfully');
        setRevisionModalOpen(false);
        loadContract();
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
      message.error(error?.message || 'Failed to request revision');
      throw error; // Re-throw để modal không đóng
    } finally {
      setRevisionLoading(false);
    }
  };

  // Register Vietnamese font once (Be Vietnam Pro - supports Vietnamese)
  // Using local font files from public/fonts folder
  // NOTE: You need to download Be Vietnam Pro font files to public/fonts/ folder
  useEffect(() => {
    // Try to register font
    // Font will fallback to default if not found (error will be caught during PDF generation)
    try {
      Font.register({
        family: 'BeVietnamPro',
        fonts: [
          {
            src: '/fonts/BeVietnamPro-Regular.ttf',
            fontWeight: 'normal',
          },
          {
            src: '/fonts/BeVietnamPro-Bold.ttf',
            fontWeight: 'bold',
          },
        ],
      });
    } catch (error) {
      console.warn(
        'Failed to register Vietnamese font. PDF may not display Vietnamese correctly:',
        error
      );
      console.warn(
        'Please download Be Vietnam Pro font files to public/fonts/ folder. See public/fonts/README.md'
      );
    }
  }, []); // Only register once on mount

  // PDF Styles
  const pdfStyles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      lineHeight: 1.6,
      fontFamily: 'BeVietnamPro', // Required for Vietnamese text support
    },
    header: {
      marginBottom: 20,
      borderBottom: '2px solid #333',
      paddingBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#111', // Match preview text color
      marginBottom: 10,
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#111', // Match preview text color
    },
    text: {
      marginBottom: 5,
      color: '#111', // Match preview text color
    },
    row: {
      flexDirection: 'row',
      marginBottom: 5,
    },
    label: {
      fontWeight: 'bold',
      width: 150,
    },
    value: {
      flex: 1,
    },
    signatureRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 40,
      marginBottom: 20,
    },
    signatureBox: {
      width: '45%',
    },
    signatureLine: {
      borderBottom: '1px solid #333',
      marginBottom: 5,
      height: 30,
    },
    watermark: {
      position: 'absolute',
      top: 200,
      left: 100,
      fontSize: 60,
      color: '#c62828',
      opacity: 0.1,
      transform: 'rotate(-25deg)',
    },
    seal: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 130,
      height: 130,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sealInner: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    sealText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#c62828',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 3,
    },
    sealDate: {
      fontSize: 9,
      color: '#c62828',
      textAlign: 'center',
      opacity: 0.8,
    },
  });

  // Helper function to convert local image URL to base64
  const imageUrlToBase64 = url => {
    if (!url) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  // Contract PDF Document Component
  const ContractPdfDocument = ({
    contract,
    pricingBreakdown,
    statusConfig,
    partyASignatureBase64,
    partyBSignatureBase64,
    requestDetails,
  }) => (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Company Seal - Only show when signed or active */}
        {(() => {
          const contractStatus = contract?.status?.toLowerCase();
          const isSignedOrActive =
            contractStatus === 'signed' ||
            contractStatus === 'active' ||
            contractStatus === 'active_pending_assignment' ||
            contractStatus === 'completed';
          return isSignedOrActive;
        })() && (
          <View style={pdfStyles.seal}>
            <Svg
              width="130"
              height="130"
              style={{ position: 'absolute', transform: 'rotate(-8deg)' }}
            >
              {/* Outer circle - solid border */}
              <Circle
                cx="65"
                cy="65"
                r="63.5"
                stroke="#c62828"
                strokeWidth="3"
                fill="none"
              />
              {/* Inner circle - dashed border */}
              <Circle
                cx="65"
                cy="65"
                r="50"
                stroke="#c62828"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
              />
            </Svg>
            <View
              style={[
                pdfStyles.sealInner,
                { position: 'absolute', transform: 'rotate(-8deg)' },
              ]}
            >
              <PdfText style={pdfStyles.sealText}>MuTraPro Official</PdfText>
              <PdfText style={pdfStyles.sealDate}>
                {contract?.signedAt
                  ? dayjs(contract.signedAt).format('YYYY-MM-DD')
                  : dayjs().format('YYYY-MM-DD')}
              </PdfText>
            </View>
          </View>
        )}

        {/* Watermark - Only show if not signed or active */}
        {(() => {
          const contractStatus = contract?.status?.toLowerCase();
          const isSignedOrActive =
            contractStatus === 'signed' ||
            contractStatus === 'active' ||
            contractStatus === 'active_pending_assignment' ||
            contractStatus === 'completed';
          return !isSignedOrActive ? (
            <View style={pdfStyles.watermark}>
              <PdfText>{statusConfig?.text?.toUpperCase() || 'DRAFT'}</PdfText>
            </View>
          ) : null;
        })()}

        {/* Header */}
        <View style={pdfStyles.header}>
          <PdfText style={pdfStyles.title}>
            {getContractTitle(contract?.contractType)}
          </PdfText>
          <PdfText style={pdfStyles.text}>
            Contract Number: {contract?.contractNumber || 'N/A'}
          </PdfText>
          <PdfText style={pdfStyles.text}>
            Status: {statusConfig?.text || contract?.status}
          </PdfText>
        </View>

        {/* Parties */}
        <View style={pdfStyles.section}>
          <PdfText style={pdfStyles.sectionTitle}>Parties</PdfText>
          <PdfText style={pdfStyles.text}>
            <PdfText style={{ fontWeight: 'bold' }}>
              Party A (Provider):
            </PdfText>{' '}
            {API_CONFIG.PARTY_A_NAME}
          </PdfText>
          <PdfText style={pdfStyles.text}>
            <PdfText style={{ fontWeight: 'bold' }}>
              Party B (Customer):
            </PdfText>{' '}
            {contract?.nameSnapshot || 'N/A'}
            {contract?.phoneSnapshot && ` | Phone: ${contract.phoneSnapshot}`}
            {contract?.emailSnapshot && ` | Email: ${contract.emailSnapshot}`}
          </PdfText>
        </View>

        {/* Request Summary */}
        {requestDetails &&
          (requestDetails.title || requestDetails.description) && (
            <View style={pdfStyles.section}>
              <PdfText style={pdfStyles.sectionTitle}>Request Summary</PdfText>
              {requestDetails.title && (
                <PdfText style={pdfStyles.text}>
                  <PdfText style={{ fontWeight: 'bold' }}>Title:</PdfText>{' '}
                  {requestDetails.title}
                </PdfText>
              )}
              {requestDetails.description && (
                <PdfText style={pdfStyles.text}>
                  {requestDetails.description}
                </PdfText>
              )}
            </View>
          )}

        {/* Pricing */}
        <View style={pdfStyles.section}>
          <PdfText style={pdfStyles.sectionTitle}>Pricing & Payment</PdfText>

          {/* Price Breakdown Table */}
          {(pricingBreakdown?.transcriptionDetails ||
            pricingBreakdown?.instruments?.length > 0) && (
            <View
              style={{
                marginBottom: 10,
                border: '1px solid #000',
                backgroundColor: '#fff',
              }}
            >
              {/* Table Header */}
              <View
                style={{
                  flexDirection: 'row',
                  borderBottom: '1px solid #000',
                  backgroundColor: '#e8e8e8',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRight: '1px solid #000',
                  }}
                >
                  <PdfText style={{ fontWeight: 'bold' }}>Item</PdfText>
                </View>
                <View
                  style={{
                    width: 120,
                    padding: 10,
                    alignItems: 'flex-end',
                  }}
                >
                  <PdfText style={{ fontWeight: 'bold' }}>
                    Amount ({contract?.currency || 'VND'})
                  </PdfText>
                </View>
              </View>

              {/* Transcription Details Rows */}
              {pricingBreakdown?.transcriptionDetails?.breakdown?.map(
                (item, idx) => (
                  <View
                    key={`transcription-${idx}`}
                    style={{
                      flexDirection: 'row',
                      borderBottom:
                        idx <
                        pricingBreakdown.transcriptionDetails.breakdown.length -
                          1
                          ? '1px solid #000'
                          : pricingBreakdown?.instruments?.length > 0
                            ? '1px solid #000'
                            : 'none',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRight: '1px solid #000',
                      }}
                    >
                      <PdfText style={{ fontSize: 11 }}>{item.label}</PdfText>
                      {item.description && (
                        <PdfText
                          style={{
                            fontSize: 9,
                            color: '#666',
                            marginTop: 2,
                          }}
                        >
                          ({formatDescriptionDuration(item.description)})
                        </PdfText>
                      )}
                    </View>
                    <View
                      style={{
                        width: 120,
                        padding: 8,
                        alignItems: 'flex-end',
                      }}
                    >
                      <PdfText style={{ fontWeight: 'bold', fontSize: 11 }}>
                        {item.amount?.toLocaleString?.() ?? item.amount}
                      </PdfText>
                    </View>
                  </View>
                )
              )}

              {/* Instruments Section */}
              {pricingBreakdown?.instruments?.length > 0 && (
                <>
                  {/* Instruments Header Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      borderBottom: '1px solid #000',
                      backgroundColor: '#f0f0f0',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRight: '1px solid #000',
                      }}
                    >
                      <PdfText style={{ fontWeight: 'bold' }}>
                        Instruments Surcharge:
                      </PdfText>
                    </View>
                    <View style={{ width: 120, padding: 8 }} />
                  </View>

                  {/* Instrument Rows */}
                  {pricingBreakdown.instruments.map((instr, idx) => (
                    <View
                      key={`instrument-${idx}`}
                      style={{
                        flexDirection: 'row',
                        borderBottom:
                          idx < pricingBreakdown.instruments.length - 1
                            ? '1px solid #000'
                            : 'none',
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          padding: 8,
                          paddingLeft: 24,
                          borderRight: '1px solid #000',
                        }}
                      >
                        <PdfText style={{ fontSize: 11 }}>
                          • {instr.instrumentName}
                          {instr.isMain && 
                            (contract?.contractType === 'arrangement' || 
                             contract?.contractType === 'arrangement_with_recording') && 
                            ' (Main)'}
                        </PdfText>
                      </View>
                      <View
                        style={{
                          width: 120,
                          padding: 8,
                          alignItems: 'flex-end',
                        }}
                      >
                        <PdfText style={{ fontWeight: 'bold', fontSize: 11 }}>
                          {instr.basePrice?.toLocaleString?.() ??
                            instr.basePrice}
                        </PdfText>
                      </View>
                    </View>
                  ))}

                  {/* Instruments Total Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      borderTop: '1px solid #000',
                      backgroundColor: '#e8e8e8',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRight: '1px solid #000',
                      }}
                    >
                      <PdfText style={{ fontWeight: 'bold' }}>
                        Instruments Total:
                      </PdfText>
                    </View>
                    <View
                      style={{
                        width: 120,
                        padding: 8,
                        alignItems: 'flex-end',
                      }}
                    >
                      <PdfText style={{ fontWeight: 'bold' }}>
                        {pricingBreakdown.instruments
                          .reduce(
                            (sum, instr) => sum + (instr.basePrice || 0),
                            0
                          )
                          .toLocaleString()}
                      </PdfText>
                    </View>
                  </View>
                </>
              )}

              {/* Total Price Row */}
              <View
                style={{
                  flexDirection: 'row',
                  borderTop: '1px solid #000',
                  backgroundColor: '#e8e8e8',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRight: '1px solid #000',
                  }}
                >
                  <PdfText style={{ fontWeight: 'bold' }}>Total Price:</PdfText>
                </View>
                <View
                  style={{
                    width: 120,
                    padding: 8,
                    alignItems: 'flex-end',
                  }}
                >
                  <PdfText style={{ fontWeight: 'bold' }}>
                    {contract?.totalPrice?.toLocaleString()}{' '}
                    {contract?.currency || 'VND'}
                  </PdfText>
                </View>
              </View>
            </View>
          )}

          {/* Milestones Table */}
          {contract?.milestones && contract.milestones.length > 0 && (
            <View style={{ marginTop: 15, marginBottom: 10 }}>
              <PdfText style={pdfStyles.sectionTitle}>Milestones</PdfText>
              <View
                style={{
                  marginTop: 5,
                  border: '1px solid #000',
                  backgroundColor: '#fff',
                }}
              >
                {/* Table Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    borderBottom: '1px solid #000',
                    backgroundColor: '#e8e8e8',
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRight: '1px solid #000',
                    }}
                  >
                    <PdfText style={{ fontWeight: 'bold' }}>Milestone</PdfText>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRight: '1px solid #000',
                    }}
                  >
                    <PdfText style={{ fontWeight: 'bold' }}>
                      Description
                    </PdfText>
                  </View>
                  <View
                    style={{
                      width: 100,
                      padding: 10,
                      borderRight: '1px solid #000',
                      alignItems: 'center',
                    }}
                  >
                    <PdfText style={{ fontWeight: 'bold' }}>Payment %</PdfText>
                  </View>
                  <View
                    style={{
                      width: 80,
                      padding: 10,
                      alignItems: 'center',
                    }}
                  >
                    <PdfText style={{ fontWeight: 'bold' }}>SLA Days</PdfText>
                  </View>
                </View>

                {/* Milestone Rows */}
                {contract.milestones
                  .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                  .map((milestone, index) => {
                    // Find installment for this milestone
                    const installment = contract?.installments?.find(
                      inst => inst.milestoneId === milestone.milestoneId
                    );
                    const paymentPercent =
                      installment?.percent || milestone.paymentPercent;
                    const slaDays =
                      milestone.milestoneSlaDays || milestone.slaDays;

                    return (
                      <View
                        key={milestone.milestoneId || index}
                        style={{
                          flexDirection: 'row',
                          borderBottom:
                            index < contract.milestones.length - 1
                              ? '1px solid #000'
                              : 'none',
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRight: '1px solid #000',
                          }}
                        >
                          <PdfText style={{ fontWeight: 'bold', fontSize: 11 }}>
                            {milestone.name || `Milestone ${index + 1}`}
                          </PdfText>
                        </View>
                        <View
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRight: '1px solid #000',
                          }}
                        >
                          <PdfText style={{ fontSize: 10 }}>
                            {milestone.description || '-'}
                          </PdfText>
                        </View>
                        <View
                          style={{
                            width: 100,
                            padding: 10,
                            borderRight: '1px solid #000',
                            alignItems: 'center',
                          }}
                        >
                          <PdfText style={{ fontSize: 10 }}>
                            {paymentPercent ? `${paymentPercent}%` : 'N/A'}
                          </PdfText>
                        </View>
                        <View
                          style={{
                            width: 80,
                            padding: 10,
                            alignItems: 'center',
                          }}
                        >
                          <PdfText style={{ fontSize: 10 }}>
                            {slaDays ? `${slaDays} days` : '-'}
                          </PdfText>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          )}
        </View>
      </Page>

      {/* Page 2: Transcription Preferences and below */}
      <Page size="A4" style={pdfStyles.page}>
        {/* Transcription Preferences */}
        {contract?.contractType?.toLowerCase() === 'transcription' &&
          requestDetails?.tempoPercentage && (
            <View style={pdfStyles.section}>
              <PdfText style={pdfStyles.sectionTitle}>
                Transcription Preferences
              </PdfText>
              <PdfText style={pdfStyles.text}>
                Tempo Reference:{' '}
                {formatTempoPercentage(requestDetails.tempoPercentage)}
              </PdfText>
              {requestDetails?.durationMinutes && (
                <PdfText style={pdfStyles.text}>
                  Source Duration:{' '}
                  {formatDurationMMSS(requestDetails.durationMinutes)}
                </PdfText>
              )}
            </View>
          )}

        {/* Timeline */}
        <View style={pdfStyles.section}>
          <PdfText style={pdfStyles.sectionTitle}>Timeline & SLA</PdfText>
          <PdfText style={pdfStyles.text}>
            SLA Days: {contract?.slaDays || 0} days | Expected Start:{' '}
            {contract?.expectedStartDate
              ? dayjs(contract.expectedStartDate).format('YYYY-MM-DD')
              : 'Not scheduled (will be set when work starts)'}{' '}
            | Due Date:{' '}
            {(() => {
              // Get due date from last milestone's plannedDueDate (calculated by backend)
              if (contract?.milestones && contract.milestones.length > 0) {
                const lastMilestone =
                  contract.milestones[contract.milestones.length - 1];
                if (lastMilestone?.plannedDueDate) {
                  return dayjs(lastMilestone.plannedDueDate).format(
                    'YYYY-MM-DD'
                  );
                }
              }
              // No plannedDueDate yet (not calculated)
              return 'N/A';
            })()}
          </PdfText>
        </View>

        {/* Revision Policy */}
        <View style={pdfStyles.section}>
          <PdfText style={pdfStyles.sectionTitle}>Revision Policy</PdfText>
          <PdfText style={pdfStyles.text}>
            Free Revisions Included: {contract?.freeRevisionsIncluded || 0}
            {contract?.revisionDeadlineDays && (
              <>
                {' '}
                | Revision Deadline: {contract.revisionDeadlineDays} days after
                delivery
              </>
            )}
            {contract?.additionalRevisionFeeVnd && (
              <>
                {' '}
                | Additional Revision Fee:{' '}
                {contract.additionalRevisionFeeVnd.toLocaleString()} VND
              </>
            )}
          </PdfText>
        </View>

        {/* Terms & Conditions */}
        {contract?.termsAndConditions && (
          <View style={pdfStyles.section}>
            <PdfText style={pdfStyles.sectionTitle}>Terms & Conditions</PdfText>
            <PdfText style={pdfStyles.text}>
              {contract.termsAndConditions}
            </PdfText>
          </View>
        )}

        {/* Special Clauses */}
        {contract?.specialClauses && (
          <View style={pdfStyles.section}>
            <PdfText style={pdfStyles.sectionTitle}>Special Clauses</PdfText>
            <PdfText style={pdfStyles.text}>{contract.specialClauses}</PdfText>
          </View>
        )}

        {/* Signatures */}
        <View style={pdfStyles.signatureRow}>
          <View style={pdfStyles.signatureBox}>
            <PdfText style={{ fontWeight: 'bold', marginBottom: 5 }}>
              Party A Representative
            </PdfText>
            {(() => {
              const contractStatus = contract?.status?.toLowerCase();
              const isSignedOrActive =
                contractStatus === 'signed' ||
                contractStatus === 'active' ||
                contractStatus === 'active_pending_assignment' ||
                contractStatus === 'completed';
              return isSignedOrActive && partyASignatureBase64 ? (
                <>
                  <PdfImage
                    src={partyASignatureBase64}
                    style={{ width: 100, height: 50, marginBottom: 5 }}
                  />
                  <PdfText style={pdfStyles.text}>
                    CEO - MuTraPro Studio Co., Ltd
                  </PdfText>
                  <PdfText style={pdfStyles.text}>
                    Signed on:{' '}
                    {contract?.signedAt
                      ? formatDate(contract.signedAt)
                      : formatDate(contract?.sentAt)}
                  </PdfText>
                </>
              ) : isSignedOrActive && !partyASignatureBase64 ? (
                <>
                  <View style={pdfStyles.signatureLine} />
                  <PdfText style={pdfStyles.text}>
                    CEO - MuTraPro Studio Co., Ltd
                  </PdfText>
                  <PdfText style={pdfStyles.text}>
                    Signed on:{' '}
                    {contract?.signedAt
                      ? formatDate(contract.signedAt)
                      : formatDate(contract?.sentAt)}
                  </PdfText>
                </>
              ) : null;
            })()}
            {(() => {
              const contractStatus = contract?.status?.toLowerCase();
              const isSignedOrActive =
                contractStatus === 'signed' ||
                contractStatus === 'active' ||
                contractStatus === 'active_pending_assignment' ||
                contractStatus === 'completed';
              return !isSignedOrActive ? (
                <>
                  <View style={pdfStyles.signatureLine} />
                  <PdfText style={pdfStyles.text}>Name, Title</PdfText>
                </>
              ) : null;
            })()}
          </View>

          <View style={pdfStyles.signatureBox}>
            <PdfText style={{ fontWeight: 'bold', marginBottom: 5 }}>
              Party B Representative
            </PdfText>
            {(() => {
              const contractStatus = contract?.status?.toLowerCase();
              const isSignedOrActive =
                contractStatus === 'signed' ||
                contractStatus === 'active' ||
                contractStatus === 'active_pending_assignment' ||
                contractStatus === 'completed';
              return isSignedOrActive && partyBSignatureBase64 ? (
                <>
                  <PdfImage
                    src={partyBSignatureBase64}
                    style={{ width: 100, height: 50, marginBottom: 5 }}
                  />
                  <PdfText style={pdfStyles.text}>
                    {contract?.nameSnapshot || 'Customer'}
                  </PdfText>
                  <PdfText style={pdfStyles.text}>
                    Signed on:{' '}
                    {contract?.customerSignedAt
                      ? formatDate(contract.customerSignedAt)
                      : contract?.signedAt
                        ? formatDate(contract.signedAt)
                        : 'Pending'}
                  </PdfText>
                </>
              ) : isSignedOrActive && !partyBSignatureBase64 ? (
                <>
                  <View style={pdfStyles.signatureLine} />
                  <PdfText style={pdfStyles.text}>
                    {contract?.nameSnapshot || 'Customer'}
                  </PdfText>
                  <PdfText style={pdfStyles.text}>
                    Signed on:{' '}
                    {contract?.customerSignedAt
                      ? formatDate(contract.customerSignedAt)
                      : contract?.signedAt
                        ? formatDate(contract.signedAt)
                        : 'Pending'}
                  </PdfText>
                </>
              ) : (
                <>
                  <View style={pdfStyles.signatureLine} />
                  <PdfText style={pdfStyles.text}>Name, Title</PdfText>
                </>
              );
            })()}
          </View>
        </View>
      </Page>
    </Document>
  );

  // Handle export PDF
  const handleExportPdf = async () => {
    if (!contract) {
      message.error('Contract data not available');
      return;
    }

    try {
      message.loading('Generating PDF...', 0);

      const contractNumber =
        contract?.contractNumber || contract?.contractId || 'contract';
      const filename = `contract-${contractNumber}-${dayjs().format('YYYYMMDD')}.pdf`;

      // Generate PDF blob using helper function
      const blob = await generatePdfBlob(
        contract,
        pricingBreakdown,
        requestDetails
      );

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.destroy();
      message.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      message.destroy();
      message.error('Failed to export PDF. Please try again.');
    }
  };

  // Status config
  const getStatusConfig = status => {
    const configs = {
      draft: { color: 'default', text: 'Draft' },
      sent: { color: 'blue', text: 'Sent to Customer' },
      approved: { color: 'cyan', text: 'Approved - Waiting for Signature' },
      signed: { color: 'orange', text: 'Signed - Pending Deposit Payment' },
      active_pending_assignment: {
        color: 'gold',
        text: 'Deposit Paid - Pending Assignment',
      },
      active: { color: 'green', text: 'Active - Deposit Paid' },
      completed: { color: 'success', text: 'Completed - All Milestones Paid' },
      rejected_by_customer: { color: 'red', text: 'Rejected by Customer' },
      need_revision: { color: 'orange', text: 'Needs Revision' },
      canceled_by_customer: { color: 'red', text: 'Canceled by Customer' },
      canceled_by_manager: { color: 'volcano', text: 'Canceled by Manager' },
      expired: { color: 'default', text: 'Expired' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  // Preview header
  const header = useMemo(
    () => (
      <div className={styles.header}>
        <div>
          <div className={styles.brand}>MuTraPro</div>
          <div className={styles.tagline}>Contract Document</div>
        </div>
        <div className={styles.meta}>
          <div>
            Contract ID: {contract?.contractNumber || contract?.contractId}
          </div>
          <div>
            Generated:{' '}
            {contract?.createdAt
              ? dayjs(contract.createdAt).format('YYYY-MM-DD HH:mm')
              : ''}
          </div>
        </div>
      </div>
    ),
    [contract]
  );

  if (loading) {
    return (
      <div
        className={styles.page}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          className={styles.loading}
          style={{
            textAlign: 'center',
            padding: '50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading contract...</div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className={styles.page}>
        <Alert
          message="Error Loading Contract"
          description={error || 'Contract not found'}
          type="error"
          showIcon
          action={<Button onClick={() => navigate(-1)}>Go Back</Button>}
        />
      </div>
    );
  }

  const statusConfig = getStatusConfig(contract.status);
  const currentStatus = contract.status?.toLowerCase();

  // Determine available actions based on status
  const isSent = currentStatus === 'sent';
  const isApproved = currentStatus === 'approved';
  const isSigned = currentStatus === 'signed';
  const isActive =
    currentStatus === 'active' || currentStatus === 'active_pending_assignment';
  const isCompleted = currentStatus === 'completed';
  const isCanceled =
    currentStatus === 'canceled_by_customer' ||
    currentStatus === 'canceled_by_manager';
  const isNeedRevision = currentStatus === 'need_revision';
  const isExpired = currentStatus === 'expired';

  // Contract is signed or active - milestones can be paid (but not if canceled, expired, or completed)
  // Also check if contract has been signed to show signature
  const canPayMilestones =
    (isSigned || isActive) && !isCanceled && !isExpired && !isCompleted;

  // Show signature if contract has been signed (regardless of current status for display purposes)
  const hasSigned =
    contract?.customerSignedAt || isSigned || isActive || isCompleted;

  // Show Party A signature when contract is signed/active/completed (same logic as PDF)
  const shouldShowPartyASignature = isSigned || isActive || isCompleted;

  // Customer can take action when contract is SENT
  const canCustomerAction = isSent;
  const canSign = isApproved;
  const canViewReason = isCanceled || isNeedRevision;

  return (
    <div className={styles.page}>
      <Header />
      {/* LEFT SECTION: Contract Info & Actions */}
      <div className={styles.infoSection}>
        <Card className={styles.infoCard}>
          {/* Back button */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/my-requests/${contract.requestId}`)}
            style={{ marginBottom: 16 }}
          >
            Back to Request
          </Button>

          <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
            Contract Details
          </Title>

          {/* Status Alert */}
          {isApproved && (
            <Alert
              message="Contract Approved"
              description="You have approved this contract. Please sign to proceed. After signing, you need to pay the deposit to start the work."
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isSigned && (
            <Alert
              message="Contract Signed"
              description="The contract has been signed. Please pay the deposit milestone to start the work. The start date will be calculated from the deposit payment date."
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isCanceled && (
            <Alert
              message="Contract Canceled"
              description="This contract has been canceled."
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              action={
                canViewReason && (
                  <Button
                    size="small"
                    onClick={() => setViewReasonModalOpen(true)}
                  >
                    View Reason
                  </Button>
                )
              }
            />
          )}

          {isExpired && (
            <Alert
              message="Contract Expired"
              description="This contract has expired. Please contact support if you need assistance."
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isNeedRevision && (
            <Alert
              message="Revision Requested"
              description="You have requested revisions to this contract. The manager will create a new version."
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              action={
                canViewReason && (
                  <Button
                    size="small"
                    onClick={() => setViewReasonModalOpen(true)}
                  >
                    View Reason
                  </Button>
                )
              }
            />
          )}

          {/* Contract Metadata */}
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Contract ID">
              <Text
                copyable={{ text: contract.contractId }}
                style={{
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  display: 'block',
                }}
              >
                {contract.contractId}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Contract Number">
              <Text strong>{contract.contractNumber || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag
                color={statusConfig.color}
                style={{
                  whiteSpace: 'normal',
                  lineHeight: 2,
                  textAlign: 'center',
                  minWidth: 0,
                  display: 'inline-block',
                }}
              >
                {statusConfig.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Contract Type">
              <Tag color="blue">
                {contract.contractType?.toUpperCase() || 'N/A'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Price">
              <Text strong>
                {contract.totalPrice?.toLocaleString()}{' '}
                {contract.currency || 'VND'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="SLA Days">
              {contract.slaDays || 0} days
            </Descriptions.Item>
            {contract.expectedStartDate && (
              <Descriptions.Item label="Expected Start">
                {dayjs(contract.expectedStartDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
            {(() => {
              // Get due date from last milestone's plannedDueDate (calculated by backend)
              if (contract?.milestones && contract.milestones.length > 0) {
                const lastMilestone =
                  contract.milestones[contract.milestones.length - 1];
                if (lastMilestone?.plannedDueDate) {
                  return (
                    <Descriptions.Item label="Due Date">
                      {dayjs(lastMilestone.plannedDueDate).format('YYYY-MM-DD')}
                    </Descriptions.Item>
                  );
                }
              }
              // No plannedDueDate yet (not calculated)
              return (
                <Descriptions.Item label="Due Date">
                  <Text type="secondary" italic>
                    N/A
                  </Text>
                </Descriptions.Item>
              );
            })()}
            {!contract.expectedStartDate && (
              <Descriptions.Item label="Expected Start">
                <Text type="secondary" italic>
                  Not scheduled (will be set when work starts)
                </Text>
              </Descriptions.Item>
            )}
            {contract.sentToCustomerAt && (
              <Descriptions.Item label="Sent At">
                {dayjs(contract.sentToCustomerAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.expiresAt && (
              <Descriptions.Item label="Expires At">
                {dayjs(contract.expiresAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.customerReviewedAt && (
              <Descriptions.Item label="Reviewed At">
                {dayjs(contract.customerReviewedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.signedAt && (
              <Descriptions.Item label="Signed At">
                {dayjs(contract.signedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Free Revisions Included">
              {contract.freeRevisionsIncluded || 0}
            </Descriptions.Item>
            {revisionStats && (
              <>
                <Descriptions.Item label="Revisions Used">
                  <Text strong>
                    {revisionStats.totalRevisionsUsed} /{' '}
                    {revisionStats.freeRevisionsIncluded} (Free)
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      display: 'block',
                      marginTop: 4,
                    }}
                  >
                    Đã dùng {revisionStats.freeRevisionsUsed} lần revision free,{' '}
                    {revisionStats.paidRevisionsUsed} lần revision có phí
                  </Text>
                </Descriptions.Item>
                {revisionStats.freeRevisionsRemaining != null && (
                  <Descriptions.Item label="Free Revisions Remaining">
                    <Text strong>{revisionStats.freeRevisionsRemaining}</Text>
                  </Descriptions.Item>
                )}
              </>
            )}
            {contract.additionalRevisionFeeVnd && (
              <Descriptions.Item label="Additional Revision Fee">
                {contract.additionalRevisionFeeVnd.toLocaleString()} VND
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          {/* DEPOSIT Section - Hiển thị riêng */}
          {contract?.installments &&
            (() => {
              const depositInstallment = contract.installments.find(
                inst => inst.type === 'DEPOSIT'
              );
              if (!depositInstallment) return null;

              const depositStatus = depositInstallment.status || 'PENDING';
              const isDepositPaid = depositStatus === 'PAID';
              const isDepositDue = depositStatus === 'DUE';

              return (
                <>
                  <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
                    Deposit Payment
                  </Title>
                  <Card
                    size="small"
                    style={{
                      borderLeft: isDepositPaid
                        ? '4px solid #52c41a'
                        : isDepositDue
                          ? '4px solid #faad14'
                          : '4px solid #d9d9d9',
                      marginBottom: 16,
                    }}
                  >
                    <Space
                      direction="vertical"
                      style={{ width: '100%' }}
                      size="small"
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 16 }}>
                            Deposit ({depositInstallment.percent}%)
                          </Text>
                          <div style={{ marginTop: 8, marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Initial deposit payment required to activate the
                              contract
                            </Text>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 16 }}>
                          <Text
                            strong
                            style={{ fontSize: 16, color: '#1890ff' }}
                          >
                            {depositInstallment.amount?.toLocaleString()}{' '}
                            {depositInstallment.currency ||
                              contract?.currency ||
                              'VND'}
                          </Text>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 8,
                        }}
                      >
                        <Space size="small">
                          <Tag
                            color={
                              isDepositPaid
                                ? 'success'
                                : isDepositDue
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            Payment:{' '}
                            {isDepositPaid
                              ? 'PAID'
                              : isDepositDue
                                ? 'DUE'
                                : 'PENDING'}
                          </Tag>
                          {depositInstallment.paidAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Paid:{' '}
                              {dayjs(depositInstallment.paidAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Text>
                          )}
                          {depositInstallment.dueDate && !isDepositPaid && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Due:{' '}
                              {dayjs(depositInstallment.dueDate).format(
                                'DD/MM/YYYY'
                              )}
                            </Text>
                          )}
                        </Space>

                        {isDepositDue && !isDepositPaid && canPayMilestones && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<DollarOutlined />}
                            onClick={() =>
                              navigate(`/contracts/${contractId}/pay-deposit`)
                            }
                          >
                            Pay Deposit
                          </Button>
                        )}
                        {isDepositDue &&
                          !isDepositPaid &&
                          !canPayMilestones && (
                            <Tag color="default">Waiting for signature</Tag>
                          )}
                        {isDepositPaid && (
                          <Tag color="success" icon={<CheckOutlined />}>
                            Paid
                          </Tag>
                        )}
                      </div>
                    </Space>
                  </Card>
                  <Divider />
                </>
              );
            })()}

          {/* Milestones Section - Show when milestones exist */}
          {contract?.milestones && contract.milestones.length > 0 && (
            <>
              <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
                Payment Milestones
              </Title>
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                {contract.milestones
                  .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                  .map((milestone, index) => {
                    // Chỉ hiển thị installment của milestone này (không hiển thị DEPOSIT)
                    const targetInstallment = milestone.hasPayment
                      ? contract?.installments?.find(
                          inst => inst.milestoneId === milestone.milestoneId
                        )
                      : null;

                    const workStatus = milestone.workStatus || 'PLANNED';
                    const installmentStatus =
                      targetInstallment?.status || 'PENDING';
                    const isPaid = installmentStatus === 'PAID';
                    const isDue = installmentStatus === 'DUE';

                    const getPaymentStatusColor = () => {
                      if (isPaid) return 'success';
                      if (isDue) return 'warning';
                      return 'default';
                    };

                    const getPaymentStatusText = () => {
                      if (isPaid) return 'PAID';
                      if (isDue) return 'DUE';
                      return 'PENDING';
                    };

                    const getWorkStatusColor = () => {
                      switch (workStatus) {
                        case 'PLANNED':
                          return 'default';
                        case 'READY_TO_START':
                          return 'cyan';
                        case 'IN_PROGRESS':
                          return 'processing';
                        case 'WAITING_CUSTOMER':
                          return 'warning';
                        case 'READY_FOR_PAYMENT':
                          return 'cyan';
                        case 'COMPLETED':
                          return 'success';
                        case 'CANCELLED':
                          return 'error';
                        default:
                          return 'default';
                      }
                    };

                    const getWorkStatusText = () => {
                      switch (workStatus) {
                        case 'PLANNED':
                          return 'Đã lên kế hoạch';
                        case 'READY_TO_START':
                          return 'Sẵn sàng bắt đầu';
                        case 'IN_PROGRESS':
                          return 'Đang thực hiện';
                        case 'WAITING_CUSTOMER':
                          return 'Chờ khách hàng phản hồi';
                        case 'READY_FOR_PAYMENT':
                          return 'Sẵn sàng thanh toán';
                        case 'COMPLETED':
                          return 'Hoàn thành';
                        case 'CANCELLED':
                          return 'Đã hủy';
                        default:
                          return workStatus;
                      }
                    };

                    return (
                      <Card
                        key={milestone.milestoneId || index}
                        size="small"
                        style={{
                          borderLeft: isPaid
                            ? '4px solid #52c41a'
                            : isDue
                              ? '4px solid #faad14'
                              : '4px solid #d9d9d9',
                        }}
                      >
                        <Space
                          direction="vertical"
                          style={{ width: '100%' }}
                          size="small"
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 16 }}>
                                  {milestone.name ||
                                    `Milestone ${milestone.orderIndex || index + 1}`}
                                </Text>
                                {(milestone.milestoneSlaDays || milestone.slaDays) && (
                                  <Tag color="blue" style={{ margin: 0 }}>
                                    SLA: {milestone.milestoneSlaDays || milestone.slaDays} days
                                  </Tag>
                                )}
                              </div>
                              {milestone.description && (
                                <div style={{ marginTop: 8, marginBottom: 8 }}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 13 }}
                                  >
                                    {milestone.description}
                                  </Text>
                                </div>
                              )}
                            </div>
                            {targetInstallment && (
                              <div
                                style={{ textAlign: 'right', marginLeft: 16 }}
                              >
                                <Text
                                  strong
                                  style={{ fontSize: 16, color: '#1890ff' }}
                                >
                                  {targetInstallment.amount?.toLocaleString()}{' '}
                                  {targetInstallment.currency ||
                                    contract?.currency ||
                                    'VND'}
                                </Text>
                                {targetInstallment.percent && (
                                  <div>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: 12 }}
                                    >
                                      ({targetInstallment.percent}%)
                                    </Text>
                                  </div>
                                )}
                              </div>
                            )}
                            {!targetInstallment &&
                              milestone.hasPayment === false && (
                                <div
                                  style={{ textAlign: 'right', marginLeft: 16 }}
                                >
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 14 }}
                                  >
                                    No payment required
                                  </Text>
                                </div>
                              )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 8,
                            }}
                          >
                            <Space size="small">
                              <Tag color={getWorkStatusColor()}>
                                Status: {getWorkStatusText()}
                              </Tag>
                              {targetInstallment?.paidAt && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Paid:{' '}
                                  {dayjs(targetInstallment.paidAt).format(
                                    'DD/MM/YYYY HH:mm'
                                  )}
                                </Text>
                              )}
                              {targetInstallment?.dueDate && !isPaid && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Due:{' '}
                                  {dayjs(targetInstallment.dueDate).format(
                                    'DD/MM/YYYY'
                                  )}
                                </Text>
                              )}
                            </Space>

                            {isDue &&
                              !isPaid &&
                              canPayMilestones &&
                              targetInstallment && (
                                <>
                                  {/* Milestone chỉ có thể thanh toán khi work status = READY_FOR_PAYMENT hoặc COMPLETED */}
                                  {workStatus === 'READY_FOR_PAYMENT' ||
                                  workStatus === 'COMPLETED' ? (
                                    <Button
                                      type="primary"
                                      size="small"
                                      icon={<DollarOutlined />}
                                      onClick={() =>
                                        navigate(
                                          `/contracts/${contractId}/pay-milestone`,
                                          {
                                            state: {
                                              milestoneId:
                                                milestone.milestoneId,
                                              orderIndex: milestone.orderIndex,
                                              installmentId:
                                                targetInstallment?.installmentId,
                                            },
                                          }
                                        )
                                      }
                                    >
                                      Pay Now
                                    </Button>
                                  ) : (
                                    <Tag color="default">
                                      Waiting for work completion
                                    </Tag>
                                  )}
                                </>
                              )}
                            {isDue && !isPaid && !canPayMilestones && (
                              <Tag color="default">Waiting for signature</Tag>
                            )}
                            {isPaid && targetInstallment && (
                              <Tag color="success" icon={<CheckOutlined />}>
                                Paid
                              </Tag>
                            )}
                            {!targetInstallment &&
                              milestone.hasPayment === false && (
                                <Tag color="default">No payment required</Tag>
                              )}
                          </div>

                          {/* View Deliveries Button - chỉ hiển thị khi milestone có work status WAITING_CUSTOMER, READY_FOR_PAYMENT, hoặc COMPLETED */}
                          {(workStatus === 'WAITING_CUSTOMER' ||
                            workStatus === 'READY_FOR_PAYMENT' ||
                            workStatus === 'COMPLETED') && (
                            <div style={{ marginTop: 12 }}>
                              <Button
                                icon={<EyeOutlined />}
                                size="small"
                                onClick={() =>
                                  navigate(
                                    `/contracts/${contractId}/milestones/${milestone.milestoneId}/deliveries`,
                                    {
                                      state: {
                                        milestoneName:
                                          milestone.name ||
                                          `Milestone ${milestone.orderIndex || index + 1}`,
                                      },
                                    }
                                  )
                                }
                              >
                                View Deliveries
                              </Button>
                            </div>
                          )}
                        </Space>
                      </Card>
                    );
                  })}
              </Space>
              <Divider />
            </>
          )}

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {canCustomerAction && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleApprove}
                  loading={approveLoading}
                  disabled={cancelLoading || revisionLoading}
                  block
                  size="large"
                >
                  Approve Contract
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setRevisionModalOpen(true)}
                  disabled={approveLoading || cancelLoading || revisionLoading}
                  block
                >
                  Request Revision
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setCancelModalOpen(true)}
                  disabled={approveLoading || cancelLoading || revisionLoading}
                  block
                >
                  Cancel Contract
                </Button>
              </>
            )}

            {canSign && (
              <Button
                type="primary"
                icon={<FormOutlined />}
                onClick={handleStartESign}
                loading={signatureLoading || otpLoading}
                block
                size="large"
              >
                E-Sign Contract
              </Button>
            )}

            {/* Pay Deposit button removed - use Pay Now in Payment Milestones section instead */}

            {canViewReason && (
              <Button
                icon={<EyeOutlined />}
                onClick={() => setViewReasonModalOpen(true)}
                block
              >
                View {isCanceled ? 'Cancellation' : 'Revision'} Reason
              </Button>
            )}
          </Space>
        </Card>
      </div>

      {/* RIGHT SECTION: Contract Preview */}
      <div className={styles.previewSection}>
        <Card className={styles.previewCard}>
          <div className={styles.previewToolbar}>
            <Title level={5} style={{ margin: 0 }}>
              Contract Preview
            </Title>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportPdf}
              size="small"
            >
              Export PDF
            </Button>
          </div>

          <div className={styles.preview} ref={previewRef}>
            {header}
            <div className={styles.doc}>
              {/* Watermark - Always show except when signed or active */}
              {!canPayMilestones && (
                <div className={styles.watermark}>
                  {statusConfig.text.toUpperCase()}
                </div>
              )}

              {canPayMilestones && (
                <div className={`${styles.seal} ${styles.seal_red}`}>
                  <div className={styles.sealInner}>
                    <div className={styles.sealText}>MuTraPro Official</div>
                    <div className={styles.sealDate}>
                      {contract.signedAt
                        ? dayjs(contract.signedAt).format('YYYY-MM-DD')
                        : dayjs().format('YYYY-MM-DD')}
                    </div>
                  </div>
                </div>
              )}

              <h1 className={styles.docTitle}>
                {getContractTitle(contract.contractType)}
              </h1>
              <p>
                <strong>Contract Number:</strong>{' '}
                {contract.contractNumber || 'N/A'}
                <br />
                <strong>Status:</strong> {statusConfig.text}
              </p>

              <h3>Parties</h3>
              <p>
                <strong>Party A (Provider):</strong> {API_CONFIG.PARTY_A_NAME}
                <br />
                <strong>Party B (Customer):</strong>{' '}
                {contract.nameSnapshot || contract.userId || 'N/A'}
                {contract.phoneSnapshot &&
                  contract.phoneSnapshot !== 'N/A' &&
                  ` | Phone: ${contract.phoneSnapshot}`}
                {contract.emailSnapshot &&
                  contract.emailSnapshot !== 'N/A' &&
                  ` | Email: ${contract.emailSnapshot}`}
              </p>

              {/* Request Summary */}
              {requestDetails &&
                (requestDetails.title || requestDetails.description) && (
                  <>
                    <h3>Request Summary</h3>
                    {requestDetails.title && (
                      <p>
                        <strong>Title:</strong> {requestDetails.title}
                      </p>
                    )}
                    {requestDetails.description && (
                      <p style={{ whiteSpace: 'pre-line' }}>
                        {requestDetails.description}
                      </p>
                    )}
                    
                    {/* Arrangement-specific fields */}
                    {(requestDetails.requestType === 'arrangement' ||
                      requestDetails.requestType === 'arrangement_with_recording') && (
                      <>
                        {requestDetails.genres && requestDetails.genres.length > 0 && (
                          <p>
                            <strong>Genres:</strong>{' '}
                            {requestDetails.genres.map(genre => getGenreLabel(genre)).join(', ')}
                          </p>
                        )}
                        {requestDetails.purpose && (
                          <p>
                            <strong>Purpose:</strong> {getPurposeLabel(requestDetails.purpose)}
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}

              <h3>Pricing & Payment</h3>

              {/* Pricing Breakdown */}
              {(pricingBreakdown.transcriptionDetails ||
                pricingBreakdown.instruments.length > 0 ||
                (requestDetails?.servicePrice && 
                 (requestDetails.requestType === 'arrangement' || 
                  requestDetails.requestType === 'arrangement_with_recording'))) && (
                <div
                  style={{
                    marginBottom: '16px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px',
                      border: '1px solid #000',
                      backgroundColor: '#fff',
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '10px',
                            textAlign: 'left',
                            backgroundColor: '#e8e8e8',
                            fontWeight: 'bold',
                          }}
                        >
                          Item
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '10px',
                            textAlign: 'right',
                            backgroundColor: '#e8e8e8',
                            fontWeight: 'bold',
                            width: '150px',
                          }}
                        >
                          Amount ({contract.currency || 'VND'})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Transcription Details */}
                      {pricingBreakdown.transcriptionDetails?.breakdown?.map(
                        (item, index) => (
                          <tr key={`transcription-${index}`}>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '8px',
                                backgroundColor: '#fff',
                              }}
                            >
                              {item.label}
                              {item.description && (
                                <div
                                  style={{
                                    color: '#666',
                                    fontSize: '12px',
                                    marginTop: '4px',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  ({formatDescriptionDuration(item.description)}
                                  )
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '8px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                backgroundColor: '#fff',
                              }}
                            >
                              {item.amount?.toLocaleString?.() ?? item.amount}
                            </td>
                          </tr>
                        )
                      )}

                      {/* Service Price for Arrangement */}
                      {requestDetails?.servicePrice && 
                       (requestDetails.requestType === 'arrangement' || 
                        requestDetails.requestType === 'arrangement_with_recording') && (
                        <tr>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '8px',
                              fontWeight: 'bold',
                              backgroundColor: '#fff',
                            }}
                          >
                            Arrangement Service
                          </td>
                          <td
                            style={{
                              border: '1px solid #000',
                              padding: '8px',
                              textAlign: 'right',
                              fontWeight: 'bold',
                              backgroundColor: '#fff',
                            }}
                          >
                            {Number(requestDetails.servicePrice)?.toLocaleString?.() ?? requestDetails.servicePrice}
                          </td>
                        </tr>
                      )}

                      {/* Instruments */}
                      {pricingBreakdown.instruments.length > 0 && (
                        <>
                          <tr>
                            <td
                              colSpan={2}
                              style={{
                                border: '1px solid #000',
                                padding: '8px',
                                fontWeight: 'bold',
                                backgroundColor: '#f0f0f0',
                              }}
                            >
                              Instruments Surcharge:
                            </td>
                          </tr>
                          {pricingBreakdown.instruments.map((instr, index) => (
                            <tr key={`instrument-${index}`}>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  paddingLeft: '24px',
                                  backgroundColor: '#fff',
                                }}
                              >
                                • {instr.instrumentName}
                                {instr.isMain && 
                                  (contract?.contractType === 'arrangement' || 
                                   contract?.contractType === 'arrangement_with_recording') && 
                                  ' (Main)'}
                              </td>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  textAlign: 'right',
                                  fontWeight: 'bold',
                                  backgroundColor: '#fff',
                                }}
                              >
                                {instr.basePrice?.toLocaleString?.() ??
                                  instr.basePrice}
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '8px',
                                fontWeight: 'bold',
                                backgroundColor: '#e8e8e8',
                              }}
                            >
                              Instruments Total:
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '8px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                backgroundColor: '#e8e8e8',
                              }}
                            >
                              {pricingBreakdown.instruments
                                .reduce(
                                  (sum, instr) => sum + (instr.basePrice || 0),
                                  0
                                )
                                .toLocaleString()}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                  border: '1px solid #000',
                  backgroundColor: '#fff',
                  marginTop: '16px',
                  marginBottom: '16px',
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '10px',
                        fontWeight: 'bold',
                        backgroundColor: '#e8e8e8',
                      }}
                    >
                      Total Price
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '10px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        backgroundColor: '#fff',
                      }}
                    >
                      {contract.totalPrice?.toLocaleString?.() ??
                        contract.totalPrice}{' '}
                      {contract.currency || 'VND'}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '10px',
                        fontWeight: 'bold',
                        backgroundColor: '#e8e8e8',
                      }}
                    >
                      Deposit (
                      {(() => {
                        const depositInstallment = contract?.installments?.find(
                          inst => inst.type === 'DEPOSIT'
                        );
                        return (
                          depositInstallment?.percent ||
                          contract?.depositPercent ||
                          0
                        );
                      })()}
                      %)
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '10px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        backgroundColor: '#fff',
                      }}
                    >
                      {(() => {
                        const depositInstallment = contract?.installments?.find(
                          inst => inst.type === 'DEPOSIT'
                        );
                        const depositPercent =
                          depositInstallment?.percent ||
                          contract?.depositPercent ||
                          0;
                        const totalPrice = contract?.totalPrice || 0;
                        const depositAmount =
                          depositInstallment?.amount &&
                          depositInstallment.amount > 0
                            ? depositInstallment.amount
                            : (totalPrice * depositPercent) / 100;
                        return depositAmount?.toLocaleString();
                      })()}{' '}
                      {contract.currency || 'VND'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {contract.contractType?.toLowerCase() === 'transcription' &&
                requestDetails?.tempoPercentage && (
                  <>
                    <h3>Transcription Preferences</h3>
                    <p>
                      <strong>Tempo Reference:</strong>{' '}
                      {formatTempoPercentage(requestDetails.tempoPercentage)}
                      {requestDetails?.durationMinutes && (
                        <>
                          &nbsp;|&nbsp;
                          <strong>Source Duration:</strong>{' '}
                          {formatDurationMMSS(requestDetails.durationMinutes)}
                        </>
                      )}
                    </p>
                  </>
                )}

              {/* Milestones */}
              {contract?.milestones && contract.milestones.length > 0 && (
                <>
                  <h3>Milestones</h3>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '16px',
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '10px',
                            backgroundColor: '#e8e8e8',
                            textAlign: 'left',
                          }}
                        >
                          Milestone
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '10px',
                            backgroundColor: '#e8e8e8',
                            textAlign: 'left',
                          }}
                        >
                          Description
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '10px',
                            backgroundColor: '#e8e8e8',
                            textAlign: 'center',
                          }}
                        >
                          Payment %
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '10px',
                            backgroundColor: '#e8e8e8',
                            textAlign: 'center',
                          }}
                        >
                          SLA Days
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.milestones
                        .sort(
                          (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
                        )
                        .map((milestone, index) => (
                          <tr key={milestone.milestoneId || index}>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                              }}
                            >
                              <strong>
                                {milestone.name || `Milestone ${index + 1}`}
                              </strong>
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                                whiteSpace: 'pre-line',
                              }}
                            >
                              {milestone.description || '-'}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                                textAlign: 'center',
                              }}
                            >
                              {(() => {
                                // Find installment for this milestone
                                const installment =
                                  contract?.installments?.find(
                                    inst =>
                                      inst.milestoneId === milestone.milestoneId
                                  );
                                return (
                                  installment?.percent ||
                                  milestone.paymentPercent ||
                                  'N/A'
                                );
                              })()}
                              {(() => {
                                const installment =
                                  contract?.installments?.find(
                                    inst =>
                                      inst.milestoneId === milestone.milestoneId
                                  );
                                return installment?.percent ||
                                  milestone.paymentPercent
                                  ? '%'
                                  : '';
                              })()}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '10px',
                                textAlign: 'center',
                              }}
                            >
                              {milestone.milestoneSlaDays ||
                                milestone.slaDays ||
                                '-'}{' '}
                              days
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}

              <h3>Timeline & SLA</h3>
              <p>
                <strong>SLA Days (Service Level Agreement):</strong>{' '}
                {contract.slaDays || 0} days
                {contract.slaDays > 0 && (
                  <>
                    {' '}
                    | <strong>Due:</strong> After {contract.slaDays} days if
                    payment is on time
                  </>
                )}
              </p>

              {contract.termsAndConditions && (
                <>
                  <h3>Terms & Conditions</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {contract.termsAndConditions}
                  </p>
                </>
              )}

              {contract.specialClauses && (
                <>
                  <h3>Special Clauses</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>
                    {contract.specialClauses}
                  </p>
                </>
              )}
              <Divider />
              <div className={styles.signRow}>
                <div>
                  <div className={styles.sigLabel}>Party A Representative</div>
                  {shouldShowPartyASignature ? (
                    <>
                      <div className={styles.signature}>
                        <img
                          src="/images/signature.png"
                          alt="Party A Signature"
                          style={{
                            height: '50px',
                            width: 'auto',
                            marginTop: '8px',
                            marginBottom: '8px',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: '4px',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#333',
                        }}
                      >
                        CEO - MuTraPro Studio Co., Ltd
                      </div>
                      <div
                        className={styles.sigHint}
                        style={{ marginTop: '4px' }}
                      >
                        Signed on:{' '}
                        {contract.signedAt
                          ? formatDate(contract.signedAt)
                          : formatDate(contract.sentAt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.sigLine} />
                      <div className={styles.sigHint}>Name, Title</div>
                    </>
                  )}
                </div>
                <div>
                  <div className={styles.sigLabel}>Party B Representative</div>
                  {hasSigned ? (
                    <>
                      {partyBSignatureUrl ? (
                        <div
                          className={styles.signature}
                          style={{ marginTop: '12px' }}
                        >
                          <img
                            src={partyBSignatureUrl}
                            alt="Party B Signature"
                            style={{
                              height: '50px',
                              width: 'auto',
                              marginTop: '8px',
                              marginBottom: '8px',
                              display: 'block',
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className={styles.sigLine}
                          style={{ marginTop: '16px' }}
                        />
                      )}
                      <div
                        style={{
                          marginTop: '4px',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#333',
                        }}
                      >
                        {contract.nameSnapshot || 'Customer'}
                      </div>
                      <div
                        className={styles.sigHint}
                        style={{ marginTop: '4px' }}
                      >
                        Signed on:{' '}
                        {contract.customerSignedAt
                          ? formatDate(contract.customerSignedAt)
                          : contract.signedAt
                            ? formatDate(contract.signedAt)
                            : 'Pending'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.sigLine} />
                      <div className={styles.sigHint}>Name, Title</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <SignaturePadModal
        visible={signaturePadModalOpen}
        onCancel={handleSignatureCancel}
        onConfirm={handleSignatureConfirm}
        loading={signatureLoading}
      />

      <OTPVerificationModal
        visible={otpModalOpen}
        onCancel={handleOtpCancel}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        loading={otpLoading}
        error={otpError}
        expiresAt={otpExpiresAt}
        maxAttempts={maxOtpAttempts}
        email={contract?.emailSnapshot || ''}
      />

      <CancelContractModal
        visible={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onConfirm={handleCancel}
        loading={cancelLoading}
        isManager={false}
        isDraft={false}
      />

      <RevisionRequestModal
        open={revisionModalOpen}
        onCancel={() => setRevisionModalOpen(false)}
        onConfirm={handleRevision}
        loading={revisionLoading}
      />

      {canViewReason && (
        <ViewCancellationReasonModal
          open={viewReasonModalOpen}
          onCancel={() => setViewReasonModalOpen(false)}
          reason={contract.cancellationReason || 'No reason provided'}
          isCanceled={isCanceled}
        />
      )}

      {/* Chat Popup - Facebook Messenger style */}
      {/* 
        Logic: 
        - Contract chat room chỉ được tạo khi contract được signed
        - Nếu contract đã signed (signed, active_pending_assignment, active, expired) 
          → contract chat room đã được tạo, request chat room đã bị đóng
          → Hiển thị CONTRACT_CHAT
        - Nếu contract chưa signed (draft, sent, approved, rejected_by_customer, 
          need_revision, canceled_by_customer, canceled_by_manager)
          → chỉ có request chat room
          → Hiển thị REQUEST_CHAT
      */}
      {contract?.contractId &&
      (contract?.status?.toLowerCase() === 'signed' ||
        contract?.status?.toLowerCase() === 'active_pending_assignment' ||
        contract?.status?.toLowerCase() === 'active' ||
        contract?.status?.toLowerCase() === 'completed') ? (
        /* Contract chat (after contract signed) - contextType = GENERAL, contextId = null */
        <ChatPopup
          contractId={contract.contractId}
          roomType="CONTRACT_CHAT"
          contextType="GENERAL"
          contextId={null}
        />
      ) : contract?.requestId ? (
        /* Request chat (before contract signed) */
        <ChatPopup requestId={contract.requestId} roomType="REQUEST_CHAT" />
      ) : null}
    </div>
  );
};

export default ContractDetailPage;
