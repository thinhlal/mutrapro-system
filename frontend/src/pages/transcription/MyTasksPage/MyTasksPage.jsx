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
import { useNavigate } from 'react-router-dom';
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
    accepted_waiting: { text: 'Đã nhận - Chờ tới lượt', color: 'gold' },
    ready_to_start: { text: 'Ready to Start', color: 'purple' },
    in_progress: { text: 'In Progress', color: 'geekblue' },
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
    recording: 'Recording',
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

  // Fallback: plannedStartAt + milestoneSlaDays
  const plannedStart = getPlannedStartDate(milestone);
  const slaDays = milestone?.milestoneSlaDays;
  if (plannedStart && slaDays != null && slaDays > 0) {
    const dueDate = new Date(plannedStart);
    dueDate.setDate(dueDate.getDate() + Number(slaDays));
    return dueDate;
  }

  return null;
}

function getActualDeadline(milestone) {
  // Chỉ tính actual deadline khi đã có actualStartAt (đã start work)
  if (!milestone) return null;
  const actualStart = getActualStartDate(milestone);
  const slaDays = milestone.milestoneSlaDays;
  if (actualStart && slaDays != null && slaDays > 0) {
    const dueDate = new Date(actualStart);
    dueDate.setDate(dueDate.getDate() + Number(slaDays));
    return dueDate;
  }
  // Không fallback về actualEndAt nếu chưa có actualStartAt
  return null;
}

// Cache để tránh tính lại fallback deadline nhiều lần
const fallbackDeadlineCache = new Map();

// Tính deadline fallback từ slaDays khi chưa có actual/planned
// Dựa trên danh sách tasks cùng contract để lần ra milestone trước đó
function getFallbackDeadline(milestone, allTasks = []) {
  if (!milestone) return null;
  const slaDays = milestone.milestoneSlaDays;
  if (slaDays == null || slaDays <= 0) return null;

  // Ưu tiên: dùng plannedStartAt nếu có
  const plannedStart = getPlannedStartDate(milestone);
  if (plannedStart) {
    const dueDate = new Date(plannedStart);
    dueDate.setDate(dueDate.getDate() + Number(slaDays));
    return dueDate;
  }

  // Cache key: milestoneId
  const cacheKey = milestone.milestoneId;
  if (fallbackDeadlineCache.has(cacheKey)) {
    return fallbackDeadlineCache.get(cacheKey);
  }

  // Nếu milestone orderIndex = 1, tính từ now
  const orderIndex = milestone.orderIndex;
  if (orderIndex == null || orderIndex === 1) {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Number(slaDays));
    fallbackDeadlineCache.set(cacheKey, dueDate);
    return dueDate;
  }

  // Nếu milestone orderIndex > 1, tính từ deadline của milestone trước đó
  const contractId =
    milestone.contractId ||
    allTasks.find(t => t.milestone?.milestoneId === milestone.milestoneId)
      ?.contractId;
  if (contractId && allTasks.length > 0) {
    // Tìm milestone trước đó (orderIndex - 1) trong cùng contract
    const previousTask = allTasks.find(
      t =>
        t.contractId === contractId &&
        t.milestone?.orderIndex === orderIndex - 1
    );

    if (previousTask?.milestone) {
      const previousMilestone = previousTask.milestone;
      // Tính deadline của milestone trước đó (actual > planned > fallback đệ quy)
      const previousActualDeadline = getActualDeadline(previousMilestone);
      const previousPlannedDeadline = getPlannedDeadline(previousMilestone);
      const previousFallbackDeadline = getFallbackDeadline(
        previousMilestone,
        allTasks
      );
      const previousDeadline =
        previousActualDeadline ||
        previousPlannedDeadline ||
        previousFallbackDeadline;

      if (previousDeadline) {
        // Start date của milestone hiện tại = deadline của milestone trước đó
        const dueDate = new Date(previousDeadline);
        dueDate.setDate(dueDate.getDate() + Number(slaDays));
        fallbackDeadlineCache.set(cacheKey, dueDate);
        return dueDate;
      }
    }
  }

  // Fallback cuối cùng: tính từ now (nếu không tìm thấy milestone trước đó)
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + Number(slaDays));
  fallbackDeadlineCache.set(cacheKey, dueDate);
  return dueDate;
}

