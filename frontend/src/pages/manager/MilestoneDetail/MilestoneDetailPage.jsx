import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Table,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CopyOutlined,
  UserAddOutlined,
  ExclamationCircleOutlined,
  StarFilled,
  CalendarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getTaskAssignmentsByMilestone } from '../../../services/taskAssignmentService';
import {
  getContractById,
  getMilestoneById,
} from '../../../services/contractService';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getBookingByRequestId } from '../../../services/studioBookingService';
import { formatDurationMMSS } from '../../../utils/timeUtils';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import styles from './MilestoneDetailPage.module.css';

const { Title, Text } = Typography;

const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording_supervision: 'Recording Supervision',
};

const MILESTONE_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording: 'Recording',
};

const REQUEST_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording: 'Recording',
  arrangement_with_recording: 'Arrangement + Recording',
};

const STATUS_COLORS = {
  assigned: 'blue',
  accepted_waiting: 'gold',
  ready_to_start: 'purple',
  in_progress: 'processing',
  in_revision: 'processing',
  waiting_customer_review: 'purple',
  ready_for_review: 'orange',
  revision_requested: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABELS = {
  assigned: 'Assigned',
  accepted_waiting: 'Accepted - Waiting',
  ready_to_start: 'Ready to start',
  in_progress: 'In progress',
  in_revision: 'In revision',
  waiting_customer_review: 'Waiting customer review',
  ready_for_review: 'Ready for review',
  revision_requested: 'Revision requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const WORK_STATUS_COLORS = {
  planned: 'default',
  waiting_assignment: 'orange',
  waiting_specialist_accept: 'gold',
  task_accepted_waiting_activation: 'lime',
  ready_to_start: 'purple',
  in_progress: 'processing',
  waiting_customer: 'orange',
  ready_for_payment: 'gold',
  completed: 'success',
  cancelled: 'error',
};

const WORK_STATUS_LABELS = {
  planned: 'Planned',
  waiting_assignment: 'Waiting assignment',
  waiting_specialist_accept: 'Waiting specialist accept',
  task_accepted_waiting_activation: 'Accepted, waiting activation',
  ready_to_start: 'Ready to start',
  in_progress: 'In progress',
  waiting_customer: 'Waiting customer',
  ready_for_payment: 'Ready for payment',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const FILE_STATUS_LABELS = {
  uploaded: 'Uploaded',
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  delivered: 'Delivered',
};

const FILE_STATUS_COLORS = {
  uploaded: 'default',
  pending_review: 'processing',
  approved: 'success',
  rejected: 'error',
  delivered: 'green',
};

const getActualStartDayjs = milestone =>
  milestone?.actualStartAt ? dayjs(milestone.actualStartAt) : null;

const getPlannedStartDayjs = milestone =>
  milestone?.plannedStartAt ? dayjs(milestone.plannedStartAt) : null;

const getPlannedDeadlineDayjs = milestone => {
  if (!milestone?.plannedDueDate) return null;
  const d = dayjs(milestone.plannedDueDate);
  return d.isValid() ? d : null;
};

const getActualDeadlineDayjs = milestone => {
  if (!milestone?.targetDeadline) return null;
  const d = dayjs(milestone.targetDeadline);
  return d.isValid() ? d : null;
};

const getEstimatedDeadlineDayjs = (milestone, _contractMilestones = []) => {
  if (!milestone?.estimatedDeadline) return null;
  const d = dayjs(milestone.estimatedDeadline);
  return d.isValid() ? d : null;
};

const formatDateTime = value =>
  value ? dayjs(value).format('HH:mm DD/MM/YYYY') : '—';

const MilestoneDetailPage = () => {
  const { contractId, milestoneId } = useParams();
  const navigate = useNavigate();
  const { instruments: instrumentsData, fetchInstruments } =
    useInstrumentStore();
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState(null);
  const [contract, setContract] = useState(null);
  const [request, setRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [milestoneTasks, setMilestoneTasks] = useState([]);
  const [milestoneTasksLoading, setMilestoneTasksLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const fetchRequestInfo = useCallback(async requestId => {
    if (!requestId) return;
    try {
      setRequestLoading(true);
      const response = await getServiceRequestById(requestId);
      if (response?.status === 'success' && response?.data) {
        setRequest(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch request info:', error);
      // Không throw error vì request info không bắt buộc
    } finally {
      setRequestLoading(false);
    }
  }, []);

  const fetchBookingInfo = useCallback(async requestId => {
    if (!requestId) return;
    try {
      const response = await getBookingByRequestId(requestId);
      if (response?.status === 'success' && response?.data) {
        setBookingData(response.data);
      } else {
        setBookingData(null);
      }
    } catch (error) {
      console.warn('Failed to fetch booking info for milestone detail:', error);
      setBookingData(null);
    }
  }, []);

  const fetchMilestoneTasks = useCallback(
    async (contractIdValue, milestoneIdValue) => {
      if (!contractIdValue || !milestoneIdValue) {
        setMilestoneTasks([]);
        return;
      }
      try {
        setMilestoneTasksLoading(true);
        const response = await getTaskAssignmentsByMilestone(
          contractIdValue,
          milestoneIdValue
        );
        if (response?.status === 'success' && Array.isArray(response.data)) {
          const sorted = [...response.data].sort((a, b) => {
            const aTime = a.assignedDate || a.createdAt || null;
            const bTime = b.assignedDate || b.createdAt || null;
            if (!aTime && !bTime) return 0;
            if (!aTime) return 1;
            if (!bTime) return -1;
            return dayjs(bTime).valueOf() - dayjs(aTime).valueOf();
          });
          setMilestoneTasks(sorted);
        } else {
          setMilestoneTasks([]);
        }
      } catch (error) {
        console.warn('Không thể tải danh sách task của milestone:', error);
        setMilestoneTasks([]);
      } finally {
        setMilestoneTasksLoading(false);
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    if (!contractId || !milestoneId) return;

    try {
      setLoading(true);
      const [milestoneResponse, contractResponse] = await Promise.all([
        getMilestoneById(contractId, milestoneId),
        getContractById(contractId).catch(error => {
          console.warn('Failed to fetch contract info:', error);
          return null;
        }),
      ]);

      if (milestoneResponse?.status === 'success' && milestoneResponse?.data) {
        setMilestone(milestoneResponse.data);
      } else {
        throw new Error(milestoneResponse?.message || 'Milestone not found');
      }

      if (contractResponse?.status === 'success' && contractResponse?.data) {
        setContract(contractResponse.data);
      }

      // Load tất cả dữ liệu song song để tối ưu performance
      const promises = [fetchMilestoneTasks(contractId, milestoneId)];

      // Chỉ load request info (và booking nếu cần) nếu có requestId
      if (
        contractResponse?.status === 'success' &&
        contractResponse?.data?.requestId
      ) {
        const reqId = contractResponse.data.requestId;
        promises.push(fetchRequestInfo(reqId));

        // Nếu contract là recording thì load thêm booking (dùng để xem lịch phòng)
        if (contractResponse.data.contractType === 'recording') {
          promises.push(fetchBookingInfo(reqId));
        }
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching milestone detail:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết milestone');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [
    contractId,
    milestoneId,
    fetchMilestoneTasks,
    fetchRequestInfo,
    navigate,
  ]);

  useEffect(() => {
    if (contractId && milestoneId) {
      loadData();
    }
  }, [contractId, milestoneId, loadData]);

  const milestoneOrder = useMemo(() => {
    if (!milestone) return null;
    return (
      milestone.milestoneOrderIndex ??
      milestone.orderIndex ??
      milestone.sequence ??
      null
    );
  }, [milestone]);

  const workStatus = useMemo(() => {
    if (!milestone) return null;
    return milestone.workStatus?.toLowerCase();
  }, [milestone]);

  const milestoneTitle = useMemo(() => {
    if (!milestone) return 'Milestone';
    return (
      milestone.name ||
      (milestone.orderIndex ? `Milestone ${milestone.orderIndex}` : 'Milestone')
    );
  }, [milestone]);

  // Kiểm tra xem có task active (assigned, in_progress, in_revision, waiting_customer_review, revision_requested) không
  const hasActiveTask = useMemo(() => {
    return milestoneTasks.some(task => {
      const status = task.status?.toLowerCase();
      return (
        status === 'assigned' ||
        status === 'accepted_waiting' ||
        status === 'ready_to_start' ||
        status === 'in_progress' ||
        status === 'ready_for_review' ||
        status === 'revision_requested' ||
        status === 'in_revision' ||
        status === 'delivery_pending' ||
        status === 'waiting_customer_review'
      );
    });
  }, [milestoneTasks]);

  // Kiểm tra xem có thể hiển thị nút Assign Task không
  const canShowAssignButton = useMemo(() => {
    // Không hiện nếu milestone đã completed hoặc cancelled
    if (workStatus === 'completed' || workStatus === 'cancelled') {
      return false;
    }

    // Không hiện nếu có task đang active
    if (hasActiveTask) {
      return false;
    }

    // Chỉ chặn nếu có task đã completed (không chặn nếu cancelled vì có thể assign task mới)
    if (milestoneTasks.length > 0) {
      const hasCompletedTask = milestoneTasks.some(task => {
        const status = task.status?.toLowerCase();
        return status === 'completed';
      });
      if (hasCompletedTask) {
        return false;
      }
    }

    return true;
  }, [workStatus, hasActiveTask, milestoneTasks]);

  // Kiểm tra xem có thể hiển thị nút Book Studio không
  // Chỉ hiện khi: milestone là recording, contract là arrangement_with_recording, và tất cả arrangement milestones đã completed VÀ đã thanh toán (actualEndAt != null)
  const canShowBookStudioButton = useMemo(() => {
    // Chỉ cho recording milestone
    if (milestone?.milestoneType !== 'recording') {
      return false;
    }

    // Contract phải là arrangement_with_recording
    if (contract?.contractType !== 'arrangement_with_recording') {
      return false;
    }

    // Contract phải active
    if (
      contract?.status !== 'active' &&
      contract?.status !== 'active_pending_assignment'
    ) {
      return false;
    }

    // Check tất cả arrangement milestones đã completed
    if (contract?.milestones && Array.isArray(contract.milestones)) {
      const arrangementMilestones = contract.milestones.filter(
        m => m.milestoneType === 'arrangement'
      );

      if (arrangementMilestones.length === 0) {
        return false; // Không có arrangement milestone
      }

      // Tất cả arrangement milestones phải completed hoặc ready_for_payment
      const allArrangementsCompleted = arrangementMilestones.every(m => {
        const status = m.workStatus?.toLowerCase();
        return status === 'completed' || status === 'ready_for_payment';
      });

      if (!allArrangementsCompleted) {
        return false; // Chưa có arrangement milestone nào completed
      }

      // ⚠️ QUAN TRỌNG: Arrangement milestone cuối cùng phải đã thanh toán (actualEndAt != null)
      // Backend yêu cầu actualEndAt phải có trước khi cho phép tạo booking
      const lastArrangementMilestone =
        arrangementMilestones[arrangementMilestones.length - 1];
      if (!lastArrangementMilestone.actualEndAt) {
        return false; // Arrangement milestones chưa thanh toán, chưa thể tạo booking
      }
    }

    // Milestone chưa completed hoặc cancelled
    if (workStatus === 'completed' || workStatus === 'cancelled') {
      return false;
    }

    // Check xem đã có booking chưa (qua studioBookingId trong task)
    // Nếu đã có task và task đã có studioBookingId thì không hiện nút "Book Studio" nữa
    // Lưu ý: Có thể tạo booking trước khi có task, nên chỉ check nếu đã có task
    if (milestoneTasks && milestoneTasks.length > 0) {
      const hasBooking = milestoneTasks.some(task => {
        return task.studioBookingId && task.studioBookingId.trim() !== '';
      });

      if (hasBooking) {
        return false; // Đã có booking rồi
      }

      return true;
    }
  }, [milestone, contract, workStatus, milestoneTasks]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!milestone) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="Milestone not found" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
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
            {contract?.contractNumber && <Tag>{contract.contractNumber}</Tag>}
            {milestoneTitle && <Tag color="blue">{milestoneTitle}</Tag>}
            {workStatus && (
              <Tag color={WORK_STATUS_COLORS[workStatus] || 'default'}>
                {WORK_STATUS_LABELS[workStatus] || milestone.workStatus}
              </Tag>
            )}
          </Space>
        </div>
        <div className={styles.headerInfo}>
          <Title level={3} style={{ margin: 0 }}>
            Milestone Details
          </Title>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => navigate(`/manager/contracts/${contractId}`)}
            >
              View contract
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `/manager/task-progress?contractId=${contractId}&milestoneId=${milestoneId}`
                )
              }
            >
              Open Task Progress
            </Button>
            {canShowAssignButton && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() =>
                  navigate(
                    `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}`
                  )
                }
              >
                Assign Task
              </Button>
            )}
            {canShowBookStudioButton && (
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                onClick={() =>
                  navigate(
                    `/manager/studio-booking/${contractId}/${milestoneId}`
                  )
                }
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Book Studio
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className={styles.sectionStack}>
        {request && (
          <Card
            title="Service Request"
            loading={requestLoading}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() =>
                  navigate(`/manager/service-requests/${request.requestId}`)
                }
              >
                View full request
              </Button>
            }
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Request ID:{' '}
                </Text>
                <Text
                  strong
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                >
                  {request.requestId}
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Service Type:{' '}
                </Text>
                <Tag color="blue" style={{ margin: 0 }}>
                  {REQUEST_TYPE_LABELS[
                    (request.serviceType || request.requestType || '').toLowerCase()
                  ] ||
                    (request.serviceType || request.requestType || 'N/A').toUpperCase()}
                </Tag>
              </div>
              {request.requestType === 'transcription' &&
                request.durationMinutes && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Audio Duration:{' '}
                    </Text>
                    <Text strong>
                      {formatDurationMMSS(request.durationMinutes)}
                    </Text>
                  </div>
                )}
              {((request.instruments && request.instruments.length > 0) ||
                (request.instrumentIds &&
                  request.instrumentIds.length > 0 &&
                  instrumentsData.length > 0)) && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Instruments:{' '}
                  </Text>
                  <Space wrap size={[4, 4]}>
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
                              style={{ margin: 0 }}
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
                          return (
                            <Tag key={id} color="purple" style={{ margin: 0 }}>
                              {inst ? inst.instrumentName : id}
                            </Tag>
                          );
                        })}
                  </Space>
                </div>
              )}
              {/* Hiển thị genres và purpose cho arrangement requests */}
              {(request.requestType === 'arrangement' ||
                request.requestType === 'arrangement_with_recording') && (
                <>
                  {request.genres && request.genres.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Genres:{' '}
                      </Text>
                      <Space wrap size={[4, 4]}>
                        {request.genres.map((genre, idx) => (
                          <Tag key={idx} color="purple" style={{ margin: 0 }}>
                            {getGenreLabel(genre)}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                  {request.purpose && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Purpose:{' '}
                      </Text>
                      <Text strong>{getPurposeLabel(request.purpose)}</Text>
                    </div>
                  )}
                </>
              )}
              {request.description && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Notes:{' '}
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '12px',
                      display: 'block',
                      marginTop: '4px',
                      lineHeight: '1.4',
                    }}
                    ellipsis={{ rows: 2, expandable: false }}
                  >
                    {request.description}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Booking info cho recording contracts (tóm tắt ngày/giờ + link sang trang chi tiết) */}
        {contract?.contractType === 'recording' && bookingData && (
          <Card
            title="Studio Booking"
            style={{ marginBottom: 16 }}
            extra={
              bookingData.bookingId && (
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    navigate(`/manager/studio-bookings/${bookingData.bookingId}`)
                  }
                >
                  View full booking
                </Button>
              )
            }
          >
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Date & Time" span={2}>
                {bookingData.bookingDate || 'N/A'} |{' '}
                {bookingData.startTime && bookingData.endTime
                  ? `${bookingData.startTime} - ${bookingData.endTime}`
                  : 'N/A'}{' '}
                {bookingData.durationHours
                  ? `(${bookingData.durationHours}h)`
                  : ''}
              </Descriptions.Item>
              {bookingData.status && (
                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      bookingData.status === 'CONFIRMED'
                        ? 'green'
                        : bookingData.status === 'PENDING'
                          ? 'orange'
                          : 'default'
                    }
                  >
                    {bookingData.status}
                  </Tag>
                </Descriptions.Item>
              )}
              {bookingData.bookingId && (
                <Descriptions.Item label="Booking ID">
                  <Text copyable>{bookingData.bookingId}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        <div className={styles.gridTwoColumn}>
          <Card title="Milestone Details">
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Milestone ID">
                <Space>
                  <Text strong>{milestone.milestoneId}</Text>
                  <Button
                    icon={<CopyOutlined />}
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(milestone.milestoneId);
                      message.success('Copied Milestone ID');
                    }}
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Order">
                {milestoneOrder !== null ? `#${milestoneOrder}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Type">
                {milestone.milestoneType ? (
                  <Tag color="blue">
                    {MILESTONE_TYPE_LABELS[milestone.milestoneType] ||
                      milestone.milestoneType}
                  </Tag>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Name" span={2}>
                <Space direction="vertical" size={0}>
                  <Text strong>{milestoneTitle}</Text>
                  {milestone.description && (
                    <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                      {milestone.description}
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Work Status">
                {workStatus ? (
                  <Tag color={WORK_STATUS_COLORS[workStatus] || 'default'}>
                    {WORK_STATUS_LABELS[workStatus] || milestone.workStatus}
                  </Tag>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="SLA Days">
                {milestone.milestoneSlaDays
                  ? `${milestone.milestoneSlaDays} days`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Deadline" span={2}>
                {(() => {
                  const actualStart = getActualStartDayjs(milestone);
                  const actualDeadline = getActualDeadlineDayjs(milestone);
                  const plannedStart = getPlannedStartDayjs(milestone);
                  const plannedDeadline = getPlannedDeadlineDayjs(milestone);
                  const estimatedDeadline = getEstimatedDeadlineDayjs(
                    milestone,
                    contract?.milestones || []
                  );
                  return (
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>Target</Text>
                        <Space direction="vertical" size={0}>
                          <Text>Start: {formatDateTime(actualStart)}</Text>
                          <Text>
                            Deadline: {formatDateTime(actualDeadline)}
                            {milestone.milestoneSlaDays && (
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                (+{milestone.milestoneSlaDays} days SLA)
                              </Text>
                            )}
                          </Text>
                          {/* SLA status tags */}
                          <div style={{ marginTop: 4 }}>
                            {(() => {
                              const hasFirstSubmission =
                                !!milestone.firstSubmissionAt;
                              const isFirstSubmissionLate =
                                milestone.firstSubmissionLate === true;
                              const isFirstSubmissionOnTime =
                                hasFirstSubmission &&
                                milestone.firstSubmissionLate === false;
                              const overdueNow = milestone.overdueNow;
                              const isCompleted =
                                milestone.workStatus?.toLowerCase() ===
                                'completed';
                              const isPendingReview =
                                milestone.workStatus?.toLowerCase() ===
                                'ready_for_payment';
                              const shouldHideOverdueWarning =
                                hasFirstSubmission || isPendingReview;
                              const isOverdue =
                                !shouldHideOverdueWarning &&
                                overdueNow === true &&
                                !isCompleted;

                              return (
                                <>
                                  {isOverdue && <Tag color="red">Overdue</Tag>}
                                  {isFirstSubmissionLate && (
                                    <Tag color="red">Late submission (first submission)</Tag>
                                  )}
                                  {isFirstSubmissionOnTime && (
                                    <Tag color="green">
                                      On time submission (first submission)
                                    </Tag>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </Space>
                      </div>
                      <div>
                        <Text strong type="secondary">
                          Planned
                        </Text>
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            Start: {formatDateTime(plannedStart)}
                          </Text>
                          <Text type="secondary">
                            Deadline: {formatDateTime(plannedDeadline)}
                          </Text>
                        </Space>
                      </div>
                      {!actualDeadline &&
                        !plannedDeadline &&
                        estimatedDeadline && (
                          <div>
                            <Text strong type="warning">
                              Estimated
                            </Text>
                            <Space direction="vertical" size={0}>
                              <Text type="secondary">
                                Deadline:{' '}
                                {estimatedDeadline.format('HH:mm DD/MM/YYYY')}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                (Estimated when not started)
                              </Text>
                            </Space>
                          </div>
                        )}
                    </Space>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="First Submission" span={2}>
                {milestone.firstSubmissionAt
                  ? formatDateTime(milestone.firstSubmissionAt)
                  : '—'}
                {milestone.firstSubmissionAt && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    (First submission - to check SLA)
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Work Completed" span={2}>
                {milestone.finalCompletedAt
                  ? formatDateTime(milestone.finalCompletedAt)
                  : '—'}
                {milestone.finalCompletedAt && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    (Customer accepted)
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Completed" span={2}>
                {milestone.actualEndAt
                  ? formatDateTime(milestone.actualEndAt)
                  : '—'}
                {milestone.actualEndAt && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    (Milestone paid)
                  </Text>
                )}
              </Descriptions.Item>
              {/* Hiển thị arrangement submission files cho recording milestone */}
              {milestone.milestoneType === 'recording' &&
                milestone.sourceArrangementSubmission && (
                  <Descriptions.Item label="Arrangement Final Files" span={2}>
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
                        <Text strong>Arrangement Final Files:</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {milestone.sourceArrangementSubmission.submissionName}
                          (v{milestone.sourceArrangementSubmission.version})
                        </Text>
                        {milestone.sourceArrangementSubmission.files &&
                          milestone.sourceArrangementSubmission.files.length >
                            0 && (
                            <Space
                              direction="vertical"
                              size="small"
                              style={{ width: '100%' }}
                            >
                              {milestone.sourceArrangementSubmission.files.map(
                                (file, idx) => (
                                  <Button
                                    key={idx}
                                    type="link"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() =>
                                      downloadFileHelper(
                                        file.fileId,
                                        file.fileName
                                      )
                                    }
                                    style={{ padding: 0, height: 'auto' }}
                                  >
                                    {file.fileName}
                                    {file.fileSize && (
                                      <Text
                                        type="secondary"
                                        style={{
                                          marginLeft: 8,
                                          fontSize: '11px',
                                        }}
                                      >
                                        (
                                        {(file.fileSize / 1024 / 1024).toFixed(
                                          2
                                        )}{' '}
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
                  </Descriptions.Item>
                )}
            </Descriptions>
          </Card>
        </div>

        <Card
          title="List of tasks for this milestone"
          extra={
            canShowAssignButton && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                size="small"
                onClick={() =>
                  navigate(
                    `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}`
                  )
                }
              >
                Assign Task
              </Button>
            )
          }
        >
          {milestoneTasks.length === 0 && !milestoneTasksLoading ? (
            <Empty
              description={
                <Space direction="vertical" size="middle">
                  <Text type="secondary">No tasks for this milestone</Text>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() =>
                      navigate(
                        `/manager/milestone-assignments/${contractId}/new?milestoneId=${milestoneId}`
                      )
                    }
                  >
                    Assign First Task
                  </Button>
                </Space>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              dataSource={milestoneTasks}
              loading={milestoneTasksLoading}
              rowKey="assignmentId"
              pagination={false}
              columns={[
                {
                  title: 'Task ID',
                  dataIndex: 'assignmentId',
                  width: 160,
                  render: value => <Text strong>#{value || 'N/A'}</Text>,
                },
                {
                  title: 'Task Type',
                  dataIndex: 'taskType',
                  width: 140,
                  render: type => (
                    <Tag color="cyan">
                      {TASK_TYPE_LABELS[type?.toLowerCase()] || type || 'N/A'}
                    </Tag>
                  ),
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  width: 140,
                  render: (status, record) => (
                    <Space direction="vertical" size={2}>
                      <Tag
                        color={
                          STATUS_COLORS[status?.toLowerCase()] || 'default'
                        }
                      >
                        {STATUS_LABELS[status?.toLowerCase()] ||
                          status ||
                          'N/A'}
                      </Tag>
                      {record.hasIssue && (
                        <Tag
                          color="orange"
                          icon={<ExclamationCircleOutlined />}
                        >
                          Issue
                        </Tag>
                      )}
                    </Space>
                  ),
                },
                {
                  title: 'Specialist Name',
                  dataIndex: 'specialistName',
                  width: 220,
                  render: (_, record) => (
                    <Space direction="vertical" size={0}>
                      <Text strong>
                        {record.specialistName ||
                          record.specialistId ||
                          'Not assigned'}
                      </Text>
                      {record.specialistEmail && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.specialistEmail}
                        </Text>
                      )}
                    </Space>
                  ),
                },
                {
                  title: 'Time',
                  width: 220,
                  render: (_, record) => (
                    <Space direction="vertical" size={0}>
                      <Text>
                        Assigned: {formatDateTime(record.assignedDate)}
                      </Text>
                      <Text>
                        Completed: {formatDateTime(record.completedDate)}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: 'Actions',
                  width: 180,
                  render: (_, record) => (
                    <Space size="small">
                      <Button
                        size="small"
                        onClick={() =>
                          navigate(
                            `/manager/tasks/${contractId}/${record.assignmentId}`
                          )
                        }
                      >
                        View
                      </Button>
                      {record.hasIssue && (
                        <Button
                          size="small"
                          type="primary"
                          danger
                          icon={<ExclamationCircleOutlined />}
                          onClick={() =>
                            navigate(
                              `/manager/task-progress?contractId=${contractId}&milestoneId=${milestoneId}&highlightTaskId=${record.assignmentId}`
                            )
                          }
                        >
                          Handle Issue
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default MilestoneDetailPage;
