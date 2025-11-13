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
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FormOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Document, Page, Text as PdfText, View, StyleSheet, pdf, Image as PdfImage, Font, Svg, Circle, Path } from '@react-pdf/renderer';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getContractById,
  approveContract,
  initESign,
  verifyOTPAndSign,
  getSignatureImage,
  uploadContractPdf,
} from '../../../services/contractService';
import {
  getServiceRequestById,
  getNotationInstrumentsByIds,
  calculatePricing,
} from '../../../services/serviceRequestService';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import { API_CONFIG } from '../../../config/apiConfig';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import RevisionRequestModal from '../../../components/modal/RevisionRequestModal/RevisionRequestModal';
import ViewCancellationReasonModal from '../../../components/modal/ViewCancellationReasonModal/ViewCancellationReasonModal';
import SignaturePadModal from '../../../components/modal/SignaturePadModal/SignaturePadModal';
import OTPVerificationModal from '../../../components/modal/OTPVerificationModal/OTPVerificationModal';
import styles from './ContractDetailPage.module.css';

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
  const { contractId } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Load contract data
  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        setContract(response.data);
        // Load pricing breakdown if requestId is available
        if (response.data.requestId) {
          await loadPricingBreakdown(response.data.requestId);
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
      const requestResponse = await getServiceRequestById(requestId);
      if (requestResponse?.status !== 'success' || !requestResponse?.data) {
        return;
      }

      const request = requestResponse.data;
      const breakdown = {
        instruments: [],
        transcriptionDetails: null,
      };

      // Load instruments if available
      if (
        request.notationInstruments &&
        Array.isArray(request.notationInstruments) &&
        request.notationInstruments.length > 0
      ) {
        try {
          const instrumentsResponse = await getNotationInstrumentsByIds(
            request.notationInstruments
          );
          if (
            instrumentsResponse?.status === 'success' &&
            instrumentsResponse?.data?.length > 0
          ) {
            const selectedInstruments = instrumentsResponse.data.map(instr => ({
              instrumentId: instr.instrumentId,
              instrumentName: instr.instrumentName,
              basePrice: instr.basePrice || 0,
            }));
            breakdown.instruments = selectedInstruments;
          }
        } catch (error) {
          console.warn('Failed to load instruments:', error);
        }
      }

      // Load transcription details if contract type is transcription or bundle
      if (
        request.serviceType === 'transcription' ||
        request.serviceType === 'bundle'
      ) {
        try {
          const pricingResponse = await calculatePricing({
            serviceType: request.serviceType,
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

  // Handle approve
  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await approveContract(contractId);
      if (response?.status === 'success') {
        message.success('Contract approved successfully!');
        loadContract(); // Reload to get updated status
      }
    } catch (error) {
      console.error('Error approving contract:', error);
      message.error(error?.message || 'Failed to approve contract');
    } finally {
      setActionLoading(false);
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
  const generatePdfBlob = async (contractData = contract, pricingData = pricingBreakdown) => {
    // Fetch Party A signature image and convert to base64
    let partyASignatureBase64 = null;
    try {
      partyASignatureBase64 = await imageUrlToBase64('/images/signature.png');
    } catch (error) {
      // Continue without Party A signature
    }

    // Fetch Party B signature image via backend proxy
    let partyBSignatureBase64 = null;
    if (contractData?.status === 'signed' && contractData?.bSignatureS3Url) {
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

        // Wait a bit for state to update, then generate and upload PDF automatically
        setTimeout(async () => {
          try {
            message.loading('Generating and uploading PDF...', 0);
            // Use current contract state (should be updated by now)
            const pdfBlob = await generatePdfBlob(contract, pricingBreakdown);
            const uploadSuccess = await uploadPdfToBackend(pdfBlob);
            message.destroy();

            if (uploadSuccess) {
              message.success('Contract PDF uploaded successfully!');
            } else {
              message.warning('Contract signed but PDF upload failed. You can export PDF manually.');
            }
          } catch (error) {
            console.error('Error generating/uploading PDF:', error);
            message.destroy();
            message.warning('Contract signed but PDF generation failed. You can export PDF manually.');
          }
        }, 500); // Small delay to ensure state is updated
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

  // Handle cancel success
  const handleCancelSuccess = () => {
    message.success('Contract canceled successfully');
    loadContract();
  };

  // Handle revision request success
  const handleRevisionSuccess = () => {
    message.success('Revision request sent successfully');
    loadContract();
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
      console.warn('Failed to register Vietnamese font. PDF may not display Vietnamese correctly:', error);
      console.warn('Please download Be Vietnam Pro font files to public/fonts/ folder. See public/fonts/README.md');
    }
  }, []); // Only register once on mount

  // PDF Styles
  const pdfStyles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      lineHeight: 1.6,
      fontFamily: 'BeVietnamPro', // Will fallback to default if font not loaded
    },
    header: {
      marginBottom: 20,
      borderBottom: '2px solid #1890ff',
      paddingBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1890ff',
      marginBottom: 10,
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#333',
    },
    text: {
      marginBottom: 5,
      color: '#555',
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
  const imageUrlToBase64 = (url) => {
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
  const ContractPdfDocument = ({ contract, pricingBreakdown, statusConfig, partyASignatureBase64, partyBSignatureBase64 }) => (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Company Seal - Only show when signed */}
        {contract?.status === 'signed' && (
          <View style={pdfStyles.seal}>
            <Svg width="130" height="130" style={{ position: 'absolute', transform: 'rotate(-8deg)' }}>
              {/* Outer circle - solid border */}
              <Circle cx="65" cy="65" r="63.5" stroke="#c62828" strokeWidth="3" fill="none" />
              {/* Inner circle - dashed border */}
              <Circle cx="65" cy="65" r="50" stroke="#c62828" strokeWidth="2" fill="none" strokeDasharray="4 4" />
            </Svg>
            <View style={[pdfStyles.sealInner, { position: 'absolute', transform: 'rotate(-8deg)' }]}>
              <PdfText style={pdfStyles.sealText}>MuTraPro Official</PdfText>
              <PdfText style={pdfStyles.sealDate}>
                {contract?.signedAt ? dayjs(contract.signedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')}
              </PdfText>
            </View>
          </View>
        )}
        
        {/* Watermark - Only show if not signed */}
        {contract?.status !== 'signed' && (
          <View style={pdfStyles.watermark}>
            <PdfText>{statusConfig?.text?.toUpperCase() || 'DRAFT'}</PdfText>
          </View>
        )}

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
            <PdfText style={{ fontWeight: 'bold' }}>Party A (Provider):</PdfText>{' '}
            {API_CONFIG.PARTY_A_NAME}
          </PdfText>
          <PdfText style={pdfStyles.text}>
            <PdfText style={{ fontWeight: 'bold' }}>Party B (Customer):</PdfText>{' '}
            {contract?.nameSnapshot || 'N/A'}
            {contract?.phoneSnapshot && ` | Phone: ${contract.phoneSnapshot}`}
            {contract?.emailSnapshot && ` | Email: ${contract.emailSnapshot}`}
          </PdfText>
        </View>

        {/* Pricing */}
        <View style={pdfStyles.section}>
          <PdfText style={pdfStyles.sectionTitle}>Pricing & Payment</PdfText>
          {pricingBreakdown?.transcriptionDetails && (
            <View style={{ marginBottom: 10 }}>
              <PdfText style={{ fontWeight: 'bold', marginBottom: 5 }}>
                Price Breakdown:
              </PdfText>
              {pricingBreakdown.transcriptionDetails.breakdown?.map((item, idx) => (
                <PdfText key={idx} style={pdfStyles.text}>
                  {item.label}: {item.amount?.toLocaleString()} {contract?.currency || 'VND'}
                  {item.description && ` (${item.description})`}
                </PdfText>
              ))}
            </View>
          )}
          {pricingBreakdown?.instruments?.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <PdfText style={{ fontWeight: 'bold', marginBottom: 5 }}>
                Instruments Surcharge:
              </PdfText>
              {pricingBreakdown.instruments.map((instr, idx) => (
                <PdfText key={idx} style={pdfStyles.text}>
                  • {instr.instrumentName}: {instr.basePrice?.toLocaleString()}{' '}
                  {contract?.currency || 'VND'}
                </PdfText>
              ))}
            </View>
          )}
          <PdfText style={pdfStyles.text}>
            Currency: {contract?.currency || 'VND'} | Total Price:{' '}
            {contract?.totalPrice?.toLocaleString()} | Deposit: {contract?.depositPercent}% ={' '}
            {contract?.depositAmount?.toLocaleString()} | Final Amount:{' '}
            {contract?.finalAmount?.toLocaleString()}
          </PdfText>
        </View>

        {/* Timeline */}
        <View style={pdfStyles.section}>
          <PdfText style={pdfStyles.sectionTitle}>Timeline & SLA</PdfText>
          <PdfText style={pdfStyles.text}>
            SLA Days: {contract?.slaDays || 0} days | Expected Start:{' '}
            {contract?.expectedStartDate
              ? dayjs(contract.expectedStartDate).format('YYYY-MM-DD')
              : 'Upon signing'}{' '}
            | Due Date:{' '}
            {contract?.dueDate
              ? dayjs(contract.dueDate).format('YYYY-MM-DD')
              : `+${contract?.slaDays || 0} days from signing`}
          </PdfText>
        </View>

        {/* Terms & Conditions */}
        {contract?.termsAndConditions && (
          <View style={pdfStyles.section}>
            <PdfText style={pdfStyles.sectionTitle}>Terms & Conditions</PdfText>
            <PdfText style={pdfStyles.text}>{contract.termsAndConditions}</PdfText>
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
            {contract?.status === 'signed' && partyASignatureBase64 && (
              <>
                <PdfImage
                  src={partyASignatureBase64}
                  style={{ width: 100, height: 50, marginBottom: 5 }}
                />
                <PdfText style={pdfStyles.text}>CEO - MuTraPro Studio Co., Ltd</PdfText>
                <PdfText style={pdfStyles.text}>
                  Signed on:{' '}
                  {contract?.signedAt
                    ? formatDate(contract.signedAt)
                    : formatDate(contract?.sentAt)}
                </PdfText>
              </>
            )}
            {contract?.status === 'signed' && !partyASignatureBase64 && (
              <>
                <View style={pdfStyles.signatureLine} />
                <PdfText style={pdfStyles.text}>CEO - MuTraPro Studio Co., Ltd</PdfText>
                <PdfText style={pdfStyles.text}>
                  Signed on:{' '}
                  {contract?.signedAt
                    ? formatDate(contract.signedAt)
                    : formatDate(contract?.sentAt)}
                </PdfText>
              </>
            )}
            {contract?.status !== 'signed' && (
              <>
                <View style={pdfStyles.signatureLine} />
                <PdfText style={pdfStyles.text}>Name, Title</PdfText>
              </>
            )}
          </View>

          <View style={pdfStyles.signatureBox}>
            <PdfText style={{ fontWeight: 'bold', marginBottom: 5 }}>
              Party B Representative
            </PdfText>
            {contract?.status === 'signed' && partyBSignatureBase64 && (
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
                  {contract?.bSignedAt
                    ? formatDate(contract.bSignedAt)
                    : contract?.signedAt
                      ? formatDate(contract.signedAt)
                      : 'Pending'}
                </PdfText>
              </>
            )}
            {contract?.status === 'signed' && !partyBSignatureBase64 && (
              <>
                <View style={pdfStyles.signatureLine} />
                <PdfText style={pdfStyles.text}>
                  {contract?.nameSnapshot || 'Customer'}
                </PdfText>
                <PdfText style={pdfStyles.text}>
                  Signed on:{' '}
                  {contract?.bSignedAt
                    ? formatDate(contract.bSignedAt)
                    : contract?.signedAt
                      ? formatDate(contract.signedAt)
                      : 'Pending'}
                </PdfText>
              </>
            )}
            {contract?.status !== 'signed' && (
              <>
                <View style={pdfStyles.signatureLine} />
                <PdfText style={pdfStyles.text}>Name, Title</PdfText>
              </>
            )}
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
      const blob = await generatePdfBlob();

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
      signed: { color: 'green', text: 'Signed' },
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
      <div className={styles.page}>
        <div className={styles.loading}>
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
  const isCanceled =
    currentStatus === 'canceled_by_customer' ||
    currentStatus === 'canceled_by_manager';
  const isNeedRevision = currentStatus === 'need_revision';
  const isExpired = currentStatus === 'expired';

  // Customer can take action when contract is SENT
  const canCustomerAction = isSent;
  const canSign = isApproved;
  const canViewReason = isCanceled || isNeedRevision;

  return (
    <div className={styles.page}>
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
              description="You have approved this contract. Please sign to proceed with the work."
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isSigned && (
            <Alert
              message="Contract Signed"
              description="This contract has been signed and is now in effect."
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
              <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
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
            <Descriptions.Item label="Deposit ({contract.depositPercent}%)">
              {contract.depositAmount?.toLocaleString()}{' '}
              {contract.currency || 'VND'}
            </Descriptions.Item>
            <Descriptions.Item label="Final Amount">
              {contract.finalAmount?.toLocaleString()}{' '}
              {contract.currency || 'VND'}
            </Descriptions.Item>
            <Descriptions.Item label="SLA Days">
              {contract.slaDays || 0} days
            </Descriptions.Item>
            {contract.expectedStartDate && (
              <Descriptions.Item label="Expected Start">
                {dayjs(contract.expectedStartDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
            {contract.dueDate && (
              <Descriptions.Item label="Due Date">
                {dayjs(contract.dueDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
            )}
            {!contract.expectedStartDate && (
              <Descriptions.Item label="Expected Start">
                <Text type="secondary" italic>
                  Set upon signing
                </Text>
              </Descriptions.Item>
            )}
            {!contract.dueDate && contract.slaDays && (
              <Descriptions.Item label="Due Date">
                <Text type="secondary" italic>
                  +{contract.slaDays} days from signing
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
            <Descriptions.Item label="Free Revisions">
              {contract.freeRevisionsIncluded || 0}
            </Descriptions.Item>
            {contract.additionalRevisionFeeVnd && (
              <Descriptions.Item label="Additional Revision Fee">
                {contract.additionalRevisionFeeVnd.toLocaleString()} VND
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {canCustomerAction && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleApprove}
                  loading={actionLoading}
                  block
                  size="large"
                >
                  Approve Contract
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setRevisionModalOpen(true)}
                  loading={actionLoading}
                  block
                >
                  Request Revision
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setCancelModalOpen(true)}
                  loading={actionLoading}
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
              {/* Watermark - Always show except when signed */}
              {!isSigned && (
                <div className={styles.watermark}>
                  {statusConfig.text.toUpperCase()}
                </div>
              )}

              {isSigned && (
                <div className={`${styles.seal} ${styles.seal_red}`}>
                  <div className={styles.sealInner}>
                    <div className={styles.sealText}>MuTraPro Official</div>
                    <div className={styles.sealDate}>
                      {contract.signedAt ? dayjs(contract.signedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')}
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

              <h3>Pricing & Payment</h3>

              {/* Pricing Breakdown */}
              {(pricingBreakdown.transcriptionDetails ||
                pricingBreakdown.instruments.length > 0) && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '8px' }}>
                      Price Breakdown:
                    </strong>

                    {/* Transcription Details */}
                    {pricingBreakdown.transcriptionDetails && (
                      <div
                        style={{
                          marginBottom:
                            pricingBreakdown.instruments.length > 0
                              ? '12px'
                              : '0',
                        }}
                      >
                        {pricingBreakdown.transcriptionDetails.breakdown?.map(
                          (item, index) => (
                            <div
                              key={index}
                              style={{ marginBottom: '4px', fontSize: '14px' }}
                            >
                              <span>{item.label}: </span>
                              <span style={{ fontWeight: 'bold' }}>
                                {item.amount?.toLocaleString?.() ?? item.amount}{' '}
                                {contract.currency || 'VND'}
                              </span>
                              {item.description && (
                                <span
                                  style={{ color: '#666', marginLeft: '8px' }}
                                >
                                  ({formatDescriptionDuration(item.description)})
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Instruments */}
                    {pricingBreakdown.instruments.length > 0 && (
                      <div>
                        <div
                          style={{
                            marginBottom: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          Instruments Surcharge:
                        </div>
                        {pricingBreakdown.instruments.map((instr, index) => (
                          <div
                            key={index}
                            style={{
                              marginLeft: '16px',
                              marginBottom: '4px',
                              fontSize: '14px',
                            }}
                          >
                            <span>• {instr.instrumentName}: </span>
                            <span style={{ fontWeight: 'bold' }}>
                              {instr.basePrice?.toLocaleString?.() ??
                                instr.basePrice}{' '}
                              {contract.currency || 'VND'}
                            </span>
                          </div>
                        ))}
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            borderTop: '1px solid #ddd',
                            paddingTop: '4px',
                          }}
                        >
                          Instruments Total:{' '}
                          {pricingBreakdown.instruments
                            .reduce(
                              (sum, instr) => sum + (instr.basePrice || 0),
                              0
                            )
                            .toLocaleString()}{' '}
                          {contract.currency || 'VND'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              <p>
                <strong>Currency:</strong> {contract.currency || 'VND'}{' '}
                &nbsp;|&nbsp;
                <strong>Total Price:</strong>{' '}
                {contract.totalPrice?.toLocaleString()} &nbsp;|&nbsp;
                <strong>Deposit:</strong> {contract.depositPercent}% ={' '}
                {contract.depositAmount?.toLocaleString()} &nbsp;|&nbsp;
                <strong>Final Amount:</strong>{' '}
                {contract.finalAmount?.toLocaleString()}
              </p>

              <h3>Timeline & SLA</h3>
              <p>
                <strong>SLA Days:</strong> {contract.slaDays || 0} days
                &nbsp;|&nbsp;
                <strong>Expected Start:</strong>{' '}
                {contract.expectedStartDate ? (
                  dayjs(contract.expectedStartDate).format('YYYY-MM-DD')
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#999' }}>
                    Upon signing
                  </span>
                )}
                &nbsp;|&nbsp;
                <strong>Due Date:</strong>{' '}
                {contract.dueDate ? (
                  dayjs(contract.dueDate).format('YYYY-MM-DD')
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#999' }}>
                    +{contract.slaDays || 0} days from signing
                  </span>
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
                  {isSigned ? (
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
                  {isSigned ? (
                    <>
                      {contract.bSignatureS3Url ? (
                        <div
                          className={styles.signature}
                          style={{ marginTop: '12px' }}
                        >
                          <img
                            src={contract.bSignatureS3Url}
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
                        {contract.bSignedAt
                          ? formatDate(contract.bSignedAt)
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
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onSuccess={handleCancelSuccess}
        contractId={contractId}
        isManager={false}
        isDraft={false}
      />

      <RevisionRequestModal
        open={revisionModalOpen}
        onCancel={() => setRevisionModalOpen(false)}
        onSuccess={handleRevisionSuccess}
        contractId={contractId}
      />

      {canViewReason && (
        <ViewCancellationReasonModal
          open={viewReasonModalOpen}
          onCancel={() => setViewReasonModalOpen(false)}
          reason={contract.cancellationReason || 'No reason provided'}
          isCanceled={isCanceled}
        />
      )}
    </div>
  );
};

export default ContractDetailPage;
