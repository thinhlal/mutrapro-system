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
import { getFilesByRequestId } from '../../../services/fileService';
import { getTaskAssignmentsByMilestone } from '../../../services/taskAssignmentService';
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

const StudioBookingDetailPage = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [artistsInfo, setArtistsInfo] = useState({});
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [requestFiles, setRequestFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [supervisor, setSupervisor] = useState(null);
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    const internalArtists =
      booking?.participants?.filter(
        p => p.performerSource === 'INTERNAL_ARTIST'
      ) || [];
    if (internalArtists.length > 0) {
      loadArtistsInfo();
    }
  }, [booking]);

  useEffect(() => {
    if (booking?.requestId) {
      loadRequestFiles();
    }
  }, [booking]);

  useEffect(() => {
    if (booking?.milestoneId && booking?.contractId) {
      loadSupervisor();
    }
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

  const loadRequestFiles = async () => {
    try {
      setLoadingFiles(true);
      const response = await getFilesByRequestId(booking.requestId);
      if (response?.status === 'success' && response?.data) {
        setRequestFiles(response.data);
      }
    } catch (error) {
      console.error('Error loading request files:', error);
      // Don't show error toast, just log
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadSupervisor = async () => {
    try {
      setLoadingSupervisor(true);
      const response = await getTaskAssignmentsByMilestone(
        booking.contractId,
        booking.milestoneId
      );
      if (response?.status === 'success' && response?.data) {
        // Find recording_supervision task
        const recordingTask = response.data.find(
          task => task.taskType === 'recording_supervision'
        );
        if (recordingTask) {
          // Fetch specialist info
          const specialistResponse = await getSpecialistById(
            recordingTask.specialistId
          );
          if (
            specialistResponse?.status === 'success' &&
            specialistResponse?.data
          ) {
            setSupervisor({
              ...recordingTask,
              specialistInfo: specialistResponse.data,
            });
          }
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
                color={
                  booking.context === 'CONTRACT_RECORDING'
                    ? 'blue'
                    : booking.context === 'PRE_CONTRACT_HOLD'
                      ? 'orange'
                      : booking.context === 'STANDALONE_BOOKING'
                        ? 'green'
                        : 'default'
                }
              >
                {booking.context === 'CONTRACT_RECORDING'
                  ? 'Contract Recording'
                  : booking.context === 'PRE_CONTRACT_HOLD'
                    ? 'Pre-Contract Hold'
                    : booking.context === 'STANDALONE_BOOKING'
                      ? 'Standalone Booking'
                      : booking.context || 'N/A'}
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
                                <Tag>{participant.roleType || 'N/A'}</Tag>
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
                {booking.participants.map((participant, index) => (
                  <Card key={index} size="small">
                    <Space
                      direction="vertical"
                      size="small"
                      style={{ width: '100%' }}
                    >
                      <Space>
                        <Text strong>
                          {participant.specialistName ||
                            participant.specialistId ||
                            'N/A'}
                        </Text>
                        {participant.isPrimary && (
                          <Tag color="gold">Primary</Tag>
                        )}
                      </Space>
                      <Space wrap>
                        <div>
                          <Text type="secondary">Role: </Text>
                          <Tag color="blue">
                            {participant.roleType || 'N/A'}
                          </Tag>
                        </div>
                        <div>
                          <Text type="secondary">Source: </Text>
                          <Tag
                            color={
                              participant.performerSource === 'INTERNAL_ARTIST'
                                ? 'green'
                                : 'orange'
                            }
                          >
                            {participant.performerSource || 'N/A'}
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
                ))}
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
                              {supervisor.specialistInfo?.fullNameSnapshot ||
                                'N/A'}
                            </Text>
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {supervisor.specialistInfo?.emailSnapshot ||
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
                            {supervisor.status?.toUpperCase().replace('_', ' ')}
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

          {/* Request Files (for PRE_CONTRACT_HOLD bookings) */}
          {booking?.context === 'PRE_CONTRACT_HOLD' && booking?.requestId && (
            <div>
              <Title level={4}>Request Files</Title>
              <Spin spinning={loadingFiles}>
                {requestFiles && requestFiles.length > 0 ? (
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
                      {requestFiles.map((file, idx) => (
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
                ) : (
                  <Empty
                    description="No files uploaded"
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
