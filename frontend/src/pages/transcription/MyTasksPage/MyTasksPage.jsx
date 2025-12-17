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
import { getStudioBookingById } from '../../../services/studioBookingService';
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
    accepted_waiting: { text: 'Đã nhận - Chờ tới lượt', color: 'gold' },
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
  const isRecordingSupervision = task.taskType?.toLowerCase() === 'recording_supervision';
  const isRecordingMilestone = task.milestone?.milestoneType?.toLowerCase() === 'recording';
  
  if (!isRecordingSupervision || !isRecordingMilestone) {
    return { canStart: true, reason: '' };
  }
  
  // Recording task cần có booking
  if (!task.studioBookingId || !studioBooking) {
    return { 
      canStart: false, 
      reason: 'Task recording supervision này cần có studio booking trước khi bắt đầu. Vui lòng liên hệ Manager.' 
    };
  }
  
  const bookingStatus = studioBooking.status;
  
  // Check 1: Booking status
  if (bookingStatus !== 'CONFIRMED' && bookingStatus !== 'IN_PROGRESS' && bookingStatus !== 'COMPLETED') {
    return { 
      canStart: false, 
      reason: `Studio booking chưa được xác nhận. Trạng thái: ${bookingStatus === 'TENTATIVE' ? 'Tạm thời' : bookingStatus}. Vui lòng đợi Manager xác nhận.` 
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
        reason: `Chưa thể bắt đầu task. Recording session vào ${studioBooking.bookingDate}. Bạn có thể bắt đầu trong vòng 7 ngày trước ngày thu âm (còn ${daysUntilBooking} ngày).` 
      };
    }
    
    // Quá muộn: > 1 ngày sau booking date
    if (daysUntilBooking < -1) {
      return { 
        canStart: false, 
        reason: `Recording session đã qua ${Math.abs(daysUntilBooking)} ngày. Vui lòng liên hệ Manager.` 
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
  const [studioBookings, setStudioBookings] = useState({}); // Map: taskId -> booking data

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getMyTaskAssignments();
      if (response?.status === 'success' && response?.data) {
        setTasks(response.data);
        
        // Load studio bookings cho recording tasks
        const recordingTasks = response.data.filter(
          task => task.taskType?.toLowerCase() === 'recording_supervision' && task.studioBookingId
        );
        
        if (recordingTasks.length > 0) {
          const bookingPromises = recordingTasks.map(async task => {
            try {
              const bookingRes = await getStudioBookingById(task.studioBookingId);
              return { taskId: task.assignmentId, booking: bookingRes?.data };
            } catch (err) {
              console.error(`Error loading booking for task ${task.assignmentId}:`, err);
              return { taskId: task.assignmentId, booking: null };
            }
          });
          
          const bookingResults = await Promise.all(bookingPromises);
          const bookingsMap = {};
          bookingResults.forEach(({ taskId, booking }) => {
            if (booking) bookingsMap[taskId] = booking;
          });
          setStudioBookings(bookingsMap);
        }
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
          message.success('Task đã được accept thành công');
          await loadTasks();
        }
      } catch (error) {
        console.error('Error accepting task:', error);
        message.error(error?.message || 'Lỗi khi accept task');
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
        message.success('Task đã được cancel thành công');
        setCancelModalVisible(false);
        setCancelTask(null);
        cancelForm.resetFields();
        await loadTasks();
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(error?.message || 'Lỗi khi cancel task');
    }
  }, [cancelTask, cancelForm, loadTasks]);

  const handleStartTask = useCallback(
    async task => {
      try {
        setStartingAssignmentId(task.assignmentId);
        const response = await startTaskAssignment(task.assignmentId);
        if (response?.status === 'success') {
          message.success('Đã bắt đầu task');
          await loadTasks();
        }
      } catch (error) {
        console.error('Error starting task:', error);
        message.error(error?.message || 'Lỗi khi bắt đầu task');
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
        width: 120,
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
          const studioBooking = studioBookings[record.assignmentId];
          const actualDeadline = getActualDeadline(record?.milestone, studioBooking);
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
            return <Text type="secondary">Chưa có</Text>;
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
          const isFirstSubmissionLate = record?.milestone?.firstSubmissionLate === true;
          const isFirstSubmissionOnTime =
            hasFirstSubmission && record?.milestone?.firstSubmissionLate === false;
          const overdueNow = record?.milestone?.overdueNow;
          const isOverdue =
            !shouldHideDeadlineWarning &&
            !isCompleted &&
            overdueNow === true;
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
                  {isOverdue && <Tag color="red">Quá hạn</Tag>}
                  {isNearDeadline && <Tag color="orange">Sắp hạn</Tag>}
                  {isFirstSubmissionLate && (
                    <Tag color="red">Nộp trễ (bản đầu)</Tag>
                  )}
                  {isFirstSubmissionOnTime && (
                    <Tag color="green">Nộp đúng hạn (bản đầu)</Tag>
                  )}
                  <Divider dashed style={{ margin: '4px 0' }} />
                </>
              )}
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
              {isEstimated && (
                <Tag color="default" size="small">
                  Dựa trên SLA {record?.milestone?.milestoneSlaDays || 0} ngày
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
        width: 200,
        render: (status, record) => {
          const statusDisplay = getStatusDisplay(status);
          
          // Hiển thị booking countdown cho recording tasks
          const studioBooking = studioBookings[record.assignmentId];
          let bookingCountdown = null;
          
          if (
            record.taskType?.toLowerCase() === 'recording_supervision' &&
            studioBooking?.bookingDate &&
            (status?.toLowerCase() === 'ready_to_start' || status?.toLowerCase() === 'accepted_waiting')
          ) {
            const bookingDate = dayjs(studioBooking.bookingDate).startOf('day');
            const today = dayjs().startOf('day');
            const daysUntil = bookingDate.diff(today, 'day');
            
            let countdownText = '';
            let countdownColor = 'default';
            
            if (daysUntil > 7) {
              countdownText = `${daysUntil} ngày`;
              countdownColor = 'blue';
            } else if (daysUntil > 0) {
              countdownText = `${daysUntil} ngày`;
              countdownColor = 'green';
            } else if (daysUntil === 0) {
              countdownText = 'Hôm nay!';
              countdownColor = 'orange';
            } else if (daysUntil >= -1) {
              countdownText = `Qua ${Math.abs(daysUntil)} ngày`;
              countdownColor = 'red';
            } else {
              countdownText = `Qua ${Math.abs(daysUntil)} ngày`;
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
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space size="small">
                {status === 'assigned' && (
                  <>
                    <Popconfirm
                      title="Bạn có chắc muốn accept task này?"
                      onConfirm={() => handleAccept(record)}
                      okText="Accept"
                      cancelText="Hủy"
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
                    Đã nhận – Chờ tới lượt
                  </Tag>
                )}
                {status === 'ready_to_start' && (
                  <>
                    {(() => {
                      // Validate booking cho recording tasks
                      const studioBooking = studioBookings[record.assignmentId];
                      const validation = validateBookingForStart(record, studioBooking);
                      
                      return (
                        <Tooltip title={!validation.canStart ? validation.reason : null}>
                      <Button
                        type="primary"
                        size="small"
                        loading={isTakingAction}
                            disabled={!validation.canStart}
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
                // type="outline"
                size="small"
                onClick={() => handleOpenTask(record)}
                width="150px"
              >
                View / Work
              </Button>
            </Space>
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
      studioBookings,
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
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            label="Lý do cancel (bắt buộc)"
            name="reason"
            rules={[
              { required: true, message: 'Vui lòng nhập lý do cancel' },
              { min: 10, message: 'Lý do phải có ít nhất 10 ký tự' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Nhập lý do bạn muốn cancel task này..."
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
