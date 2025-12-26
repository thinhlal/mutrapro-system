import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Button,
  Card,
  Space,
  Row,
  Col,
  Input,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  Alert,
  Empty,
  Popconfirm,
  Modal,
  Form,
  message,
  Divider,
} from 'antd';
import toast from 'react-hot-toast';
import {
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getMyTaskAssignments,
  acceptTaskAssignment,
  cancelTaskAssignment,
  startTaskAssignment,
} from '../../../services/taskAssignmentService';
import styles from './MyTasksPage.module.css';

const { Title, Text } = Typography;
const { Search } = Input;

// -------- Helper Functions --------
/**
 * Map backend status to frontend display
 */
function getStatusDisplay(status) {
  if (!status) return { text: 'Assigned', color: 'blue' };
  const lower = status.toLowerCase();
  const statusMap = {
    assigned: { text: 'Assigned', color: 'blue' },
    accepted_waiting: { text: 'Accepted - Waiting', color: 'gold' },
    ready_to_start: { text: 'Ready to Start', color: 'purple' },
    in_progress: { text: 'In Progress', color: 'geekblue' },
    ready_for_review: { text: 'Ready for Review', color: 'orange' },
    revision_requested: { text: 'Revision Requested', color: 'warning' },
    in_revision: { text: 'In Revision', color: 'processing' },
    delivery_pending: { text: 'Delivery Pending', color: 'cyan' },
    waiting_customer_review: {
      text: 'Waiting Customer Review',
      color: 'purple',
    },
    completed: { text: 'Completed', color: 'green' },
    cancelled: { text: 'Cancelled', color: 'default' },
  };
  return statusMap[lower] || { text: status, color: 'default' };
}

/**
 * Get task type display label
 */
function getTaskTypeLabel(taskType) {
  if (!taskType) return 'N/A';
  const labels = {
    transcription: 'Transcription',
    arrangement: 'Arrangement',
    recording_supervision: 'Recording Supervision',
  };
  return labels[taskType.toLowerCase()] || taskType;
}

// -------- Helpers --------
/**
 * Convert seconds to mm:ss with leading zeros.
 */
