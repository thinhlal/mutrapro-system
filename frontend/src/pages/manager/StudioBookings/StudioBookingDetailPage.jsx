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
} from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getStudioBookingById } from '../../../services/studioBookingService';
import { getContractById, getMilestoneById } from '../../../services/contractService';
import { getSpecialistById } from '../../../services/specialistService';
import { getTaskAssignmentsByMilestone } from '../../../services/taskAssignmentService';
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
  TENTATIVE: 'Tạm thời',
  PENDING: 'Đang chờ',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// Context Labels
const contextLabels = {
  CONTRACT_RECORDING: 'Contract Recording',
  STANDALONE_BOOKING: 'Standalone Booking',
  PRE_CONTRACT_HOLD: 'Pre Contract Hold',
};

const contextColors = {
  CONTRACT_RECORDING: 'blue',
  STANDALONE_BOOKING: 'green',
  PRE_CONTRACT_HOLD: 'orange',
};

// Task Assignment Status
const taskStatusColors = {
  assigned: 'blue',
  accepted_waiting: 'gold',
  ready_to_start: 'purple',
  in_progress: 'processing',
  ready_for_review: 'orange',
  revision_requested: 'warning',
  in_revision: 'processing',
  delivery_pending: 'cyan',
  waiting_customer_review: 'purple',
  completed: 'success',
  cancelled: 'error',
};

const taskStatusLabels = {
  assigned: 'Đã gán',
  accepted_waiting: 'Đã nhận - Chờ',
  ready_to_start: 'Sẵn sàng làm',
  in_progress: 'Đang thực hiện',
  ready_for_review: 'Chờ duyệt',
  revision_requested: 'Yêu cầu chỉnh sửa',
  in_revision: 'Đang chỉnh sửa',
  delivery_pending: 'Chờ giao hàng',
  waiting_customer_review: 'Chờ Customer review',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

// Task Type Labels
const taskTypeLabels = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording_supervision: 'Recording Supervision',
};

const StudioBookingDetailPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [loadingMilestone, setLoadingMilestone] = useState(false);
  const [artistsInfo, setArtistsInfo] = useState({}); // Map specialistId -> specialist info
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [milestoneTasks, setMilestoneTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBookingDetail();
    }
  }, [bookingId]);

  const loadBookingDetail = async () => {
    try {
      setLoading(true);
      const response = await getStudioBookingById(bookingId);
      if (response?.status === 'success' && response?.data) {
        const booking = response.data;
        setBookingDetail(booking);
        
        // Nếu là CONTRACT_RECORDING, load thêm thông tin contract, milestone và tasks
        if (booking.context === 'CONTRACT_RECORDING' && booking.contractId && booking.milestoneId) {
          loadContractInfo(booking.contractId);
          loadMilestoneInfo(booking.contractId, booking.milestoneId);
          loadMilestoneTasks(booking.contractId, booking.milestoneId);
        }
        
        // Load thông tin artists nếu có
        if (booking.artists && booking.artists.length > 0) {
          loadArtistsInfo(booking.artists);
        }
      } else {
        throw new Error(response?.message || 'Booking not found');
      }
    } catch (error) {
      console.error('Error loading booking detail:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết booking');
      navigate('/manager/studio-bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadContractInfo = async (contractId) => {
    try {
      setLoadingContract(true);
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        setContractInfo(response.data);
      }
    } catch (error) {
      console.warn('Error loading contract info:', error);
      // Không throw error vì contract info không bắt buộc
    } finally {
      setLoadingContract(false);
    }
  };

  const loadMilestoneInfo = async (contractId, milestoneId) => {
    try {
      setLoadingMilestone(true);
      const response = await getMilestoneById(contractId, milestoneId);
      if (response?.status === 'success' && response?.data) {
        setMilestoneInfo(response.data);
      }
    } catch (error) {
      console.warn('Error loading milestone info:', error);
      // Không throw error vì milestone info không bắt buộc
    } finally {
      setLoadingMilestone(false);
    }
  };

  const loadMilestoneTasks = async (contractId, milestoneId) => {
    try {
      setLoadingTasks(true);
      const response = await getTaskAssignmentsByMilestone(contractId, milestoneId);
      if (response?.status === 'success' && Array.isArray(response.data)) {
        setMilestoneTasks(response.data);
      }
    } catch (error) {
      console.warn('Error loading milestone tasks:', error);
      // Không throw error vì tasks không bắt buộc
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadArtistsInfo = async (artists) => {
    try {
      setLoadingArtists(true);
      const specialistIds = artists.map(a => a.specialistId).filter(Boolean);
      
      if (specialistIds.length === 0) {
        setLoadingArtists(false);
        return;
      }
      
      const promises = specialistIds.map(async (specialistId) => {
        try {
          const response = await getSpecialistById(specialistId);
          if (response?.status === 'success' && response?.data) {
            return { specialistId, data: response.data };
          }
          return { specialistId, data: null };
        } catch (error) {
          console.warn(`Error loading specialist ${specialistId}:`, error);
          return { specialistId, data: null };
        }
      });
      
      const results = await Promise.all(promises);
      const infoMap = {};
      results.forEach(({ specialistId, data }) => {
        if (data) {
          infoMap[specialistId] = data;
        }
      });
      setArtistsInfo(infoMap);
    } catch (error) {
      console.error('Error loading artists info:', error);
    } finally {
      setLoadingArtists(false);
    }
  };

  const handleCopyBookingId = (bookingId) => {
    navigator.clipboard.writeText(bookingId);
    message.success('Đã copy Booking ID');
  };

  const handleViewContract = (contractId) => {
    if (contractId) {
      navigate(`/manager/contracts/${contractId}`);
    }
  };

  const handleViewMilestone = (contractId, milestoneId) => {
    if (contractId && milestoneId) {
      navigate(`/manager/milestone-assignments/${contractId}/milestone/${milestoneId}`);
    }
  };

  const handleViewTask = (contractId, assignmentId) => {
    if (contractId && assignmentId) {
      navigate(`/manager/tasks/${contractId}/${assignmentId}`);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Card>
          <Spin size="large" />
        </Card>
      </div>
    );
  }

  if (!bookingDetail) {
    return (
      <div className={styles.container}>
        <Card>
          <Empty description="Không tìm thấy thông tin booking" />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.backRow}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
          <Space size="small" wrap className={styles.headerMeta}>
            <Tag color={bookingStatusColor[bookingDetail.status] || 'default'}>
              {bookingStatusLabels[bookingDetail.status] || bookingDetail.status || 'N/A'}
            </Tag>
            {bookingDetail.context && (
              <Tag color={contextColors[bookingDetail.context] || 'purple'}>
                {contextLabels[bookingDetail.context] || bookingDetail.context}
              </Tag>
            )}
            {bookingDetail.sessionType && (
              <Tag color="blue">{bookingDetail.sessionType}</Tag>
            )}
          </Space>
        </div>
        <div className={styles.headerInfo}>
          <Title level={3} style={{ margin: 0 }}>
            Chi tiết Studio Booking
          </Title>
        </div>
      </div>

      <Card>
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="Booking ID" span={2}>
            <Space>
              <span style={{ fontFamily: 'monospace' }}>{bookingDetail.bookingId}</span>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyBookingId(bookingDetail.bookingId)}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={bookingStatusColor[bookingDetail.status] || 'default'}>
              {bookingStatusLabels[bookingDetail.status] || bookingDetail.status || 'N/A'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Context">
            <Tag color={contextColors[bookingDetail.context] || 'purple'}>
              {contextLabels[bookingDetail.context] || bookingDetail.context || 'N/A'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Session Type">
            <Tag color="blue">{bookingDetail.sessionType || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Studio">
            {bookingDetail.studioName || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày">
            {bookingDetail.bookingDate ? dayjs(bookingDetail.bookingDate).format('DD/MM/YYYY') : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian">
            {bookingDetail.startTime && bookingDetail.endTime
              ? `${bookingDetail.startTime} - ${bookingDetail.endTime}`
              : 'N/A'}
          </Descriptions.Item>
          
          {/* Thông tin Contract và Milestone cho CONTRACT_RECORDING */}
          {bookingDetail.context === 'CONTRACT_RECORDING' && (
            <>
              <Descriptions.Item label="Contract Information" span={2}>
                {loadingContract ? (
                  <Spin size="small" />
                ) : contractInfo ? (
                  <Space direction="vertical" size="small">
                    <Space>
                      <Text strong>Contract ID:</Text>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleViewContract(bookingDetail.contractId)}
                        style={{ padding: 0 }}
                      >
                        {contractInfo.contractId}
                      </Button>
                    </Space>
                    {contractInfo.contractNumber && (
                      <Space>
                        <Text strong>Contract Number:</Text>
                        <Text>{contractInfo.contractNumber}</Text>
                      </Space>
                    )}
                    {contractInfo.contractType && (
                      <Space>
                        <Text strong>Contract Type:</Text>
                        <Tag color="blue">{contractInfo.contractType}</Tag>
                      </Space>
                    )}
                    {contractInfo.status && (
                      <Space>
                        <Text strong>Status:</Text>
                        <Tag color={
                          contractInfo.status === 'signed' ? 'orange' :
                          contractInfo.status === 'active' ? 'green' :
                          contractInfo.status === 'active_pending_assignment' ? 'gold' :
                          contractInfo.status === 'completed' ? 'success' :
                          contractInfo.status === 'cancelled' ? 'error' :
                          'default'
                        }>
                          {contractInfo.status === 'signed' ? 'Đã ký' :
                           contractInfo.status === 'active' ? 'Đang thực thi' :
                           contractInfo.status === 'active_pending_assignment' ? 'Chờ gán task' :
                           contractInfo.status === 'completed' ? 'Hoàn thành' :
                           contractInfo.status === 'cancelled' ? 'Đã hủy' :
                           contractInfo.status}
                        </Tag>
                      </Space>
                    )}
                  </Space>
                ) : (
                  <Space>
                    <Text strong>Contract ID:</Text>
                    {bookingDetail.contractId ? (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleViewContract(bookingDetail.contractId)}
                      >
                        {bookingDetail.contractId}
                      </Button>
                    ) : (
                      'N/A'
                    )}
                  </Space>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Information" span={2}>
                {loadingMilestone ? (
                  <Spin size="small" />
                ) : milestoneInfo ? (
                  <Space direction="vertical" size="small">
                    <Space>
                      <Text strong>Milestone ID:</Text>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleViewMilestone(bookingDetail.contractId, bookingDetail.milestoneId)}
                        style={{ padding: 0 }}
                      >
                        {milestoneInfo.milestoneId}
                      </Button>
                    </Space>
                    {milestoneInfo.orderIndex && (
                      <Space>
                        <Text strong>Order Index:</Text>
                        <Tag color="blue">#{milestoneInfo.orderIndex}</Tag>
                      </Space>
                    )}
                    {milestoneInfo.name && (
                      <Space>
                        <Text strong>Name:</Text>
                        <Text>{milestoneInfo.name}</Text>
                      </Space>
                    )}
                    {milestoneInfo.milestoneType && (
                      <Space>
                        <Text strong>Type:</Text>
                        <Tag color={milestoneInfo.milestoneType === 'recording' ? 'blue' : milestoneInfo.milestoneType === 'arrangement' ? 'purple' : 'default'}>
                          {milestoneInfo.milestoneType}
                        </Tag>
                      </Space>
                    )}
                    {milestoneInfo.workStatus && (
                      <Space>
                        <Text strong>Work Status:</Text>
                        <Tag color={
                          milestoneInfo.workStatus === 'IN_PROGRESS' ? 'processing' :
                          milestoneInfo.workStatus === 'READY_TO_START' ? 'purple' :
                          milestoneInfo.workStatus === 'COMPLETED' ? 'success' :
                          milestoneInfo.workStatus === 'CANCELLED' ? 'error' :
                          milestoneInfo.workStatus === 'WAITING_ASSIGNMENT' ? 'orange' :
                          milestoneInfo.workStatus === 'WAITING_SPECIALIST_ACCEPT' ? 'gold' :
                          milestoneInfo.workStatus === 'WAITING_CUSTOMER' ? 'warning' :
                          milestoneInfo.workStatus === 'READY_FOR_PAYMENT' ? 'gold' :
                          'default'
                        }>
                          {milestoneInfo.workStatus === 'IN_PROGRESS' ? 'Đang thực hiện' :
                           milestoneInfo.workStatus === 'READY_TO_START' ? 'Sẵn sàng bắt đầu' :
                           milestoneInfo.workStatus === 'COMPLETED' ? 'Hoàn thành' :
                           milestoneInfo.workStatus === 'CANCELLED' ? 'Đã hủy' :
                           milestoneInfo.workStatus === 'WAITING_ASSIGNMENT' ? 'Chờ assign task' :
                           milestoneInfo.workStatus === 'WAITING_SPECIALIST_ACCEPT' ? 'Chờ specialist accept' :
                           milestoneInfo.workStatus === 'WAITING_CUSTOMER' ? 'Chờ khách hàng' :
                           milestoneInfo.workStatus === 'READY_FOR_PAYMENT' ? 'Sẵn sàng thanh toán' :
                           milestoneInfo.workStatus}
                        </Tag>
                      </Space>
                    )}
                    {milestoneInfo.description && (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong>Description:</Text>
                        <Text type="secondary">{milestoneInfo.description}</Text>
                      </Space>
                    )}
                  </Space>
                ) : (
                  <Space>
                    <Text strong>Milestone ID:</Text>
                    {bookingDetail.milestoneId ? (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleViewMilestone(bookingDetail.contractId, bookingDetail.milestoneId)}
                      >
                        {bookingDetail.milestoneId}
                      </Button>
                    ) : (
                      'N/A'
                    )}
                  </Space>
                )}
              </Descriptions.Item>
            </>
          )}
          
          {/* Hiển thị Contract ID và Milestone ID cho các loại booking khác */}
          {bookingDetail.context !== 'CONTRACT_RECORDING' && (
            <>
              <Descriptions.Item label="Contract ID" span={2}>
                {bookingDetail.contractId ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleViewContract(bookingDetail.contractId)}
                  >
                    {bookingDetail.contractId}
                  </Button>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone ID" span={2}>
                {bookingDetail.milestoneId ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleViewMilestone(bookingDetail.contractId, bookingDetail.milestoneId)}
                  >
                    {bookingDetail.milestoneId}
                  </Button>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
            </>
          )}
          
          {/* Các field không cần thiết cho CONTRACT_RECORDING */}
          {bookingDetail.context !== 'CONTRACT_RECORDING' && (
            <>
              <Descriptions.Item label="Request ID" span={2}>
                {bookingDetail.requestId || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Purpose" span={2}>
                {bookingDetail.purpose || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Special Instructions" span={2}>
                {bookingDetail.specialInstructions || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {bookingDetail.notes || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="External Guest Count">
                {bookingDetail.externalGuestCount || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Hold Expires At">
                {bookingDetail.holdExpiresAt
                  ? dayjs(bookingDetail.holdExpiresAt).format('DD/MM/YYYY HH:mm')
                  : 'N/A'}
              </Descriptions.Item>
            </>
          )}
          
          {/* Task và Supervisor (cho CONTRACT_RECORDING) */}
          {bookingDetail.context === 'CONTRACT_RECORDING' && bookingDetail.milestoneId && (
            <Descriptions.Item label="Task & Supervisor" span={2}>
              {loadingTasks ? (
                <Spin />
              ) : milestoneTasks.length > 0 ? (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {milestoneTasks
                    .filter(task => task.taskType === 'recording_supervision')
                    .map((task, idx) => (
                      <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Space>
                            <Text strong>Task ID:</Text>
                            <Button
                              type="link"
                              size="small"
                              onClick={() => handleViewTask(bookingDetail.contractId, task.assignmentId)}
                              style={{ padding: 0 }}
                            >
                              {task.assignmentId?.substring(0, 8)}...
                            </Button>
                            <Tag color="blue">
                              {taskTypeLabels[task.taskType] || task.taskType || 'N/A'}
                            </Tag>
                            {task.status && (
                              <Tag color={taskStatusColors[task.status] || 'default'}>
                                {taskStatusLabels[task.status] || task.status}
                              </Tag>
                            )}
                          </Space>
                          {task.specialistId && (
                            <Space>
                              <Text strong>Supervisor (Specialist ID):</Text>
                              <Text copyable={{ text: task.specialistId }} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                {task.specialistId?.substring(0, 8)}...
                              </Text>
                            </Space>
                          )}
                          {task.specialistName && (
                            <Space>
                              <Text strong>Supervisor Name:</Text>
                              <Text>{task.specialistName}</Text>
                            </Space>
                          )}
                          {task.assignedDate && (
                            <Space>
                              <Text strong>Assigned Date:</Text>
                              <Text>{dayjs(task.assignedDate).format('DD/MM/YYYY HH:mm')}</Text>
                            </Space>
                          )}
                        </Space>
                      </Card>
                    ))}
                  {milestoneTasks.filter(task => task.taskType === 'recording_supervision').length === 0 && (
                    <Text type="secondary">Chưa có task recording_supervision được assign</Text>
                  )}
                </Space>
              ) : (
                <Text type="secondary">Chưa có task được assign cho milestone này</Text>
              )}
            </Descriptions.Item>
          )}
          
          {/* Artists (cho luồng 2) */}
          {bookingDetail.artists && bookingDetail.artists.length > 0 && (
            <Descriptions.Item label="Artists" span={2}>
              {loadingArtists ? (
                <Spin />
              ) : (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {bookingDetail.artists.map((artist, idx) => {
                    const specialistInfo = artistsInfo[artist.specialistId];
                    return (
                      <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Space>
                            {specialistInfo?.avatarUrl && (
                              <img
                                src={specialistInfo.avatarUrl}
                                alt={specialistInfo.fullName || 'Artist'}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            )}
                            <Space direction="vertical" size={0}>
                              <Space>
                                <Text strong>
                                  {specialistInfo?.fullName || 'N/A'}
                                </Text>
                                {artist.isPrimary && (
                                  <Tag color="gold">Primary</Tag>
                                )}
                              </Space>
                              {specialistInfo?.email && (
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {specialistInfo.email}
                                </Text>
                              )}
                            </Space>
                          </Space>
                          <Space>
                            <Text strong>Specialist ID:</Text>
                            <Text copyable={{ text: artist.specialistId }} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                              {artist.specialistId?.substring(0, 8)}...
                            </Text>
                          </Space>
                          <Space>
                            <Text strong>Role:</Text>
                            <Tag color={artist.role === 'VOCALIST' ? 'orange' : 'blue'}>
                              {artist.role === 'VOCALIST'
                                ? 'Vocal'
                                : artist.role === 'INSTRUMENT_PLAYER'
                                  ? 'Instrument'
                                  : artist.role || 'N/A'}
                            </Tag>
                          </Space>
                          {specialistInfo && (
                            <>
                              {specialistInfo.experienceYears && (
                                <Space>
                                  <Text strong>Experience:</Text>
                                  <Text>{specialistInfo.experienceYears} years</Text>
                                </Space>
                              )}
                              {specialistInfo.genres && specialistInfo.genres.length > 0 && (
                                <Space wrap>
                                  <Text strong>Genres:</Text>
                                  {specialistInfo.genres.map((genre, gIdx) => (
                                    <Tag key={gIdx} color="purple">{genre}</Tag>
                                  ))}
                                </Space>
                              )}
                            </>
                          )}
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Descriptions.Item>
          )}
          
          {/* Chỉ hiển thị cost cho STANDALONE_BOOKING và PRE_CONTRACT_HOLD */}
          {bookingDetail.context !== 'CONTRACT_RECORDING' && (
            <>
              <Descriptions.Item label="Artist Fee (Total)">
                {bookingDetail.artistFee ? `${bookingDetail.artistFee.toLocaleString()} VND` : '0 VND'}
              </Descriptions.Item>
              <Descriptions.Item label="Equipment Rental Fee">
                {bookingDetail.equipmentRentalFee ? `${bookingDetail.equipmentRentalFee.toLocaleString()} VND` : '0 VND'}
              </Descriptions.Item>
              <Descriptions.Item label="External Guest Fee">
                {bookingDetail.externalGuestFee ? `${bookingDetail.externalGuestFee.toLocaleString()} VND` : '0 VND'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Cost">
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  {bookingDetail.totalCost ? `${bookingDetail.totalCost.toLocaleString()} VND` : '0 VND'}
                </Text>
              </Descriptions.Item>
            </>
          )}
          {/* Reservation fee chỉ cần cho PRE_CONTRACT_HOLD */}
          {bookingDetail.context === 'PRE_CONTRACT_HOLD' && (
            <>
              <Descriptions.Item label="Reservation Fee Amount">
                {bookingDetail.reservationFeeAmount && bookingDetail.reservationFeeAmount > 0
                  ? `${bookingDetail.reservationFeeAmount.toLocaleString()} VND`
                  : '0 VND'}
              </Descriptions.Item>
              <Descriptions.Item label="Reservation Fee Status">
                {bookingDetail.reservationFeeStatus ? (
                  <Tag color={
                    bookingDetail.reservationFeeStatus === 'PAID' ? 'success' :
                    bookingDetail.reservationFeeStatus === 'PENDING' ? 'processing' :
                    bookingDetail.reservationFeeStatus === 'REFUNDED' ? 'default' :
                    bookingDetail.reservationFeeStatus === 'NONE' ? 'default' :
                    'default'
                  }>
                    {bookingDetail.reservationFeeStatus === 'PAID' ? 'Đã thanh toán' :
                     bookingDetail.reservationFeeStatus === 'PENDING' ? 'Đang chờ' :
                     bookingDetail.reservationFeeStatus === 'REFUNDED' ? 'Đã hoàn tiền' :
                     bookingDetail.reservationFeeStatus === 'NONE' ? 'Không có' :
                     bookingDetail.reservationFeeStatus}
                  </Tag>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
              {bookingDetail.reservationWalletTxId && (
                <Descriptions.Item label="Reservation Wallet Transaction ID" span={2}>
                  <Text copyable={{ text: bookingDetail.reservationWalletTxId }} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {bookingDetail.reservationWalletTxId?.substring(0, 8)}...
                  </Text>
                </Descriptions.Item>
              )}
              {bookingDetail.reservationRefundWalletTxId && (
                <Descriptions.Item label="Reservation Refund Transaction ID" span={2}>
                  <Text copyable={{ text: bookingDetail.reservationRefundWalletTxId }} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {bookingDetail.reservationRefundWalletTxId?.substring(0, 8)}...
                  </Text>
                </Descriptions.Item>
              )}
              {bookingDetail.reservationAppliedToMilestoneId && (
                <Descriptions.Item label="Reservation Applied To Milestone" span={2}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleViewMilestone(bookingDetail.contractId, bookingDetail.reservationAppliedToMilestoneId)}
                  >
                    {bookingDetail.reservationAppliedToMilestoneId?.substring(0, 8)}...
                  </Button>
                </Descriptions.Item>
              )}
            </>
          )}
          <Descriptions.Item label="Created At">
            {bookingDetail.createdAt
              ? dayjs(bookingDetail.createdAt).format('DD/MM/YYYY HH:mm')
              : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Updated At">
            {bookingDetail.updatedAt
              ? dayjs(bookingDetail.updatedAt).format('DD/MM/YYYY HH:mm')
              : 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default StudioBookingDetailPage;