// -------- Component --------
/**
 * MyTasksPage: List and manage Specialist Transcription tasks
 */
const MyTasksPage = ({ onOpenTask }) => {
  const navigate = useNavigate();
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
        // Dùng trực tiếp data từ API, không map
        setTasks(response.data);
        // Clear cache khi load lại tasks
        fallbackDeadlineCache.clear();
      } else {
        setTasks([]);
        fallbackDeadlineCache.clear();
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
        navigate(`/transcription/my-tasks/${task.assignmentId}`);
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
        width: 200,
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
        width: 150,
        render: taskType => <Tag>{getTaskTypeLabel(taskType)}</Tag>,
      },
      {
        title: 'Notes',
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
        width: 170,
        render: iso => formatDateTime(iso),
      },
      {
        title: 'Milestone Deadline',
        dataIndex: ['milestone', 'plannedDueDate'],
        key: 'milestoneDeadline',
        width: 190,
        render: (_, record) => {
          const actualDeadline = getActualDeadline(record?.milestone);
          const plannedDeadline = getPlannedDeadline(record?.milestone);
          // Pass record và filteredTasks để tính fallback deadline dựa trên milestone trước đó
          const fallbackDeadline = getFallbackDeadline(
            record?.milestone,
            filteredTasks
          );
          const actualStart = getActualStartDate(record?.milestone);
          const plannedStart = getPlannedStartDate(record?.milestone);

          // Dùng deadline để hiển thị (ưu tiên actual > planned > fallback)
          const displayDeadline =
            actualDeadline || plannedDeadline || fallbackDeadline;
          const isFallback =
            !actualDeadline && !plannedDeadline && fallbackDeadline;

          if (!displayDeadline) {
            return <Text type="secondary">Chưa có</Text>;
          }

          const status = record.status?.toLowerCase();
          const now = new Date();
          const isCompleted =
            record.status?.toLowerCase() === 'completed' ||
            record.status?.toLowerCase() === 'cancelled';
          const isOverdue =
            !isCompleted &&
            displayDeadline &&
            displayDeadline.getTime() < now.getTime();
          const daysDiff = displayDeadline
            ? Math.floor(
                (displayDeadline.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
          const isNearDeadline =
            !isOverdue && daysDiff !== null && daysDiff <= 3 && daysDiff >= 0;

          // Chỉ hiển thị actual deadline khi đã có start work (có actualStartAt)
          const showActual =
            actualDeadline && actualStart && status !== 'assigned';

          return (
            <Space direction="vertical" size={0}>
              {showActual && (
                <>
                  <Text strong>Actual</Text>
                  <Text>Deadline: {formatDateTime(actualDeadline)}</Text>
                  {isOverdue && <Tag color="red">Quá hạn</Tag>}
                  {isNearDeadline && <Tag color="orange">Sắp hạn</Tag>}
                  <Divider dashed style={{ margin: '4px 0' }} />
                </>
              )}
              <Text strong type={showActual ? 'secondary' : undefined}>
                {isFallback ? 'Estimated' : 'Planned'}
              </Text>
              {plannedDeadline ? (
                <Text type="secondary">
                  Deadline: {formatDateTime(plannedDeadline)}
                </Text>
              ) : fallbackDeadline ? (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  Deadline: {formatDateTime(fallbackDeadline)} (ước tính)
                </Text>
              ) : (
                <Text type="secondary">-</Text>
              )}
              {isFallback && (
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
        width: 150,
        render: status => {
          const statusDisplay = getStatusDisplay(status);
          return <Tag color={statusDisplay.color}>{statusDisplay.text}</Tag>;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 200,
        render: (_, record) => {
          const status = record.status?.toLowerCase();
          const isTakingAction = startingAssignmentId === record.assignmentId;

          return (
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
                  <Button
                    type="primary"
                    size="small"
                    loading={isTakingAction}
                    onClick={() => handleStartTask(record)}
                  >
                    Start Work
                  </Button>
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
              <Button
                type="link"
                size="small"
                onClick={() => handleOpenTask(record)}
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
