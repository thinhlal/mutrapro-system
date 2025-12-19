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
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
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
} from '@react-pdf/renderer';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getContractById,
  getSignatureImage,
  startContractWork,
} from '../../../services/contractService';
import { getTaskAssignmentsByContract } from '../../../services/taskAssignmentService';
import {
  getServiceRequestById,
  calculatePricing,
} from '../../../services/serviceRequestService';
import { getBookingByRequestId } from '../../../services/studioBookingService';
import {
  formatDurationMMSS,
  formatTempoPercentage,
} from '../../../utils/timeUtils';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import { API_CONFIG } from '../../../config/apiConfig';
import ViewCancellationReasonModal from '../../../components/modal/ViewCancellationReasonModal/ViewCancellationReasonModal';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import styles from './ManagerContractDetailPage.module.css';

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

const ManagerContractDetailPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  const [error, setError] = useState(null);
  const [startingWork, setStartingWork] = useState(false);
  const [partyBSignatureUrl, setPartyBSignatureUrl] = useState(null); // Secure signature image URL from backend

  // Modals
  const [viewReasonModalOpen, setViewReasonModalOpen] = useState(false);
  const [startWorkModalVisible, setStartWorkModalVisible] = useState(false);
  const [startWorkContext, setStartWorkContext] = useState({
    milestoneSummaries: [],
    hasBlockingMissing: false,
  });

  // Pricing breakdown information
  const [pricingBreakdown, setPricingBreakdown] = useState({
    instruments: [], // Array of { instrumentId, instrumentName, basePrice }
    transcriptionDetails: null, // { basePrice, quantity, unitPrice, breakdown }
  });
  const [requestDetails, setRequestDetails] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  // Load contract data
  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  // Load booking data for recording contracts
  useEffect(() => {
    const loadBooking = async () => {
      if (!contract?.requestId || contract?.contractType !== 'recording') {
        setBookingData(null);
        return;
      }

      try {
        setLoadingBooking(true);
        const response = await getBookingByRequestId(contract.requestId);
        if (response?.status === 'success' && response.data) {
          setBookingData(response.data);
          console.log(
            'Loaded booking data for recording contract:',
            response.data
          );
        }
      } catch (error) {
        console.error('Error loading booking:', error);
        // Do not show error
      } finally {
        setLoadingBooking(false);
      }
    };

    if (contract?.contractType === 'recording') {
      loadBooking();
    }
  }, [contract?.requestId, contract?.contractType]);

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

  const handleStartWork = async () => {
    try {
      setStartingWork(true);

      // Lấy danh sách task assignments
      const resp = await getTaskAssignmentsByContract(contractId);
      const assignments = Array.isArray(resp?.data)
        ? resp.data
        : resp?.data?.content || [];

      // Accepted statuses (khớp với backend): assigned chưa được accept, nên không tính
      const acceptedStatuses = new Set([
        'accepted_waiting',
        'ready_to_start',
        'in_progress',
        'completed',
      ]);

      // Lọc task không bị cancelled (chỉ lấy task active)
      const activeAssignments = assignments.filter(
        a => (a.status || '').toLowerCase() !== 'cancelled'
      );

      // Chỉ tính task active (không cancelled) cho mỗi milestone
      const byMilestone = activeAssignments.reduce((acc, a) => {
        if (!a.milestoneId) return acc;
        const mId = a.milestoneId;
        if (!acc[mId]) {
          acc[mId] = { hasActiveTask: false, isAccepted: false };
        }
        // Milestone có task active
        acc[mId].hasActiveTask = true;
        const st = (a.status || '').toLowerCase();
        // Task active có được accept không
        if (acceptedStatuses.has(st)) {
          acc[mId].isAccepted = true;
        }
        return acc;
      }, {});

      const milestones = Array.isArray(contract?.milestones)
        ? contract.milestones
        : [];
      const milestoneSummaries = milestones.map(m => {
        const stats = byMilestone[m.milestoneId] || {
          hasActiveTask: false,
          isAccepted: false,
        };
        return {
          id: m.milestoneId,
          name: m.name || `Milestone ${m.orderIndex || ''}`.trim(),
          orderIndex: m.orderIndex,
          ...stats,
        };
      });

      // Chỉ milestone 1 phải có task assignment và đã được accept
      // Các milestone khác có thể chưa assign hoặc chưa accept (contract không bị block)
      const firstMilestone =
        milestoneSummaries.find(
          m =>
            m.orderIndex === 1 || m.name?.toLowerCase().includes('milestone 1')
        ) || milestoneSummaries[0]; // Fallback: lấy milestone đầu tiên

      // Milestone 1 chưa có task assignment active hoặc task chưa được accept
      const firstMilestoneMissing =
        firstMilestone &&
        (!firstMilestone.hasActiveTask || !firstMilestone.isAccepted);

      // Các milestone khác chưa có task (chỉ để hiển thị cảnh báo, không block)
      const otherMilestonesMissing = milestoneSummaries
        .filter(m => m.id !== firstMilestone?.id)
        .filter(m => !m.hasActiveTask || !m.isAccepted);

      const hasBlockingMissing = firstMilestoneMissing; // Chỉ block nếu milestone 1 chưa ready

      // Lưu context và mở modal riêng thay vì dùng Modal.confirm
      setStartWorkContext({
        milestoneSummaries,
        hasBlockingMissing,
        firstMilestoneMissing,
        otherMilestonesMissing,
      });
      setStartWorkModalVisible(true);
    } catch (err) {
      console.error(
        'Failed to load task assignments before starting work:',
        err
      );
      Modal.error({
        title: 'Không thể tải thông tin task',
        content:
          err?.message ||
          'Có lỗi khi gọi API task-assignments. Vui lòng kiểm tra lại hoặc thử lại sau.',
      });
    } finally {
      // Reset loading state sau khi đã mở modal hoặc có lỗi
      setStartingWork(false);
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

  // Register Vietnamese font once (Be Vietnam Pro - supports Vietnamese)
  useEffect(() => {
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
    }
  }, []);

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
              <Circle
                cx="65"
                cy="65"
                r="63.5"
                stroke="#c62828"
                strokeWidth="3"
                fill="none"
              />
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
                              contract?.contractType ===
                                'arrangement_with_recording') &&
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
        </View>

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
                  <PdfText style={{ fontWeight: 'bold' }}>Description</PdfText>
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
                          {milestone.milestoneType && (
                            <PdfText
                              style={{
                                fontSize: 9,
                                color: '#1890ff',
                                marginLeft: 4,
                              }}
                            >
                              {' '}
                              (
                              {milestone.milestoneType === 'transcription'
                                ? 'Transcription'
                                : milestone.milestoneType === 'arrangement'
                                  ? 'Arrangement'
                                  : milestone.milestoneType === 'recording'
                                    ? 'Recording'
                                    : milestone.milestoneType}
                              )
                            </PdfText>
                          )}
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
              // Get due date from last milestone's targetDeadline (calculated by backend)
              if (contract?.milestones && contract.milestones.length > 0) {
                const lastMilestone =
                  contract.milestones[contract.milestones.length - 1];
                if (lastMilestone?.targetDeadline) {
                  return dayjs(lastMilestone.targetDeadline).format(
                    'YYYY-MM-DD'
                  );
                }
              }
              // No targetDeadline yet
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
      active: { color: 'green', text: 'Active - In Progress' },
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
          action={
            <Button onClick={() => navigate('/manager/contracts')}>
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  const statusConfig = getStatusConfig(contract.status);
  const currentStatus = contract.status?.toLowerCase();

  // Determine available actions based on status
  const isDraft = currentStatus === 'draft';
  const isSigned = currentStatus === 'signed';
  const isPendingAssignment = currentStatus === 'active_pending_assignment';
  const isActive =
    currentStatus === 'active' || currentStatus === 'active_pending_assignment';
  const isCanceled =
    currentStatus === 'canceled_by_customer' ||
    currentStatus === 'canceled_by_manager';
  const isNeedRevision = currentStatus === 'need_revision';
  const isExpired = currentStatus === 'expired';

  // Contract is signed or active - milestones can be paid (but not if canceled, expired, or completed)
  const isCompleted = currentStatus === 'completed';
  const canPayMilestones =
    (isSigned || isActive) && !isCanceled && !isExpired && !isCompleted;

  // Show signature if contract has been signed (regardless of current status for display purposes)
  const hasSigned =
    contract?.customerSignedAt || isSigned || isActive || isCompleted;

  // Show Party A signature when contract is signed/active/completed (same logic as PDF)
  const shouldShowPartyASignature = isSigned || isActive || isCompleted;

  const canViewReason = isCanceled || isNeedRevision;

  return (
    <div className={styles.page}>
      {/* LEFT SECTION: Contract Info & Actions */}
      <div className={styles.infoSection}>
        <Card className={styles.infoCard}>
          {/* Back button */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/manager/contracts')}
            style={{ marginBottom: 16 }}
          >
            Back to Contracts List
          </Button>

          <Title level={3} style={{ marginTop: 0, marginBottom: 12 }}>
            Contract Details
          </Title>

          {/* Status Alert */}
          {isSigned && (
            <Alert
              message="Contract Signed"
              description="This contract has been signed and is now in effect."
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {isPendingAssignment && (
            <Alert
              message="Deposit received - Pending Manager Action"
              description="Contract đã nhận cọc. Hãy hoàn tất việc giao task và bấm Start Work để bắt đầu tính SLA."
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              action={
                <Button
                  type="primary"
                  loading={startingWork}
                  onClick={handleStartWork}
                >
                  Start Work
                </Button>
              }
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

          {isNeedRevision && (
            <Alert
              message="Revision Requested"
              description="Customer has requested revisions to this contract."
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
                  lineHeight: 1.3,
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
            <Descriptions.Item label="Request ID">
              <Text
                copyable={{ text: contract.requestId }}
                style={{
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  display: 'block',
                }}
              >
                {contract.requestId || 'N/A'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Customer ID">
              <Text
                copyable={{ text: contract.userId }}
                style={{
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  display: 'block',
                }}
              >
                {contract.userId || 'N/A'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Customer Name">
              <Text strong>{contract.nameSnapshot || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Customer Email">
              <Text>{contract.emailSnapshot || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Customer Phone">
              <Text>{contract.phoneSnapshot || 'N/A'}</Text>
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
              // Get due date from last milestone's targetDeadline (calculated by backend)
              if (contract?.milestones && contract.milestones.length > 0) {
                const lastMilestone =
                  contract.milestones[contract.milestones.length - 1];
                if (lastMilestone?.targetDeadline) {
                  return (
                    <Descriptions.Item label="Due Date">
                      {dayjs(lastMilestone.targetDeadline).format('YYYY-MM-DD')}
                    </Descriptions.Item>
                  );
                }
              }
              // No targetDeadline yet
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
                  Not scheduled (will be set when Start Work)
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
              <Descriptions.Item label="Customer Reviewed At">
                {dayjs(contract.customerReviewedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            {contract.customerSignedAt && (
              <Descriptions.Item label="Customer Signed At">
                {dayjs(contract.customerSignedAt).format('YYYY-MM-DD HH:mm')}
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

                        {isDepositPaid && <Tag color="success">Paid</Tag>}
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
                        case 'WAITING_ASSIGNMENT':
                          return 'orange';
                        case 'WAITING_SPECIALIST_ACCEPT':
                          return 'gold';
                        case 'TASK_ACCEPTED_WAITING_ACTIVATION':
                          return 'lime';
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
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <Text strong style={{ fontSize: 16 }}>
                                  {milestone.name ||
                                    `Milestone ${milestone.orderIndex || index + 1}`}
                                </Text>
                                {milestone.milestoneType && (
                                  <Tag color="blue" style={{ margin: 0 }}>
                                    {milestone.milestoneType === 'transcription'
                                      ? 'Transcription'
                                      : milestone.milestoneType ===
                                          'arrangement'
                                        ? 'Arrangement'
                                        : milestone.milestoneType ===
                                            'recording'
                                          ? 'Recording'
                                          : milestone.milestoneType}
                                  </Tag>
                                )}
                                {(milestone.milestoneSlaDays ||
                                  milestone.slaDays) && (
                                  <Tag color="blue" style={{ margin: 0 }}>
                                    SLA:{' '}
                                    {milestone.milestoneSlaDays ||
                                      milestone.slaDays}{' '}
                                    days
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
                              {targetInstallment && (
                                <Tag color={getPaymentStatusColor()}>
                                  Payment: {getPaymentStatusText()}
                                </Tag>
                              )}
                              <Tag color={getWorkStatusColor()}>
                                Work: {workStatus}
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

                            {isPaid && targetInstallment && (
                              <Tag color="success">Paid</Tag>
                            )}
                            {!targetInstallment &&
                              milestone.hasPayment === false && (
                                <Tag color="default">No payment required</Tag>
                              )}
                          </div>
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
            {isDraft && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() =>
                  navigate(`/manager/contracts/${contractId}/edit`)
                }
                block
                size="large"
              >
                Edit Contract
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
                      requestDetails.requestType ===
                        'arrangement_with_recording') && (
                      <>
                        {requestDetails.genres &&
                          requestDetails.genres.length > 0 && (
                            <p>
                              <strong>Genres:</strong>{' '}
                              {requestDetails.genres
                                .map(genre => getGenreLabel(genre))
                                .join(', ')}
                            </p>
                          )}
                        {requestDetails.purpose && (
                          <p>
                            <strong>Purpose:</strong>{' '}
                            {getPurposeLabel(requestDetails.purpose)}
                          </p>
                        )}
                        {requestDetails.preferredSpecialists &&
                          requestDetails.preferredSpecialists.length > 0 && (
                            <p>
                              <strong>Preferred Vocalists:</strong>{' '}
                              {requestDetails.preferredSpecialists
                                .map(
                                  s => s.name || `Vocalist ${s.specialistId}`
                                )
                                .join(', ')}
                            </p>
                          )}
                      </>
                    )}
                  </>
                )}

              {/* Studio Booking Information for Recording */}
              {contract?.contractType === 'recording' && bookingData && (
                <p style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <strong>Studio Booking:</strong>{' '}
                  {bookingData.bookingDate || 'N/A'} |{' '}
                  {bookingData.startTime && bookingData.endTime
                    ? `${bookingData.startTime} - ${bookingData.endTime}`
                    : 'N/A'}{' '}
                  ({bookingData.durationHours}h)
                </p>
              )}

              <h3>Pricing & Payment</h3>

              {/* Pricing Breakdown */}
              {(pricingBreakdown.transcriptionDetails ||
                pricingBreakdown.instruments.length > 0 ||
                (requestDetails?.servicePrice &&
                  (requestDetails.requestType === 'arrangement' ||
                    requestDetails.requestType ===
                      'arrangement_with_recording')) ||
                (contract?.contractType === 'recording' && bookingData)) && (
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
                          requestDetails.requestType ===
                            'arrangement_with_recording') && (
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
                              {Number(
                                requestDetails.servicePrice
                              )?.toLocaleString?.() ??
                                requestDetails.servicePrice}
                            </td>
                          </tr>
                        )}

                      {/* Recording Participants */}
                      {contract?.contractType === 'recording' &&
                        bookingData?.participants &&
                        bookingData.participants.length > 0 && (
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
                                Recording Participants:
                              </td>
                            </tr>
                            {bookingData.participants.map(
                              (participant, index) => (
                                <tr key={`participant-${index}`}>
                                  <td
                                    style={{
                                      border: '1px solid #000',
                                      padding: '8px',
                                      paddingLeft: '24px',
                                      backgroundColor: '#fff',
                                    }}
                                  >
                                    • {participant.specialistName || 'Unnamed'}{' '}
                                    ({participant.roleType}) -{' '}
                                    {participant.participantFee?.toLocaleString()}{' '}
                                    VND/giờ × {bookingData.durationHours} giờ
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
                                    {(
                                      (participant.participantFee || 0) *
                                      (bookingData.durationHours || 1)
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              )
                            )}
                            <tr>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  fontWeight: 'bold',
                                  backgroundColor: '#e8e8e8',
                                }}
                              >
                                Participant Total:
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
                                {bookingData.participants
                                  .reduce(
                                    (sum, p) =>
                                      sum +
                                      (p.participantFee || 0) *
                                        (bookingData.durationHours || 1),
                                    0
                                  )
                                  .toLocaleString()}
                              </td>
                            </tr>
                          </>
                        )}

                      {/* Studio Equipment Rental */}
                      {contract?.contractType === 'recording' &&
                        bookingData?.requiredEquipment &&
                        bookingData.requiredEquipment.length > 0 && (
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
                                Studio Equipment Rental:
                              </td>
                            </tr>
                            {bookingData.requiredEquipment.map(
                              (equipment, index) => (
                                <tr key={`equipment-${index}`}>
                                  <td
                                    style={{
                                      border: '1px solid #000',
                                      padding: '8px',
                                      paddingLeft: '24px',
                                      backgroundColor: '#fff',
                                    }}
                                  >
                                    • {equipment.equipmentName || 'Unnamed'} ×{' '}
                                    {equipment.quantity} -{' '}
                                    {equipment.rentalFeePerUnit?.toLocaleString()}{' '}
                                    VND/giờ × {bookingData.durationHours} giờ
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
                                    {(
                                      (equipment.rentalFeePerUnit || 0) *
                                      (equipment.quantity || 1) *
                                      (bookingData.durationHours || 1)
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              )
                            )}
                            <tr>
                              <td
                                style={{
                                  border: '1px solid #000',
                                  padding: '8px',
                                  fontWeight: 'bold',
                                  backgroundColor: '#e8e8e8',
                                }}
                              >
                                Equipment Total:
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
                                {bookingData.requiredEquipment
                                  .reduce(
                                    (sum, eq) =>
                                      sum +
                                      (eq.rentalFeePerUnit || 0) *
                                        (eq.quantity || 1) *
                                        (bookingData.durationHours || 1),
                                    0
                                  )
                                  .toLocaleString()}
                              </td>
                            </tr>
                          </>
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
                                    contract?.contractType ===
                                      'arrangement_with_recording') &&
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
                              <div>
                                <strong>
                                  {milestone.name || `Milestone ${index + 1}`}
                                </strong>
                                {milestone.milestoneType && (
                                  <Tag
                                    color="blue"
                                    size="small"
                                    style={{ marginLeft: 8 }}
                                  >
                                    {milestone.milestoneType === 'transcription'
                                      ? 'Transcription'
                                      : milestone.milestoneType ===
                                          'arrangement'
                                        ? 'Arrangement'
                                        : milestone.milestoneType ===
                                            'recording'
                                          ? 'Recording'
                                          : milestone.milestoneType}
                                  </Tag>
                                )}
                              </div>
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
      {canViewReason && (
        <ViewCancellationReasonModal
          open={viewReasonModalOpen}
          onCancel={() => setViewReasonModalOpen(false)}
          reason={contract.cancellationReason || 'No reason provided'}
          isCanceled={isCanceled}
        />
      )}

      {/* Start Work Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>Start Work cho contract này?</span>
          </Space>
        }
        open={startWorkModalVisible}
        onCancel={() => {
          setStartWorkModalVisible(false);
          setStartWorkContext({
            milestoneSummaries: [],
            hasBlockingMissing: false,
          });
        }}
        okText={
          startWorkContext.hasBlockingMissing
            ? 'Không thể Start Work'
            : 'Start Work'
        }
        okButtonProps={{
          disabled: startWorkContext.hasBlockingMissing,
          loading: startingWork,
        }}
        cancelText="Đóng"
        onOk={async () => {
          if (startWorkContext.hasBlockingMissing) {
            return;
          }
          try {
            setStartingWork(true);
            await startContractWork(contractId);
            message.success('Đã kích hoạt contract và bắt đầu tính SLA');
            setStartWorkModalVisible(false);
            setStartWorkContext({
              milestoneSummaries: [],
              hasBlockingMissing: false,
            });
            loadContract();
          } catch (err) {
            console.error('Failed to start contract work:', err);
            message.error(err?.message || 'Không thể bắt đầu contract');
          } finally {
            setStartingWork(false);
          }
        }}
        width={700}
      >
        <div>
          {startWorkContext.milestoneSummaries.length === 0 ? (
            <>
              <p>
                Contract này hiện chưa có dữ liệu milestones hoặc task
                assignments, vì vậy chưa thể Start Work.
              </p>
              <p style={{ marginTop: 8 }}>
                Vui lòng kiểm tra lại trong Milestones / Task Progress và đảm
                bảo đã khởi tạo milestones và gán task trước khi Start Work.
              </p>
            </>
          ) : (
            <>
              <p>
                Tình trạng task theo từng milestone (accepted = accepted_waiting
                / ready_to_start / in_progress / completed):
              </p>
              <ul style={{ paddingLeft: 20 }}>
                {startWorkContext.milestoneSummaries.map(m => (
                  <li key={m.id || m.name}>
                    <strong>{m.name}:</strong>{' '}
                    {!m.hasActiveTask
                      ? 'Chưa có task assignment active'
                      : m.isAccepted
                        ? 'Task đã được accept ✓'
                        : 'Task chưa được accept (đang ở trạng thái assigned)'}
                  </li>
                ))}
              </ul>
              {startWorkContext.hasBlockingMissing ? (
                <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                  <strong>
                    Milestone 1 chưa có task assignment active hoặc task chưa
                    được accept.
                  </strong>{' '}
                  Milestone 1 phải có task đã được accept trước khi Start Work.
                  Vui lòng vào Milestones / Task Progress để gán và đảm bảo task
                  đã được accept.
                </p>
              ) : (
                <>
                  <p style={{ marginTop: 8 }}>
                    <strong>
                      Milestone 1 đã có task assignment và đã được accept ✓
                    </strong>
                  </p>
                  {startWorkContext.otherMilestonesMissing?.length > 0 && (
                    <p style={{ marginTop: 8, color: '#faad14' }}>
                      <strong>Lưu ý:</strong> Có{' '}
                      {startWorkContext.otherMilestonesMissing.length} milestone
                      khác chưa có task assignment hoặc task chưa được accept.{' '}
                      Các milestone này có thể được assign sau, không ảnh hưởng
                      đến việc Start Work.
                    </p>
                  )}
                  <p style={{ marginTop: 8 }}>
                    Bạn có chắc chắn muốn Start Work cho contract này không?
                  </p>
                </>
              )}
              <p style={{ marginTop: 8 }}>
                Sau khi Start Work, SLA và timeline sẽ được tính từ ngày bắt đầu
                work, không phải ngày ký hợp đồng.
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* Chat Popup - Facebook Messenger style for request chat */}
      {contract?.requestId && (
        <ChatPopup requestId={contract.requestId} roomType="REQUEST_CHAT" />
      )}
    </div>
  );
};

export default ManagerContractDetailPage;
