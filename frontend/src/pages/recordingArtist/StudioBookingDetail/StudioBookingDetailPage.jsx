import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Descriptions,
  Empty,
  Avatar,
} from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getStudioBookingById } from '../../../services/studioBookingService';
import { getSpecialistById } from '../../../services/specialistService';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getPurposeLabel } from '../../../constants';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import styles from './StudioBookingDetailPage.module.css';

const { Title, Text } = Typography;

// Booking Status
const bookingStatusColor = {
  TENTATIVE: 'default',
  PENDING: 'processing',
  CONFIRMED: 'success',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const bookingStatusLabels = {
  TENTATIVE: 'Tentative',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Session Type Labels (match RecordingSessionType enum)
const sessionTypeLabels = {
  ARTIST_ASSISTED: 'Artist Assisted',
  SELF_RECORDING: 'Self Recording',
  HYBRID: 'Hybrid (Self + Artist Assisted)',
};

// Performer Source Labels
const performerSourceLabels = {
  INTERNAL_ARTIST: 'Internal Artist',
  CUSTOMER_SELF: 'Customer (Self)',
  EXTERNAL_GUEST: 'External Guest',
};

// Role Type Labels
const roleTypeLabels = {
  VOCAL: 'Vocal',
  INSTRUMENT: 'Instrument',
};

// Request Status Labels
const requestStatusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

// Supervisor Status Labels (AssignmentStatus)
const supervisorStatusLabels = {
  ready_to_start: 'Ready to Start',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Booking Context Labels
const bookingContextLabels = {
  CONTRACT_RECORDING: 'Contract Recording',
  PRE_CONTRACT_HOLD: 'Pre-Contract Hold',
  STANDALONE_BOOKING: 'Standalone Booking',
};

const bookingContextColors = {
  CONTRACT_RECORDING: 'blue',
  PRE_CONTRACT_HOLD: 'orange',
  STANDALONE_BOOKING: 'green',
};

const StudioBookingDetailPage = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [artistsInfo, setArtistsInfo] = useState({});
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [supervisor, setSupervisor] = useState(null);
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);
  const [request, setRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  // Tối ưu: Load tất cả data parallel sau khi booking load xong
  useEffect(() => {
    if (!booking) return;

    // Load request info và artists info parallel (không phụ thuộc nhau)
    const loadAllData = async () => {
      const promises = [];
      
      // Load request info nếu có requestId
      if (booking.requestId) {
        promises.push(loadRequestInfo());
      }
      
      // Load artists info nếu có INTERNAL_ARTIST participants
      const internalArtists =
        booking?.participants?.filter(
          p => p.performerSource === 'INTERNAL_ARTIST'
        ) || [];
      if (internalArtists.length > 0) {
        promises.push(loadArtistsInfo());
      }
      
      // Load supervisor info nếu có supervisor
      if (booking.supervisor) {
        promises.push(loadSupervisor());
      }
      
      // Chạy tất cả parallel
      await Promise.allSettled(promises);
    };

    loadAllData();
  }, [booking]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const response = await getStudioBookingById(bookingId);
      if (response?.status === 'success' && response?.data) {
        setBooking(response.data);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      message.error(error?.message || 'Error loading booking details');
    } finally {
      setLoading(false);
    }
  };

  const loadArtistsInfo = async () => {
    try {
      setLoadingArtists(true);
      const internalArtists =
        booking?.participants?.filter(
          p => p.performerSource === 'INTERNAL_ARTIST'
        ) || [];
      const artistIds = internalArtists
        .map(p => p.specialistId)
        .filter(Boolean);
      const infoPromises = artistIds.map(id =>
        getSpecialistById(id).catch(err => {
          console.warn(`Failed to load specialist ${id}:`, err);
          return null;
        })
      );
      const results = await Promise.all(infoPromises);
      const infoMap = {};
      results.forEach((result, index) => {
        if (result?.status === 'success' && result?.data) {
          infoMap[artistIds[index]] = result.data;
        }
      });
      setArtistsInfo(infoMap);
    } catch (error) {
      console.error('Error loading artists info:', error);
    } finally {
      setLoadingArtists(false);
    }
  };

  const loadRequestInfo = async () => {
    if (!booking?.requestId) return;
    try {
      setLoadingRequest(true);
      const response = await getServiceRequestById(booking.requestId);
      if (response?.status === 'success' && response?.data) {
        setRequest(response.data);
      }
    } catch (error) {
      console.error('Error loading request info:', error);
      // Don't show error toast, just log
    } finally {
      setLoadingRequest(false);
    }
  };

  const loadSupervisor = async () => {
    try {
      setLoadingSupervisor(true);
      // Supervisor info is now included in booking response
      if (booking?.supervisor) {
        // Fetch full specialist info for display
        if (booking.supervisor.specialistId) {
          try {
            const specialistResponse = await getSpecialistById(
              booking.supervisor.specialistId
            );
            if (
              specialistResponse?.status === 'success' &&
              specialistResponse?.data
            ) {
              setSupervisor({
                ...booking.supervisor,
                specialistInfo: specialistResponse.data,
              });
            } else {
              // Fallback: use supervisor info from booking response
              setSupervisor(booking.supervisor);
            }
          } catch (error) {
            console.warn('Error loading specialist info for supervisor:', error);
            // Fallback: use supervisor info from booking response
            setSupervisor(booking.supervisor);
          }
        } else {
          setSupervisor(booking.supervisor);
        }
      }
    } catch (error) {
      console.error('Error loading supervisor:', error);
      // Don't show error toast, just log
    } finally {
      setLoadingSupervisor(false);
    }
  };

  const handleCopyBookingId = () => {
    if (booking?.bookingId) {
      navigator.clipboard.writeText(booking.bookingId);
      message.success('Booking ID copied');
    }
  };

  const handleBack = () => {
    navigate('/recording-artist/studio-bookings');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.container}>
        <Empty description="Booking not found" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div className={styles.header}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Back
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Studio Booking Detail
              </Title>
            </Space>
            <Button icon={<CopyOutlined />} onClick={handleCopyBookingId}>
              Copy Booking ID
            </Button>
          </div>

          {/* Booking Information */}
          <Descriptions
            title="Booking Information"
            bordered
            column={2}
            size="middle"
          >
            <Descriptions.Item label="Booking ID" span={2}>
              <Space>
                <Text code>{booking.bookingId}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={bookingStatusColor[booking.status]}>
                {bookingStatusLabels[booking.status] || booking.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Context">
              <Tag
                color={bookingContextColors[booking.context] || 'default'}
              >
                {bookingContextLabels[booking.context] ||
                  booking.context ||
                  'N/A'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Booking Date">
              {booking.bookingDate
                ? dayjs(booking.bookingDate).format('DD/MM/YYYY')
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {booking.startTime && booking.endTime
                ? `${booking.startTime} - ${booking.endTime}`
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {booking.durationHours ? `${booking.durationHours} hours` : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Studio">
              {booking.studioName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Session Type">
              <Tag color="purple">
                {sessionTypeLabels[booking.sessionType] ||
                  booking.sessionType ||
                  'N/A'}
              </Tag>
            </Descriptions.Item>
            {booking.totalCost != null && (
              <Descriptions.Item label="Total Cost" span={2}>
                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  {booking.totalCost.toLocaleString('vi-VN')} ₫
                </Text>
              </Descriptions.Item>
            )}
            {booking.purpose && (
              <Descriptions.Item label="Purpose" span={2}>
                {getPurposeLabel(booking.purpose)}
              </Descriptions.Item>
            )}
            {booking.specialInstructions && (
              <Descriptions.Item label="Special Instructions" span={2}>
                {booking.specialInstructions}
              </Descriptions.Item>
            )}
            {booking.notes && (
              <Descriptions.Item label="Notes" span={2}>
                {booking.notes}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Request Information */}
          {booking?.requestId && (
            <Card title="Request Information" loading={loadingRequest}>
              {request ? (
                <>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Request ID" span={1}>
                      <Text code style={{ fontSize: '12px' }}>
                        {request.requestId}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Service Type" span={1}>
                      <Tag color="purple">
                        {request.requestType
                          ? request.requestType === 'transcription'
                            ? 'Transcription'
                            : request.requestType === 'arrangement'
                              ? 'Arrangement'
                              : request.requestType === 'arrangement_with_recording'
                                ? 'Arrangement with Recording'
                                : request.requestType === 'recording'
                                  ? 'Recording'
                                  : request.requestType
                          : 'N/A'}
                      </Tag>
                    </Descriptions.Item>
                    {request.title && (
                      <Descriptions.Item label="Title" span={2}>
                        <Text strong>{request.title}</Text>
                      </Descriptions.Item>
                    )}
                    {request.description && (
                      <Descriptions.Item label="Description" span={2}>
                        <Text>{request.description}</Text>
                      </Descriptions.Item>
                    )}
                    {request.genre && (
                      <Descriptions.Item label="Genre" span={1}>
                        <Tag>{request.genre}</Tag>
                      </Descriptions.Item>
                    )}
                    {request.status && (
                      <Descriptions.Item label="Status" span={1}>
                        <Tag
                          color={
                            request.status === 'completed'
                              ? 'success'
                              : request.status === 'cancelled' ||
                                  request.status === 'rejected'
                                ? 'error'
                                : request.status === 'in_progress'
                                  ? 'processing'
                                  : 'default'
                          }
                        >
                          {requestStatusLabels[request.status?.toLowerCase()] ||
                            request.status}
                        </Tag>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Request Files (for PRE_CONTRACT_HOLD bookings) */}
                  {booking?.context === 'PRE_CONTRACT_HOLD' && (() => {
                    // Filter chỉ lấy customer_upload files từ request.files
                    // Contract PDF được lấy riêng ở contract detail page
                    const customerUploadFiles =
                      request?.files?.filter(
                        file => file.fileSource === 'customer_upload'
                      ) || [];
                    
                    return customerUploadFiles.length > 0 ? (
                      <div style={{ marginTop: 16 }}>
                        <Title level={5} style={{ marginBottom: 8 }}>
                          Uploaded Files
                        </Title>
                        <div
                          style={{
                            padding: 12,
                            background: '#f5f5f5',
                            borderRadius: 4,
                          }}
                        >
                          <Space
                            direction="vertical"
                            size="small"
                            style={{ width: '100%' }}
                          >
                            {customerUploadFiles.map((file, idx) => (
                              <Button
                                key={idx}
                                type="link"
                                size="small"
                                icon={<FileOutlined />}
                                onClick={() =>
                                  downloadFileHelper(file.fileId, file.fileName)
                                }
                                style={{ padding: 0, height: 'auto' }}
                              >
                                {file.fileName}
                                {file.fileSize && (
                                  <Text
                                    type="secondary"
                                    style={{ marginLeft: 8, fontSize: '11px' }}
                                  >
                                    ({(file.fileSize / 1024 / 1024).toFixed(2)} MB)
                                  </Text>
                                )}
                              </Button>
                            ))}
                          </Space>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </>
              ) : (
                !loadingRequest && (
                  <Empty
                    description="Request information not available"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )
              )}
            </Card>
          )}

          {/* Artists Information (CONTRACT_RECORDING) */}
          {() => {
            const internalArtists =
              booking?.participants?.filter(
                p => p.performerSource === 'INTERNAL_ARTIST'
              ) || [];
            return (
              internalArtists.length > 0 && (
                <div>
                  <Title level={4}>Artists (Contract Recording)</Title>
                  <Spin spinning={loadingArtists}>
                    <Space
                      direction="vertical"
                      size="middle"
                      style={{ width: '100%' }}
                    >
                      {internalArtists.map((participant, index) => {
                        const specialistInfo =
                          artistsInfo[participant.specialistId];
                        return (
                          <Card key={index} size="small">
                            <Space
                              direction="vertical"
                              size="small"
                              style={{ width: '100%' }}
                            >
                              <Space>
                                <Avatar
                                  src={specialistInfo?.avatarUrl}
                                  size={40}
                                >
                                  {specialistInfo?.fullNameSnapshot?.[0] || 'A'}
                                </Avatar>
                                <div>
                                  <div>
                                    <Text strong>
                                      {specialistInfo?.fullNameSnapshot ||
                                        'N/A'}
                                    </Text>
                                  </div>
                                  <div>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: '12px' }}
                                    >
                                      {specialistInfo?.emailSnapshot || 'N/A'}
                                    </Text>
                                  </div>
                                </div>
                              </Space>
                              <Space>
                                <Text type="secondary">Role:</Text>
                                <Tag>
                                  {roleTypeLabels[participant.roleType] ||
                                    participant.roleType ||
                                    'N/A'}
                                </Tag>
                              </Space>
                              {participant.isPrimary && (
                                <Tag color="gold">Primary Artist</Tag>
                              )}
                              {participant.participantFee != null &&
                                participant.participantFee > 0 && (
                                  <div>
                                    <Text type="secondary">Fee: </Text>
                                    <Text strong>
                                      {participant.participantFee.toLocaleString(
                                        'vi-VN'
                                      )}{' '}
                                      ₫
                                    </Text>
                                  </div>
                                )}
                            </Space>
                          </Card>
                        );
                      })}
                    </Space>
                  </Spin>
                </div>
              )
            );
          }}
          {/* Participants Information (PRE_CONTRACT_HOLD, STANDALONE_BOOKING) */}
          {booking.participants && booking.participants.length > 0 && (
            <div>
              <Title level={4}> Participants</Title>
              <Space
                direction="vertical"
                size="middle"
                style={{ width: '100%' }}
              >
                {booking.participants.map((participant, index) => {
                  // Xác định tên hiển thị dựa trên performerSource
                  let displayName = 'N/A';
                  if (participant.performerSource === 'CUSTOMER_SELF') {
                    displayName = 'Customer (Self)';
                  } else if (participant.performerSource === 'INTERNAL_ARTIST') {
                    displayName = participant.specialistName || participant.specialistId || 'Internal Artist';
                  } else if (participant.performerSource === 'EXTERNAL_GUEST') {
                    displayName = participant.name || 'External Guest';
                  } else {
                    displayName = participant.specialistName || participant.specialistId || 'N/A';
                  }

                  return (
                    <Card key={index} size="small">
                      <Space
                        direction="vertical"
                        size="small"
                        style={{ width: '100%' }}
                      >
                        <Space>
                          <Text strong>{displayName}</Text>
                          {participant.isPrimary && (
                            <Tag color="gold">Primary</Tag>
                          )}
                        </Space>
                        <Space wrap>
                          <div>
                            <Text type="secondary">Role: </Text>
                            <Tag color="blue">
                              {roleTypeLabels[participant.roleType] ||
                                participant.roleType ||
                                'N/A'}
                            </Tag>
                          </div>
                          <div>
                            <Text type="secondary">Source: </Text>
                            <Tag
                              color={
                                participant.performerSource === 'INTERNAL_ARTIST'
                                  ? 'green'
                                  : participant.performerSource === 'CUSTOMER_SELF'
                                    ? 'orange'
                                    : 'default'
                              }
                            >
                              {performerSourceLabels[participant.performerSource] ||
                                participant.performerSource ||
                                'N/A'}
                            </Tag>
                          </div>
                          {participant.skillName && (
                            <div>
                              <Text type="secondary">Skill: </Text>
                              <Tag>{participant.skillName}</Tag>
                            </div>
                          )}
                        </Space>
                      {participant.participantFee != null &&
                        participant.participantFee > 0 && (
                          <div>
                            <Text type="secondary">Fee: </Text>
                            <Text strong style={{ color: '#1890ff' }}>
                              {participant.participantFee.toLocaleString(
                                'vi-VN'
                              )}{' '}
                              ₫
                            </Text>
                            <Text
                              type="secondary"
                              style={{ marginLeft: 8, fontSize: '12px' }}
                            >
                              ({booking.durationHours}h ×{' '}
                              {(
                                participant.participantFee /
                                booking.durationHours
                              ).toLocaleString('vi-VN')}{' '}
                              ₫/h)
                            </Text>
                          </div>
                        )}
                    </Space>
                  </Card>
                  );
                })}
              </Space>
            </div>
          )}

          {/* Required Equipment */}
          {booking.requiredEquipment &&
            booking.requiredEquipment.length > 0 && (
              <div>
                <Title level={4}>Required Equipment</Title>
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: '100%' }}
                >
                  {booking.requiredEquipment.map((equipment, index) => (
                    <Card key={index} size="small">
                      <Space
                        direction="vertical"
                        size="small"
                        style={{ width: '100%' }}
                      >
                        <Text strong>
                          {equipment.equipmentName ||
                            equipment.equipmentId ||
                            'N/A'}
                        </Text>
                        <Space wrap>
                          <div>
                            <Text type="secondary">Quantity: </Text>
                            <Tag color="cyan">{equipment.quantity || 1}</Tag>
                          </div>
                          {equipment.rentalFeePerUnit != null && (
                            <div>
                              <Text type="secondary">Fee/Unit: </Text>
                              <Text>
                                {equipment.rentalFeePerUnit.toLocaleString(
                                  'vi-VN'
                                )}{' '}
                                ₫/h
                              </Text>
                            </div>
                          )}
                        </Space>
                        {equipment.totalRentalFee != null &&
                          equipment.totalRentalFee > 0 && (
                            <div>
                              <Text type="secondary">Total Fee: </Text>
                              <Text strong style={{ color: '#1890ff' }}>
                                {equipment.totalRentalFee.toLocaleString(
                                  'vi-VN'
                                )}{' '}
                                ₫
                              </Text>
                              <Text
                                type="secondary"
                                style={{ marginLeft: 8, fontSize: '12px' }}
                              >
                                ({equipment.quantity} × {booking.durationHours}h
                                ×{' '}
                                {equipment.rentalFeePerUnit.toLocaleString(
                                  'vi-VN'
                                )}{' '}
                                ₫/h)
                              </Text>
                            </div>
                          )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </div>
            )}

          {/* Recording Supervisor (for recording bookings) */}
          {(booking?.context === 'PRE_CONTRACT_HOLD' ||
            booking?.context === 'CONTRACT_RECORDING') && (
            <div>
              <Title level={4}> Recording Supervisor</Title>
              <Spin spinning={loadingSupervisor}>
                {supervisor ? (
                  <Card size="small">
                    <Space
                      direction="vertical"
                      size="small"
                      style={{ width: '100%' }}
                    >
                      <Space>
                        <Avatar
                          src={supervisor.specialistInfo?.avatarUrl}
                          icon={<UserOutlined />}
                          size={48}
                        />
                        <div>
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>
                              {supervisor.specialistInfo?.fullName ||
                                supervisor.specialistName ||
                                'N/A'}
                            </Text>
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {supervisor.specialistInfo?.email ||
                                supervisor.specialistEmail ||
                                'N/A'}
                            </Text>
                          </div>
                        </div>
                      </Space>
                      <Space wrap>
                        <div>
                          <Text type="secondary">Task Status: </Text>
                          <Tag
                            color={
                              supervisor.status === 'completed'
                                ? 'success'
                                : supervisor.status === 'in_progress'
                                  ? 'processing'
                                  : supervisor.status === 'ready_to_start'
                                    ? 'blue'
                                    : 'default'
                            }
                          >
                            {supervisorStatusLabels[supervisor.status] ||
                              supervisor.status?.toUpperCase().replace('_', ' ') ||
                              'N/A'}
                          </Tag>
                        </div>
                        {supervisor.plannedStartAt && (
                          <div>
                            <Text type="secondary">Planned Start: </Text>
                            <Text>
                              {dayjs(supervisor.plannedStartAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Text>
                          </div>
                        )}
                      </Space>
                    </Space>
                  </Card>
                ) : (
                  <Empty
                    description="No supervisor assigned"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Spin>
            </div>
          )}

          {/* Arrangement Final Files (for recording milestones) */}
          {booking?.context === 'CONTRACT_RECORDING' &&
            booking?.sourceArrangementSubmission && (
              <div>
                <Title level={4}>Arrangement Final Files</Title>
                <div
                  style={{
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {booking.sourceArrangementSubmission.submissionName}
                      (v{booking.sourceArrangementSubmission.version})
                    </Text>
                    {booking.sourceArrangementSubmission.files &&
                      booking.sourceArrangementSubmission.files.length > 0 && (
                        <Space
                          direction="vertical"
                          size="small"
                          style={{ width: '100%' }}
                        >
                          {booking.sourceArrangementSubmission.files.map(
                            (file, idx) => (
                              <Button
                                key={idx}
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() =>
                                  downloadFileHelper(file.fileId, file.fileName)
                                }
                                style={{ padding: 0, height: 'auto' }}
                              >
                                {file.fileName}
                                {file.fileSize && (
                                  <Text
                                    type="secondary"
                                    style={{ marginLeft: 8, fontSize: '11px' }}
                                  >
                                    ({(file.fileSize / 1024 / 1024).toFixed(2)}{' '}
                                    MB)
                                  </Text>
                                )}
                              </Button>
                            )
                          )}
                        </Space>
                      )}
                  </Space>
                </div>
              </div>
            )}
        </Space>
      </Card>
    </div>
  );
};

export default StudioBookingDetailPage;