function formatDuration(seconds) {
  const m = Math.floor((seconds || 0) / 60);
  const s = Math.floor((seconds || 0) % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Format date to DD/MM/YYYY HH:mm (without external libs).
 */
function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
}

function getActualStartDate(milestone) {
  return milestone?.actualStartAt ? new Date(milestone.actualStartAt) : null;
}

function getPlannedStartDate(milestone) {
  return milestone?.plannedStartAt ? new Date(milestone.plannedStartAt) : null;
}

function getPlannedDeadline(milestone) {
  // Ưu tiên: plannedDueDate
  if (milestone?.plannedDueDate) {
    return new Date(milestone.plannedDueDate);
  }

  return null;
}

function getActualDeadline(milestone, studioBooking = null) {
  if (!milestone?.targetDeadline) return null;
  const d = new Date(milestone.targetDeadline);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Validate booking for recording task
 * Returns: { canStart: boolean, reason: string }
 */
function validateBookingForStart(task, studioBooking) {
  // Nếu không phải recording supervision, không cần check
  const isRecordingSupervision =
    task.taskType?.toLowerCase() === 'recording_supervision';
  const isRecordingMilestone =
    task.milestone?.milestoneType?.toLowerCase() === 'recording';

  if (!isRecordingSupervision || !isRecordingMilestone) {
    return { canStart: true, reason: '' };
  }

  // Recording task cần có booking
  if (!task.studioBookingId || !studioBooking) {
    return {
      canStart: false,
      reason:
        'This recording supervision task needs a studio booking before starting. Please contact Manager.',
    };
  }

  const bookingStatus = studioBooking.status;

  // Check 1: Booking status
  if (
    bookingStatus !== 'CONFIRMED' &&
    bookingStatus !== 'IN_PROGRESS' &&
    bookingStatus !== 'COMPLETED'
  ) {
    return {
      canStart: false,
      reason: `Studio booking is not confirmed. Status: ${bookingStatus === 'TENTATIVE' ? 'Tạm thời' : bookingStatus}. Please wait for Manager to confirm.`,
    };
  }

  // Check 2: Thời gian (chỉ cho phép start trong vòng 7 ngày trước booking date)
  if (studioBooking.bookingDate) {
    const bookingDate = dayjs(studioBooking.bookingDate).startOf('day');
    const today = dayjs().startOf('day');
    const daysUntilBooking = bookingDate.diff(today, 'day');

    // Quá sớm: > 7 ngày
    if (daysUntilBooking > 7) {
      return {
        canStart: false,
        reason: `Cannot start task. Recording session on ${studioBooking.bookingDate}. You can start within 7 days before the recording date (remaining ${daysUntilBooking} days).`,
      };
    }

    // Quá muộn: > 1 ngày sau booking date
    if (daysUntilBooking < -1) {
      return {
        canStart: false,
        reason: `Recording session has passed ${Math.abs(daysUntilBooking)} days. Please contact Manager.`,
      };
    }
  }

  return { canStart: true, reason: '' };
}

// -------- Component --------
/**
 * MyTasksPage: List and manage Specialist Transcription tasks
 */
const MyTasksPage = ({ onOpenTask }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Detect base path from current location (e.g., /transcription, /arrangement, /recording-artist)
  const basePath =
    location.pathname.split('/').slice(0, 2).join('/') || '/transcription';
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [onlyActive, setOnlyActive] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelTask, setCancelTask] = useState(null);
  const [cancelForm] = Form.useForm();
  const [startingAssignmentId, setStartingAssignmentId] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getMyTaskAssignments();
      if (response?.status === 'success' && response?.data) {
        setTasks(response.data);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.error('Error loading tasks:', e);
      setError(e?.message || 'Failed to load tasks. Please try again.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Sort tasks: mới nhất lên trước (theo assignedDate hoặc createdAt)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Ưu tiên assignedDate, nếu không có thì dùng createdAt hoặc assignmentId
      const dateA = a.assignedDate || a.createdAt || a.assignmentId || '';
      const dateB = b.assignedDate || b.createdAt || b.assignmentId || '';

      // Sort descending (mới nhất lên trước)
      if (dateA && dateB) {
        return new Date(dateB) - new Date(dateA);
      }
      // Nếu không có date, sort theo assignmentId (UUID - mới hơn thường có ID lớn hơn)
      return (b.assignmentId || '').localeCompare(a.assignmentId || '');
    });
  }, [tasks]);

  // Filter logic: search by assignmentId/notes, filter by status, and only active
  const applyFilters = useCallback(() => {
    let next = [...sortedTasks];
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      next = next.filter(
        t =>
          (t.assignmentId || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q) ||
          (t.taskType || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      // Map statusFilter từ frontend format sang backend format
      const statusMap = {
        ASSIGNED: 'assigned',
        ACCEPTED_WAITING: 'accepted_waiting',
        READY_TO_START: 'ready_to_start',
        IN_PROGRESS: 'in_progress',
        IN_REVISION: 'in_revision',
        WAITING_CUSTOMER_REVIEW: 'waiting_customer_review',
        REVISION_REQUESTED: 'revision_requested',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
      };
      const backendStatus = statusMap[statusFilter];
      if (backendStatus) {
        next = next.filter(t => t.status?.toLowerCase() === backendStatus);
      }
    }
    if (onlyActive) {
      next = next.filter(
        t =>
          t.status?.toLowerCase() !== 'completed' &&
          t.status?.toLowerCase() !== 'cancelled'
      );
    }
    setFilteredTasks(next);
  }, [sortedTasks, searchText, statusFilter, onlyActive]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleAccept = useCallback(
    async task => {
      try {
        const response = await acceptTaskAssignment(task.assignmentId);
        if (response?.status === 'success') {
          message.success('Task accepted successfully');
          await loadTasks();
        }
      } catch (error) {
        console.error('Error accepting task:', error);
        toast.error(error?.message || 'Error accepting task', {
          duration: 5000,
          position: 'top-center',
        });
      }
    },
    [loadTasks]
  );

  const handleCancel = useCallback(
    task => {
      setCancelTask(task);
      setCancelModalVisible(true);
      cancelForm.resetFields();
    },
    [cancelForm]
  );

  const handleCancelConfirm = useCallback(async () => {
    try {
      const values = await cancelForm.validateFields();
      const response = await cancelTaskAssignment(
        cancelTask.assignmentId,
        values.reason
      );
      if (response?.status === 'success') {
        message.success('Task cancelled successfully');
        setCancelModalVisible(false);
        setCancelTask(null);
        cancelForm.resetFields();
        await loadTasks();
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error(error?.message || 'Error cancelling task', {
        duration: 5000,
        position: 'top-center',
      });
    }
  }, [cancelTask, cancelForm, loadTasks]);

  const handleStartTask = useCallback(
    async task => {
      try {
        setStartingAssignmentId(task.assignmentId);
        const response = await startTaskAssignment(task.assignmentId);
        if (response?.status === 'success') {
          message.success('Task started successfully');
          await loadTasks();
        }
      } catch (error) {
        console.error('Error starting task:', error);
        toast.error(error?.message || 'Failed to start task', {
          duration: 5000,
          position: 'top-center',
        });
      } finally {
        setStartingAssignmentId(null);
      }
    },
    [loadTasks]
  );

  const handleCancelModalCancel = useCallback(() => {
    setCancelModalVisible(false);
    setCancelTask(null);
    cancelForm.resetFields();
  }, [cancelForm]);

  const handleOpenTask = useCallback(
    task => {
      if (typeof onOpenTask === 'function') {
        onOpenTask(task.assignmentId);
      } else {
        navigate(`${basePath}/my-tasks/${task.assignmentId}`);
      }
    },
    [navigate, onOpenTask]
  );

  const columns = useMemo(
    () => [
      {
        title: 'Assignment ID',
        dataIndex: 'assignmentId',
        key: 'assignmentId',
        width: 80,
        ellipsis: true,
        render: id => (
          <Tooltip title={id}>
            <span>{id?.substring(0, 8)}...</span>
          </Tooltip>
        ),
      },
      {
        title: 'Task Type',
        dataIndex: 'taskType',
        key: 'taskType',
        width: 120,
        render: taskType => <Tag>{getTaskTypeLabel(taskType)}</Tag>,
      },
      {
        title: 'Notes',
        width: 200,
        dataIndex: 'notes',
        key: 'notes',
        ellipsis: true,
        render: text =>
          text && text.length > 50 ? (
            <Tooltip title={text}>
              <span>{text.slice(0, 50)}...</span>
            </Tooltip>
          ) : (
            <span>{text || '-'}</span>
          ),
      },
      {
        title: 'Assigned Date',
        dataIndex: 'assignedDate',
        key: 'assignedDate',
        width: 100,
        render: iso => formatDateTime(iso),
      },
      {
        title: 'Milestone Deadline',
        dataIndex: ['milestone', 'targetDeadline'],
        key: 'milestoneDeadline',
        width: 190,
        render: (_, record) => {
          // Pass studioBooking để tính deadline cho recording milestone
          const studioBooking = record.studioBooking;
          const actualDeadline = getActualDeadline(
            record?.milestone,
            studioBooking
          );
          const plannedDeadline = getPlannedDeadline(record?.milestone);
          // Dùng estimatedDeadline từ backend khi không có actual và planned
          const estimatedDeadline = record?.milestone?.estimatedDeadline
            ? new Date(record.milestone.estimatedDeadline)
            : null;
          const actualStart = getActualStartDate(record?.milestone);
          const plannedStart = getPlannedStartDate(record?.milestone);

          // Dùng deadline để hiển thị (ưu tiên actual > planned > estimated)
          const displayDeadline =
            actualDeadline || plannedDeadline || estimatedDeadline;
          const isEstimated =
            !actualDeadline && !plannedDeadline && estimatedDeadline;

          if (!displayDeadline) {
            return <Text type="secondary">No deadline</Text>;
          }

          const status = record.status?.toLowerCase();
          const now = new Date();
          const isCompleted =
            record.status?.toLowerCase() === 'completed' ||
            record.status?.toLowerCase() === 'cancelled';
          // SLA status đã được BE tính sẵn (firstSubmissionLate/overdueNow)
          const hasFirstSubmission = !!record?.milestone?.firstSubmissionAt;
          const isPendingReview =
            status === 'ready_for_review' ||
            status === 'waiting_customer_review';
          const shouldHideDeadlineWarning =
            hasFirstSubmission || isPendingReview;
          const isFirstSubmissionLate =
            record?.milestone?.firstSubmissionLate === true;
          const isFirstSubmissionOnTime =
            hasFirstSubmission &&
            record?.milestone?.firstSubmissionLate === false;
          const overdueNow = record?.milestone?.overdueNow;
          const isOverdue =
            !shouldHideDeadlineWarning && !isCompleted && overdueNow === true;
          const daysDiff = displayDeadline
            ? Math.floor(
                (displayDeadline.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
          const isNearDeadline =
            !shouldHideDeadlineWarning &&
            !isOverdue &&
            overdueNow === false &&
            daysDiff !== null &&
            daysDiff <= 3 &&
            daysDiff >= 0;

          // Chỉ hiển thị actual deadline khi đã có start work (có actualStartAt)
          const showActual =
            actualDeadline && actualStart && status !== 'assigned';

          return (
            <Space direction="vertical" size={0}>
              {showActual && (
                <>
                  <Text strong>Target</Text>
                  <Text>
                    Deadline: {formatDateTime(actualDeadline)}
                    {record.milestone?.milestoneSlaDays && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {' '}
                        (+{record.milestone.milestoneSlaDays} ngày SLA)
                      </Text>
                    )}
                  </Text>
                  {isOverdue && <Tag color="red">Overdue</Tag>}
                  {isNearDeadline && <Tag color="orange">Near deadline</Tag>}
                  {isFirstSubmissionLate && (
                    <Tag color="red">Late submission (first version)</Tag>
                  )}
                  {isFirstSubmissionOnTime && (
                    <Tag color="green">On time submission (first version)</Tag>
                  )}
                  <Divider dashed style={{ margin: '4px 0' }} />
                </>
              )}
              {/* Chỉ hiển thị Planned/Estimated khi không có Target */}
              {!showActual && (
                <>
                  <Text strong type={showActual ? 'secondary' : undefined}>
                    {isEstimated ? 'Estimated' : 'Planned'}
                  </Text>
                  {plannedDeadline ? (
                    <Text type="secondary">
                      Deadline: {formatDateTime(plannedDeadline)}
                    </Text>
                  ) : estimatedDeadline ? (
                    <Text type="secondary" style={{ fontStyle: 'italic' }}>
                      Deadline: {formatDateTime(estimatedDeadline)} (ước tính)
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </>
              )}
              {isEstimated && (
                <Tag color="default" size="small">
                  Based on SLA {record?.milestone?.milestoneSlaDays || 0} days
                </Tag>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status, record) => {
          const statusDisplay = getStatusDisplay(status);

          // Hiển thị booking countdown cho recording tasks
          const studioBooking = record.studioBooking;
          let bookingCountdown = null;

          if (
            record.taskType?.toLowerCase() === 'recording_supervision' &&
            studioBooking?.bookingDate &&
            (status?.toLowerCase() === 'ready_to_start' ||
              status?.toLowerCase() === 'accepted_waiting')
          ) {
            const bookingDate = dayjs(studioBooking.bookingDate).startOf('day');
            const today = dayjs().startOf('day');
            const daysUntil = bookingDate.diff(today, 'day');

            let countdownText = '';
            let countdownColor = 'default';

            if (daysUntil > 7) {
              countdownText = `${daysUntil} days`;
              countdownColor = 'blue';
            } else if (daysUntil > 0) {
              countdownText = `${daysUntil} days`;
              countdownColor = 'green';
            } else if (daysUntil === 0) {
              countdownText = 'Today!';
              countdownColor = 'orange';
            } else if (daysUntil >= -1) {
              countdownText = `Over ${Math.abs(daysUntil)} days`;
              countdownColor = 'red';
            } else {
              countdownText = `Over ${Math.abs(daysUntil)} days`;
              countdownColor = 'red';
            }

            bookingCountdown = (
              <Tag color={countdownColor} style={{ marginTop: 4 }}>
                {countdownText}
              </Tag>
            );
          }

          return (
            <Space direction="vertical" size={2}>
              <Tag color={statusDisplay.color}>{statusDisplay.text}</Tag>
              {bookingCountdown}
            </Space>
          );
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 150,
        render: (_, record) => {
          const status = record.status?.toLowerCase();
          const isTakingAction = startingAssignmentId === record.assignmentId;

          // Với recording_supervision task, cần có studio booking trước khi start
          const isRecordingSupervision =
            record.taskType?.toLowerCase() === 'recording_supervision';
          const isRecordingMilestone =
            record.milestone?.milestoneType?.toLowerCase() === 'recording';
          const hasStudioBooking =
            record.studioBookingId && record.studioBookingId.trim().length > 0;
          const needsStudioBooking =
            isRecordingSupervision && isRecordingMilestone && !hasStudioBooking;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <Space size="small">
                {status === 'assigned' && (
                  <>
                    <Popconfirm
                      title="Are you sure you want to accept this task?"
                      onConfirm={() => handleAccept(record)}
                      okText="Accept"
                      cancelText="Cancel"
                    >
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                      >
                        Accept
                      </Button>
                    </Popconfirm>
                    <Button
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => handleCancel(record)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {status === 'accepted_waiting' && (
                  <Tag color="gold" style={{ marginRight: 0 }}>
                    Accepted - Waiting
                  </Tag>
                )}
                {status === 'ready_to_start' && (
                  <>
                    {(() => {
                      // Kiểm tra xem có cần booking không
                      const isRecordingSupervision = record.taskType?.toLowerCase() === 'recording_supervision';
                      const isRecordingMilestone = record.milestone?.milestoneType?.toLowerCase() === 'recording';
                      const hasStudioBooking = record.studioBookingId && record.studioBookingId.trim().length > 0;
                      const needsStudioBooking = isRecordingSupervision && isRecordingMilestone && !hasStudioBooking;
                      
                      // Ẩn nút Start Task nếu cần booking nhưng chưa có
                      if (needsStudioBooking) {
                        return null;
                      }
                      
                      // Validate booking cho recording tasks
                      const studioBooking = record.studioBooking;
                      const validation = validateBookingForStart(
                        record,
                        studioBooking
                      );

                      // Check contract status - chỉ cho phép start nếu contract đã active
                      // Normalize contract status: trim whitespace and convert to lowercase for comparison
                      const contractStatus = record.contract?.contractStatus?.toLowerCase()?.trim();
                      const isContractActive = contractStatus === 'active';
                      const contractNotActiveMessage = contractStatus === 'active_pending_assignment' 
                        ? 'The contract has not yet been started by the Manager. Please wait for the Manager to start the contract before beginning the task.'
                        : contractStatus 
                          ? `The contract is not active. Current status: ${contractStatus}. Please wait for the Manager to start the contract before beginning the task.`
                          : 'The contract is not active. Please wait for the Manager to start the contract before beginning the task.';

                      const cannotStart = !validation.canStart || !isContractActive;
                      const tooltipMessage = !isContractActive 
                        ? contractNotActiveMessage 
                        : (!validation.canStart ? validation.reason : null);

                      return (
                        <Tooltip
                          title={tooltipMessage}
                        >
                          <Button
                            type="primary"
                            size="small"
                            loading={isTakingAction}
                            disabled={cannotStart}
                            onClick={() => handleStartTask(record)}
                          >
                            Start Task
                          </Button>
                        </Tooltip>
                      );
                    })()}
                    <Button
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => handleCancel(record)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Space>
              <Button
                size="small"
                onClick={() => handleOpenTask(record)}
                style={{ width: '150px' }}
              >
                View / Work
              </Button>
            </div>
          );
        },
      },
    ],
    [
      handleOpenTask,
      handleAccept,
      handleCancel,
      handleStartTask,
      startingAssignmentId,
    ]
  );

  const tableLocale = useMemo(
    () => ({
      emptyText: (
        <Empty
          description="No tasks found with current filters"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ),
    }),
    []
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Title level={3} style={{ marginBottom: 0 }}>
            My Tasks
          </Title>
          <Text type="secondary">
            View and manage your assigned transcription jobs
          </Text>
        </div>
        <div className={styles.headerRight}>
          <Button icon={<ReloadOutlined />} onClick={loadTasks}>
            Reload
          </Button>
        </div>
      </div>

      <Card className={styles.filtersCard} size="small">
        <Row className={styles.filtersRow} gutter={[12, 12]} align="middle">
          <Col xs={24} md={10} lg={12}>
            <Search
              placeholder="Search by task code or title"
              allowClear
              enterButton
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onSearch={value => setSearchText(value)}
            />
          </Col>
          <Col xs={24} md={8} lg={6}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'All statuses', value: 'ALL' },
                { label: 'Assigned', value: 'ASSIGNED' },
                { label: 'Accepted - Waiting', value: 'ACCEPTED_WAITING' },
                {
                  label: 'Ready to Start',
                  value: 'READY_TO_START',
                },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'In Revision', value: 'IN_REVISION' },
                {
                  label: 'Waiting Customer Review',
                  value: 'WAITING_CUSTOMER_REVIEW',
                },
                { label: 'Revision Requested', value: 'REVISION_REQUESTED' },
                { label: 'Completed', value: 'COMPLETED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ]}
              // Note: Filter sẽ map ASSIGNED -> 'assigned' trong applyFilters
            />
          </Col>
          <Col xs={24} md={6} lg={6}>
            <Space>
              <Switch checked={onlyActive} onChange={setOnlyActive} />
              <Text>Only active tasks</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {error ? (
        <div style={{ marginBottom: 12 }}>
          <Alert type="error" message={error} showIcon />
        </div>
      ) : null}

      <Card>
        <Table
          rowKey="assignmentId"
          dataSource={filteredTasks}
          columns={columns}
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={tableLocale}
        />
      </Card>

      {/* Cancel Task Modal */}
      <Modal
        title="Cancel Task"
        open={cancelModalVisible}
        onOk={handleCancelConfirm}
        onCancel={handleCancelModalCancel}
        okText="Cancel Task"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            label="Reason for cancellation (required)"
            name="reason"
            rules={[
              { required: true, message: 'Please enter the reason for cancellation' },
              { min: 10, message: 'Reason must be at least 10 characters' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter the reason you want to cancel this task..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyTasksPage;
