import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Spin,
  Empty,
  message,
  Space,
  Divider,
  Modal,
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import Header from '../../../components/common/Header/Header';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getBookingByRequestId } from '../../../services/studioBookingService';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import { formatPrice } from '../../../services/pricingMatrixService';
import {
  getContractsByRequestId,
  approveContract,
  requestChangeContract,
  cancelContract,
} from '../../../services/contractService';
import {
  createRequestReview,
  getRequestReviews,
  createParticipantReview,
} from '../../../services/reviewService';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import RequestContractList from '../../../components/contract/RequestContractList/RequestContractList';
import FileList from '../../../components/common/FileList/FileList';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import ReviewModal from '../../../components/modal/ReviewModal/ReviewModal';
import styles from './RequestDetailPage.module.css';
import { useDocumentTitle } from '../../../hooks';

const { TextArea } = Input;

// Booking Status
const BOOKING_STATUS_COLORS = {
  TENTATIVE: 'default',
  PENDING: 'processing',
  CONFIRMED: 'success',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const BOOKING_STATUS_LABELS = {
  TENTATIVE: 'Tentative',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const RequestDetailPage = () => {
  useDocumentTitle('Request Details');
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [requestChangeModalVisible, setRequestChangeModalVisible] =
    useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // Track loading per contractId
  const [changeReason, setChangeReason] = useState('');
  const { instruments: instrumentsData, fetchInstruments } =
    useInstrumentStore();

  // Request review state
  const [requestReviewModalVisible, setRequestReviewModalVisible] =
    useState(false);
  const [requestReviewLoading, setRequestReviewLoading] = useState(false);
  const [existingRequestReview, setExistingRequestReview] = useState(null);

  // Participant review state
  const [participantReviews, setParticipantReviews] = useState({}); // Map participantId -> review
  const [participantReviewModalVisible, setParticipantReviewModalVisible] =
    useState(false);
  const [participantReviewLoading, setParticipantReviewLoading] =
    useState(false);
  const [selectedParticipantIdForReview, setSelectedParticipantIdForReview] =
    useState(null);
  const [existingParticipantReview, setExistingParticipantReview] =
    useState(null);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        const response = await getServiceRequestById(requestId);

        if (response.status === 'success' && response.data) {
          setRequest(response.data);
          console.log('Request data:', response.data);
        } else {
          message.error('Unable to load request details');
          navigate('/my-requests');
        }
      } catch (error) {
        console.error('Error loading request:', error);
        message.error(error.message || 'Failed to load request details');
        navigate('/my-requests');
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      loadRequest();
    }
  }, [requestId, navigate]);

  useEffect(() => {
    const loadBooking = async () => {
      if (!requestId || request?.requestType !== 'recording') return;

      try {
        setLoadingBooking(true);
        const response = await getBookingByRequestId(requestId);
        console.log('Booking data:', response.data);
        if (response.status === 'success' && response.data) {
          setBooking(response.data);
        }
      } catch (error) {
        console.error('Error loading booking:', error);
        // Do not show error because booking may not exist yet
      } finally {
        setLoadingBooking(false);
      }
    };

    if (request?.requestType === 'recording') {
      loadBooking();
    }
  }, [requestId, request?.requestType]);

  useEffect(() => {
    const loadContracts = async () => {
      if (!requestId) return;
      try {
        setLoadingContracts(true);
        const response = await getContractsByRequestId(requestId);
        if (response.status === 'success' && response.data) {
          const contractsData = response.data || [];
          setContracts(contractsData);
        }
      } catch (error) {
        console.error('Error loading contracts:', error);
        // Do not show error if there is no contract yet
      } finally {
        setLoadingContracts(false);
      }
    };

    loadContracts();
  }, [requestId]);

  // Load request review
  const loadRequestReview = async () => {
    if (!requestId) return;
    try {
      const response = await getRequestReviews(requestId);
      if (response?.status === 'success' && response?.data) {
        // Find REQUEST type review
        const requestReview = Array.isArray(response.data)
          ? response.data.find(r => r.reviewType === 'REQUEST')
          : null;
        setExistingRequestReview(requestReview || null);
      }
    } catch (error) {
      console.error('Error loading request review:', error);
      setExistingRequestReview(null);
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
  const handleRateParticipant = participantId => {
    setSelectedParticipantIdForReview(participantId);
    setExistingParticipantReview(participantReviews[participantId] || null);
    setParticipantReviewModalVisible(true);
  };

  // Handle submit participant review
  const handleSubmitParticipantReview = async reviewData => {
    if (!selectedParticipantIdForReview) return;

    try {
      setParticipantReviewLoading(true);
      const response = await createParticipantReview(
        selectedParticipantIdForReview,
        reviewData
      );

      if (response?.status === 'success') {
        message.success('Đã gửi đánh giá participant thành công');
        // Update participant reviews map
        setParticipantReviews(prev => ({
          ...prev,
          [selectedParticipantIdForReview]: response.data,
        }));
        setExistingParticipantReview(response.data);
        setParticipantReviewModalVisible(false);
        setSelectedParticipantIdForReview(null);
      } else {
        message.error(response?.message || 'Lỗi khi gửi đánh giá');
      }
    } catch (error) {
      console.error('Error submitting participant review:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi gửi đánh giá participant'
      );
    } finally {
      setParticipantReviewLoading(false);
    }
  };

  // Handle submit request review
  const handleSubmitRequestReview = async reviewData => {
    if (!requestId) {
      message.error('Request ID không tồn tại');
      return;
    }

    try {
      setRequestReviewLoading(true);
      const response = await createRequestReview(requestId, reviewData);

      if (response?.status === 'success') {
        message.success('Đã gửi đánh giá request thành công');
        setExistingRequestReview(response.data);
        setRequestReviewModalVisible(false);
      } else {
        message.error(response?.message || 'Lỗi khi gửi đánh giá');
      }
    } catch (error) {
      console.error('Error submitting request review:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi gửi đánh giá request'
      );
    } finally {
      setRequestReviewLoading(false);
    }
  };

  const getStatusConfig = status => {
    const hasManager = !!request?.managerUserId;
    const configs = {
      pending: {
        color: hasManager ? 'gold' : 'default',
        icon: hasManager ? (
          <ClockCircleOutlined />
        ) : (
          <ExclamationCircleOutlined />
        ),
        text: hasManager ? 'Assigned - pending' : 'Waiting for manager',
        description: hasManager
          ? 'Manager is preparing the contract.'
          : 'Waiting for manager to accept and process your request.',
      },
      contract_sent: {
        color: 'blue',
        icon: <FileTextOutlined />,
        text: 'Contract sent',
        description: 'Contract has been sent. Please review and approve.',
      },
      contract_approved: {
        color: 'cyan',
        icon: <CheckCircleOutlined />,
        text: 'Contract approved - awaiting signature',
        description: 'You approved the content. Complete e-sign to continue.',
      },
      contract_signed: {
        color: 'geekblue',
        icon: <FileTextOutlined />,
        text: 'Contract signed',
        description: 'Contract signed, awaiting deposit payment to start.',
      },
      awaiting_assignment: {
        color: 'gold',
        icon: <ClockCircleOutlined />,
        text: 'Awaiting assignment',
        description:
          'Deposit paid. Waiting for manager to assign tasks and start work.',
      },
      in_progress: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: 'In progress',
        description: 'Service is in progress.',
      },
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: 'Completed',
        description: 'Request completed.',
      },
      cancelled: {
        color: 'default',
        icon: <CloseCircleOutlined />,
        text: 'Cancelled',
        description: 'Request was cancelled.',
      },
      rejected: {
        color: 'error',
        icon: <ExclamationCircleOutlined />,
        text: 'Rejected',
        description: 'Request was rejected.',
      },
    };
    return (
      configs[status] || {
        color: 'default',
        icon: null,
        text: status,
        description: 'Current request status.',
      }
    );
  };

  const getRequestTypeText = type => {
    const types = {
      transcription: 'Transcription',
      arrangement: 'Arrangement',
      arrangement_with_recording: 'Arrangement with Recording',
      recording: 'Recording',
    };
    return types[type] || type;
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  console.log('request', request);
  const getManagerStatusText = () => {
    if (!request) return '';
    const hasManager = !!request.managerUserId;
    const status = request.status;
    if (hasManager) {
      if (status === 'completed') return 'Completed';
      if (status === 'cancelled' || status === 'rejected') return 'Closed';
      // pending/approved/... but has manager
      return 'Manager processing';
    }
    // No manager yet
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled' || status === 'rejected') return 'Closed';
    return 'Not assigned • Pending';
  };

  const handleApproveContract = async contractId => {
    try {
      setActionLoading(prev => ({ ...prev, [contractId]: true }));
      await approveContract(contractId);
      message.success('Approved contract successfully');
      // Reload contracts
      const response = await getContractsByRequestId(requestId);
      if (response.status === 'success' && response.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      message.error(error.message || 'Failed to approve contract');
    } finally {
      setActionLoading(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleRequestChange = async () => {
    if (!selectedContract || !changeReason.trim()) {
      message.warning('Please enter a reason for the change request');
      return;
    }
    const contractId = selectedContract.contractId;
    try {
      setActionLoading(prev => ({ ...prev, [contractId]: true }));
      await requestChangeContract(contractId, changeReason);
      message.success('Sent contract change request');
      setRequestChangeModalVisible(false);
      setChangeReason('');
      setSelectedContract(null);
      // Reload contracts
      const response = await getContractsByRequestId(requestId);
      if (response.status === 'success' && response.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      message.error(error.message || 'Failed to request contract change');
    } finally {
      setActionLoading(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleCancelContract = async reason => {
    if (!selectedContract) return;
    const contractId = selectedContract.contractId;
    try {
      setActionLoading(prev => ({ ...prev, [contractId]: true }));
      await cancelContract(contractId, reason);
      message.success('Cancelled contract successfully');
      setCancelModalVisible(false);
      setSelectedContract(null);
      // Reload contracts
      const response = await getContractsByRequestId(requestId);
      if (response.status === 'success' && response.data) {
        setContracts(response.data || []);
      }
    } catch (error) {
      message.error(error.message || 'Failed to cancel contract');
    } finally {
      setActionLoading(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleOpenRequestChangeModal = contract => {
    setSelectedContract(contract);
    setRequestChangeModalVisible(true);
  };

  const handleOpenCancelModal = contract => {
    setSelectedContract(contract);
    setCancelModalVisible(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <p style={{ marginTop: '1rem' }}>Loading...</p>
        </div>
      );
    }

    if (!request) {
      return <Empty description="Request not found" />;
    }

    const statusConfig = getStatusConfig(request.status);

    return (
      <div className={styles.detailWrapper}>
        <div className={styles.headerSection}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/my-requests')}
            style={{ marginBottom: '1rem' }}
          >
            Back
          </Button>
          <h1 className={styles.pageTitle}>Request Detail</h1>
        </div>

        <Card className={styles.detailCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.requestTitle}>{request.title}</h2>
            <Space>
              <Tag color="orange" className={styles.typeTag}>
                {getRequestTypeText(request.requestType)}
              </Tag>
              <Tag
                color={statusConfig.color}
                icon={statusConfig.icon}
                className={styles.statusTag}
                style={{
                  whiteSpace: 'normal',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  minWidth: 0,
                }}
              >
                {statusConfig.text}
              </Tag>
              {/* Rate Request Button - When request is completed */}
              {request.status?.toLowerCase() === 'completed' && (
                <Button
                  type="primary"
                  icon={<StarOutlined />}
                  size="small"
                  onClick={handleRateRequest}
                >
                  {existingRequestReview ? 'View Review' : 'Rate Request'}
                </Button>
              )}
            </Space>
          </div>

          <Divider />

          {/* First part: 2 columns */}
          <Descriptions bordered column={2} size="middle">
            {/* Left column items */}
            <Descriptions.Item label="Request ID">
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {request.requestId}
              </span>
            </Descriptions.Item>

            {/* Right column - Duration - transcription only */}
            {request.requestType === 'transcription' ? (
              request.durationMinutes ? (
                <Descriptions.Item label="Duration">
                  {formatDurationMMSS(request.durationMinutes)}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Duration">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            ) : null}

            <Descriptions.Item label="Title">
              {request.title || 'N/A'}
            </Descriptions.Item>

            {/* Right column - Tempo - transcription only */}
            {request.requestType === 'transcription' ? (
              request.tempoPercentage ? (
                <Descriptions.Item label="Tempo">
                  <Tag>{request.tempoPercentage}%</Tag>
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Tempo">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              )
            ) : null}

            <Descriptions.Item label="Description">
              {request.description || 'No description'}
            </Descriptions.Item>

            {/* Right column - Instruments */}
            {(request.requestType !== 'recording' &&
              request.instruments &&
              request.instruments.length > 0) ||
              (request.instrumentIds && request.instrumentIds.length > 0 && (
                <Descriptions.Item label="Instruments">
                  <Space wrap>
                    {request.instruments && request.instruments.length > 0
                      ? request.instruments.map((inst, idx) => {
                          const isMain = inst.isMain === true;
                          const isArrangement =
                            request.requestType === 'arrangement' ||
                            request.requestType ===
                              'arrangement_with_recording';
                          return (
                            <Tag
                              key={inst.instrumentId || idx}
                              color={
                                isMain && isArrangement ? 'gold' : 'purple'
                              }
                              icon={
                                isMain && isArrangement ? <StarFilled /> : null
                              }
                            >
                              {inst.instrumentName || inst.name || inst}
                              {isMain && isArrangement && ' (Main)'}
                            </Tag>
                          );
                        })
                      : request.instrumentIds.map(id => {
                          const inst = instrumentsData.find(
                            i => i.instrumentId === id
                          );
                          return inst ? (
                            <Tag key={id} color="purple">
                              {inst.instrumentName}
                            </Tag>
                          ) : (
                            <Tag key={id} color="default">
                              {id}
                            </Tag>
                          );
                        })}
                  </Space>
                </Descriptions.Item>
              ))}

            <Descriptions.Item label="Contact Name">
              {request.contactName || 'N/A'}
            </Descriptions.Item>

            {/* Service Price - hidden for recording */}
            {request.requestType !== 'recording' &&
              (request.servicePrice ? (
                <Descriptions.Item label="Service Price">
                  {formatPrice(request.servicePrice, request.currency || 'VND')}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Service Price">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              ))}

            <Descriptions.Item label="Contact Email">
              {request.contactEmail || 'N/A'}
            </Descriptions.Item>

            {/* Instruments Price - hidden for recording */}
            {request.requestType !== 'recording' &&
              (request.instrumentPrice && request.instrumentPrice > 0 ? (
                <Descriptions.Item label="Instruments Price">
                  {formatPrice(
                    request.instrumentPrice,
                    request.currency || 'VND'
                  )}
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Instruments Price">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              ))}

            <Descriptions.Item label="Phone Number">
              {request.contactPhone || 'N/A'}
            </Descriptions.Item>

            {/* Total Price - hidden for recording (uses booking totalCost) */}
            {request.requestType !== 'recording' &&
              (request.totalPrice ? (
                <Descriptions.Item label="Total Price">
                  <Tag color="green">
                    {formatPrice(request.totalPrice, request.currency || 'VND')}
                  </Tag>
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Total Price">
                  <span style={{ color: '#999' }}>N/A</span>
                </Descriptions.Item>
              ))}
          </Descriptions>

          {/* Second part: single column for remaining items */}
          <Descriptions
            bordered
            column={1}
            size="middle"
            style={{ marginTop: 16 }}
          >
            {/* Conditional items for arrangement/recording */}
            {request.hasVocalist !== undefined &&
              request.requestType === 'arrangement_with_recording' && (
                <Descriptions.Item label="Vocalist">
                  {request.hasVocalist ? (
                    <Tag color="green">Yes</Tag>
                  ) : (
                    <Tag color="default">No</Tag>
                  )}
                </Descriptions.Item>
              )}

            {request.requestType === 'arrangement_with_recording' &&
              request.preferredSpecialists &&
              request.preferredSpecialists.length > 0 && (
                <Descriptions.Item label="Preferred Vocalists">
                  <Space wrap>
                    {request.preferredSpecialists.map((specialist, idx) => (
                      <Tag key={idx} color="orange">
                        {specialist.name ||
                          `Vocalist ${specialist.specialistId}`}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}

            {/* Show genres and purpose for arrangement requests */}
            {(request.requestType === 'arrangement' ||
              request.requestType === 'arrangement_with_recording') && (
              <>
                <Descriptions.Item label="Genres">
                  {request.genres && request.genres.length > 0 ? (
                    <Space wrap>
                      {request.genres.map((genre, idx) => (
                        <Tag key={idx} color="orange">
                          {getGenreLabel(genre)}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>Not specified</span>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Purpose">
                  {request.purpose ? (
                    getPurposeLabel(request.purpose)
                  ) : (
                    <span style={{ color: '#999' }}>Not specified</span>
                  )}
                </Descriptions.Item>
              </>
            )}

            {request.managerInfo ? (
              <Descriptions.Item label="Manager">
                <div>
                  <div>
                    <strong>Name:</strong>{' '}
                    {request.managerInfo.fullName || 'N/A'}
                  </div>
                  <div>
                    <strong>Email:</strong> {request.managerInfo.email || 'N/A'}
                  </div>
                  {request.managerInfo.phone && (
                    <div>
                      <strong>Phone:</strong> {request.managerInfo.phone}
                    </div>
                  )}
                  {request.managerInfo.role && (
                    <div>
                      <strong>Role:</strong> {request.managerInfo.role}
                    </div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <Tag color="processing">{getManagerStatusText()}</Tag>
                  </div>
                </div>
              </Descriptions.Item>
            ) : request.managerUserId ? (
              <Descriptions.Item label="Manager">
                <div>
                  <div>
                    <strong>ID:</strong> {request.managerUserId}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Tag color="processing">{getManagerStatusText()}</Tag>
                  </div>
                </div>
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="Manager">
                <div>
                  <Tag color="default">{getManagerStatusText()}</Tag>
                </div>
              </Descriptions.Item>
            )}

            {request.files && request.files.length > 0 && (
              <Descriptions.Item label="Uploaded Files">
                <FileList files={request.files} />
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Created At">
              {/* <ClockCircleOutlined style={{ marginRight: 8 }} /> */}
              {formatDate(request.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Last Updated">
              {formatDate(request.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Studio Booking Section - only for recording requests */}
        {request.requestType === 'recording' && (
          <Card
            title="🎙️ Studio Booking Information"
            style={{ marginTop: '1.5rem' }}
            loading={loadingBooking}
          >
            {booking ? (
              <Descriptions bordered column={2} size="middle">
                {booking.bookingDate && (
                  <Descriptions.Item label="📅 Booking Date">
                    {booking.bookingDate}
                  </Descriptions.Item>
                )}
                {booking.startTime && booking.endTime && (
                  <Descriptions.Item label="🕒 Time Slot">
                    {booking.startTime} - {booking.endTime}
                  </Descriptions.Item>
                )}
                {booking.durationHours && (
                  <Descriptions.Item label="⏱️ Duration">
                    {booking.durationHours} hours
                  </Descriptions.Item>
                )}
                {booking.status && (
                  <Descriptions.Item label="Status">
                    <Tag
                      color={BOOKING_STATUS_COLORS[booking.status] || 'default'}
                    >
                      {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                    </Tag>
                  </Descriptions.Item>
                )}

                {booking.participants && booking.participants.length > 0 && (
                  <Descriptions.Item label="👥 Participants" span={2}>
                    <Space
                      direction="vertical"
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {booking.participants.map((p, index) => {
                        const roleLabel =
                          p.roleType === 'VOCAL'
                            ? 'Vocal'
                            : p.roleType === 'INSTRUMENT'
                              ? 'Instrument'
                              : p.roleType || 'Participant';

                        const performerLabel =
                          p.performerSource === 'CUSTOMER_SELF'
                            ? 'Self'
                            : p.specialistName || 'Internal artist';

                        const skillLabel = p.skillName
                          ? ` (${p.skillName})`
                          : '';

                        const feeNumber =
                          typeof p.participantFee === 'number'
                            ? p.participantFee
                            : p.participantFee
                              ? Number(p.participantFee)
                              : 0;

                        // Chỉ hiển thị button rate cho recording requests, INTERNAL_ARTIST và khi request completed
                        const canRate =
                          request?.requestType === 'recording' &&
                          request?.status?.toLowerCase() === 'completed' &&
                          p.performerSource === 'INTERNAL_ARTIST' &&
                          p.participantId;
                        const existingReview = p.participantId
                          ? participantReviews[p.participantId]
                          : null;

                        return (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <Tag
                                color={
                                  p.roleType === 'VOCAL' ? 'blue' : 'purple'
                                }
                                style={{ marginRight: 8 }}
                              >
                                {roleLabel}
                              </Tag>
                              <span>
                                {performerLabel}
                                {skillLabel}
                              </span>
                              {feeNumber > 0 && (
                                <span style={{ marginLeft: 8, color: '#666' }}>
                                  - {feeNumber.toLocaleString('vi-VN')} VND
                                </span>
                              )}
                            </div>
                            {canRate && (
                              <Button
                                type="default"
                                icon={<StarOutlined />}
                                size="small"
                                onClick={() =>
                                  handleRateParticipant(p.participantId)
                                }
                              >
                                {existingReview ? 'View Review' : 'Rate'}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </Space>
                  </Descriptions.Item>
                )}

                {booking.requiredEquipment &&
                  booking.requiredEquipment.length > 0 && (
                    <Descriptions.Item label="🎸 Equipment" span={2}>
                      <Space
                        direction="vertical"
                        size="small"
                        style={{ width: '100%' }}
                      >
                        {booking.requiredEquipment.map((eq, index) => (
                          <div key={index}>
                            {eq.equipmentName || 'Equipment'} x {eq.quantity}
                            {eq.totalRentalFee && (
                              <span style={{ marginLeft: 8, color: '#666' }}>
                                - {eq.totalRentalFee.toLocaleString('vi-VN')}{' '}
                                VND
                              </span>
                            )}
                          </div>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}

                <Descriptions.Item label="💰 Participant Fee">
                  {(booking.artistFee || 0).toLocaleString('vi-VN')} VND
                </Descriptions.Item>

                <Descriptions.Item label="🔧 Equipment Fee">
                  {(booking.equipmentRentalFee || 0).toLocaleString('vi-VN')}{' '}
                  VND
                </Descriptions.Item>

                {booking.externalGuestFee !== undefined && (
                  <Descriptions.Item
                    label={(() => {
                      const count =
                        typeof booking.externalGuestCount === 'number'
                          ? booking.externalGuestCount
                          : 0;
                      const freeLimit =
                        typeof booking.freeExternalGuestsLimit === 'number'
                          ? booking.freeExternalGuestsLimit
                          : 0;
                      const paidGuests = Math.max(0, count - freeLimit);
                      const freeGuests = Math.max(0, count - paidGuests);

                      if (count === 0) {
                        return '👥 Guest Fee (0 guests)';
                      }

                      if (paidGuests > 0 && freeLimit > 0) {
                        return `👥 Guest Fee (${count} guests: ${freeGuests} free, ${paidGuests} paid)`;
                      }

                      if (paidGuests > 0) {
                        return `👥 Guest Fee (${count} paid guest${
                          count === 1 ? '' : 's'
                        })`;
                      }

                      return `👥 Guest Fee (${count} free guest${
                        count === 1 ? '' : 's'
                      })`;
                    })()}
                  >
                    {booking.externalGuestFee && booking.externalGuestFee > 0
                      ? `${booking.externalGuestFee.toLocaleString('vi-VN')} VND`
                      : '0 VND'}
                  </Descriptions.Item>
                )}

                {/* Studio fee is derived from totalCost - (artistFee + equipmentRentalFee + externalGuestFee) */}
                {booking.totalCost && (
                  <>
                    <Descriptions.Item label="🏢 Studio Fee">
                      {(() => {
                        const artistFee = booking.artistFee || 0;
                        const equipmentFee = booking.equipmentRentalFee || 0;
                        const guestFee = booking.externalGuestFee || 0;
                        const rawStudioFee =
                          booking.totalCost -
                          artistFee -
                          equipmentFee -
                          guestFee;
                        const studioFee = rawStudioFee > 0 ? rawStudioFee : 0;
                        return `${studioFee.toLocaleString('vi-VN')} VND`;
                      })()}
                    </Descriptions.Item>
                    <Descriptions.Item label="💵 Total Cost" span={2}>
                      <Space>
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#ff4d4f',
                          }}
                        >
                          {booking.totalCost.toLocaleString('vi-VN')} VND
                        </span>
                      </Space>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            ) : (
              <Empty description="No booking information yet" />
            )}
          </Card>
        )}

        {/* Contracts Section */}
        <RequestContractList
          contracts={contracts}
          loading={loadingContracts}
          actionLoading={actionLoading}
          onApprove={handleApproveContract}
          onRequestChange={handleOpenRequestChangeModal}
          onCancel={handleOpenCancelModal}
          formatDate={formatDate}
        />

        {/* Cancel Contract Modal */}
        <CancelContractModal
          visible={cancelModalVisible}
          onCancel={() => {
            setCancelModalVisible(false);
            setSelectedContract(null);
          }}
          onConfirm={handleCancelContract}
          loading={
            selectedContract
              ? actionLoading[selectedContract.contractId]
              : false
          }
          isManager={false}
        />

        {/* Request Change Modal */}
        <Modal
          title="Request Contract Change"
          open={requestChangeModalVisible}
          onOk={handleRequestChange}
          onCancel={() => {
            setRequestChangeModalVisible(false);
            setChangeReason('');
            setSelectedContract(null);
          }}
          confirmLoading={
            selectedContract
              ? actionLoading[selectedContract.contractId]
              : false
          }
          okText="Send Request"
          cancelText="Close"
          width={600}
        >
          <div style={{ marginBottom: 16 }}>
            <p>
              Please enter the reason you want to change contract{' '}
              <strong>{selectedContract?.contractNumber}</strong>
            </p>
          </div>
          <TextArea
            rows={4}
            placeholder="Please enter the reason for requesting changes (minimum 10 characters)..."
            value={changeReason}
            onChange={e => setChangeReason(e.target.value)}
            showCount
            maxLength={500}
          />
        </Modal>

        {/* Chat Popup - Facebook Messenger style */}
        {requestId && (
          <ChatPopup requestId={requestId} roomType="REQUEST_CHAT" />
        )}

        {/* Request Review Modal */}
        <ReviewModal
          open={requestReviewModalVisible}
          onCancel={() => {
            setRequestReviewModalVisible(false);
          }}
          onConfirm={handleSubmitRequestReview}
          loading={requestReviewLoading}
          type="request"
          existingReview={existingRequestReview}
        />
        <ReviewModal
          open={participantReviewModalVisible}
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
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className={styles.pageContainer}>{renderContent()}</div>
    </>
  );
};

export default RequestDetailPage;
