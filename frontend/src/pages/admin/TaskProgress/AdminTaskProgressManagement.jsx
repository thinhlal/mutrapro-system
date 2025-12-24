import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Input,
  Spin,
  Tooltip,
  Row,
  Col,
  List,
  Empty,
  Descriptions,
  Modal,
  Progress,
  Timeline,
  Divider,
  Alert,
  Popconfirm,
  Select,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  FileOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getAllTaskAssignments,
  resolveIssue,
  cancelTaskByManager,
} from '../../../services/taskAssignmentService';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './AdminTaskProgressManagement.module.css';

const { Title, Text } = Typography;

// Task type labels
const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording_supervision: 'Recording Supervision',
};

// Assignment status colors
const STATUS_COLORS = {
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

// Assignment status labels
const STATUS_LABELS = {
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

// File status labels
const FILE_STATUS_LABELS = {
  uploaded: 'Đã upload',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  delivered: 'Đã giao',
};

// File status colors
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

const getTaskCompletionDate = task =>
  task?.completedDate || task?.milestone?.finalCompletedAt || null;

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đã gán', value: 'assigned' },
  { label: 'Đã nhận - Chờ', value: 'accepted_waiting' },
  { label: 'Ready to Start', value: 'ready_to_start' },
  { label: 'Đang làm', value: 'in_progress' },
  { label: 'Đang chỉnh sửa', value: 'in_revision' },
  { label: 'Chờ khách hàng review', value: 'waiting_customer_review' },
  { label: 'Yêu cầu chỉnh sửa', value: 'revision_requested' },
  { label: 'Hoàn thành', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
];

const TASK_TYPE_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Transcription', value: 'TRANSCRIPTION' },
  { label: 'Arrangement', value: 'ARRANGEMENT' },
  { label: 'Recording Supervision', value: 'RECORDING_SUPERVISION' },
];

const PROGRESS_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chưa bắt đầu (0%)', value: '0' },
  { label: 'Đang làm (1-74%)', value: '1-74' },
  { label: 'Gần hoàn thành (75-99%)', value: '75-99' },
  { label: 'Hoàn thành (100%)', value: '100' },
];

export default function AdminTaskProgressManagement() {
  const [taskAssignments, setTaskAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    taskType: 'all',
    progress: 'all',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);
  const [taskFiles, setTaskFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [taskSubmissionsMap, setTaskSubmissionsMap] = useState({}); // Map assignmentId -> submissions[]
  const [contractsMap, setContractsMap] = useState({}); // Map contractId -> contract
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedIssueTask, setSelectedIssueTask] = useState(null);
  const [cancellingTask, setCancellingTask] = useState(false);
  const navigate = useNavigate();
  const searchDebounceTimerRef = useRef(null);

  const fetchAllTaskAssignments = useCallback(
    async (currentFilters, currentPagination) => {
      setLoading(true);
      try {
        const params = {
          page: (currentPagination.page || 1) - 1,
          size: currentPagination.pageSize || 10,
        };
        if (currentFilters.status !== 'all') {
          params.status = currentFilters.status;
        }
        if (currentFilters.taskType !== 'all') {
          params.taskType = currentFilters.taskType;
        }
        if (currentFilters.progress !== 'all') {
          // Parse progress range: '0', '1-74', '75-99', '100'
          const progressValue = currentFilters.progress;
          if (progressValue === '0') {
            params.minProgress = 0;
            params.maxProgress = 0;
          } else if (progressValue === '100') {
            params.minProgress = 100;
            params.maxProgress = 100;
          } else if (progressValue === '1-74') {
            params.minProgress = 1;
            params.maxProgress = 74;
          } else if (progressValue === '75-99') {
            params.minProgress = 75;
            params.maxProgress = 99;
          }
        }
        if (currentFilters.search && currentFilters.search.trim()) {
          params.keyword = currentFilters.search.trim();
        }
        console.log('[TaskProgress] Fetching with params:', params);
        console.log('[TaskProgress] Current filters state:', currentFilters);
        console.log(
          '[TaskProgress] Current pagination state:',
          currentPagination
        );
        const response = await getAllTaskAssignments(params);
        if (response?.status === 'success' && response.data) {
          const pageData = response.data;
          setTaskAssignments(pageData.content || []);

          // Extract contracts và submissions từ response (files không cần, chỉ load khi mở detail modal)
          const contractsMap = {};
          const submissionsMap = {};

          (pageData.content || []).forEach(assignment => {
            // Extract contracts
            if (assignment.contract && assignment.contractId) {
              contractsMap[assignment.contractId] = assignment.contract;
            }

            // Extract submissions
            if (assignment.submissions && assignment.assignmentId) {
              submissionsMap[assignment.assignmentId] =
                assignment.submissions || [];
            }
          });

          setContractsMap(contractsMap);
          setTaskSubmissionsMap(submissionsMap);

          setPagination(prev => ({
            ...prev,
            page: (pageData.pageNumber ?? 0) + 1,
            pageSize: pageData.pageSize ?? prev.pageSize,
            total: pageData.totalElements ?? 0,
          }));
        } else {
          setTaskAssignments([]);
          setPagination(prev => ({ ...prev, total: 0 }));
        }
      } catch (error) {
        console.error('Error fetching task assignments:', error);
        message.error(error?.message || 'Không thể tải danh sách tasks');
        setTaskAssignments([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Track xem có phải là lần đầu mount không
  const isInitialMountRef = useRef(true);

  // Fetch khi filters hoặc pagination thay đổi
  useEffect(() => {
    // Bỏ qua lần đầu mount (sẽ được handle bởi useEffect khác)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Clear search debounce timer nếu có (khi status/taskType/pagination thay đổi)
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
      searchDebounceTimerRef.current = null;
    }

    // Fetch ngay lập tức (không debounce cho status/taskType/pagination)
    console.log('[TaskProgress] Filter changed - fetching immediately');
    fetchAllTaskAssignments(filters, pagination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status,
    filters.taskType,
    filters.progress,
    pagination.page,
    pagination.pageSize,
  ]);

  // Debounced fetch khi search thay đổi hoặc initial mount
  useEffect(() => {
    // Clear timer cũ nếu có
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
      searchDebounceTimerRef.current = null;
    }

    // Nếu search bị xóa (empty), fetch ngay lập tức không cần debounce
    const isSearchEmpty = !filters.search || filters.search.trim() === '';
    const delay = isInitialMountRef.current || isSearchEmpty ? 0 : 500; // Không debounce lần đầu hoặc khi empty

    // Set timer mới
    searchDebounceTimerRef.current = setTimeout(() => {
      console.log(
        '[TaskProgress] Search changed - fetching',
        isSearchEmpty ? 'immediately (empty)' : 'after debounce'
      );
      fetchAllTaskAssignments(filters, pagination);
      searchDebounceTimerRef.current = null;
      isInitialMountRef.current = false;
    }, delay);

    // Cleanup
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
        searchDebounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const handleStatusChange = value => {
    console.log('[TaskProgress] Status changed to:', value);
    setFilters(prev => ({ ...prev, status: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTaskTypeChange = value => {
    console.log('[TaskProgress] TaskType changed to:', value);
    setFilters(prev => ({ ...prev, taskType: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleProgressChange = value => {
    console.log('[TaskProgress] Progress changed to:', value);
    setFilters(prev => ({ ...prev, progress: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = e => {
    const value = e.target.value;
    console.log('[TaskProgress] Search changed to:', value);
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTableChange = newPagination => {
    setPagination(prev => ({
      ...prev,
      page: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // Fetch files for a task assignment
  const fetchTaskFiles = async assignmentId => {
    try {
      setFilesLoading(true);
      const response = await axiosInstance.get(
        `/api/v1/projects/files/by-assignment/${assignmentId}`
      );
      if (response?.data?.status === 'success' && response?.data?.data) {
        setTaskFiles(response.data.data || []);
      } else {
        setTaskFiles([]);
      }
    } catch (error) {
      console.error('Error fetching task files:', error);
      setTaskFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  // Get milestone name
  const getMilestoneName = record => {
    if (record?.milestone?.name) return record.milestone.name;
    return record?.milestoneId || 'N/A';
  };

  // Get contract info
  const getContractInfo = contractId => {
    return contractsMap[contractId] || null;
  };

  // Sử dụng progressPercentage từ backend (đã được tính sẵn)
  const getProgress = record => {
    // Nếu null/undefined thì default 0
    return record.progressPercentage ?? 0;
  };

  // Render specialist cell
  const renderSpecialistCell = record => {
    const name = record.specialistName || record.specialistId || 'N/A';
    const email = record.specialistEmail;
    const specialization = record.specialistSpecialization;

    return (
      <Space direction="vertical" size={0}>
        <Text strong>{name}</Text>
        {email && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {email}
          </Text>
        )}
      </Space>
    );
  };

  // Handle view task details - navigate to task detail page
  const handleViewTaskDetails = record => {
    if (record.assignmentId && record.contractId) {
      navigate(`/admin/tasks/${record.contractId}/${record.assignmentId}`);
    } else {
      message.warning('Không tìm thấy assignment ID hoặc contract ID');
    }
  };

  // Handle view issue details
  const handleViewIssueDetails = record => {
    setSelectedIssueTask(record);
    setIssueModalVisible(true);
  };

  const handleCloseIssueModal = () => {
    setIssueModalVisible(false);
    setSelectedIssueTask(null);
  };

  // Handle resolve issue (cho specialist tiếp tục)
  const handleResolveIssue = async () => {
    if (!selectedIssueTask || !selectedIssueTask.contractId) return;
    try {
      const response = await resolveIssue(
        selectedIssueTask.contractId,
        selectedIssueTask.assignmentId
      );
      if (response?.status === 'success') {
        message.success('Allowed specialist to continue task');
        setIssueModalVisible(false);
        setSelectedIssueTask(null);
        await fetchAllTaskAssignments(filters, pagination);
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      message.error(error?.message || 'Error resolving issue');
    }
  };

  // Handle cancel task by manager and create new
  const handleCancelAndCreateNew = async () => {
    if (!selectedIssueTask || !selectedIssueTask.contractId) return;
    try {
      setCancellingTask(true);
      const response = await cancelTaskByManager(
        selectedIssueTask.contractId,
        selectedIssueTask.assignmentId
      );
      if (response?.status === 'success') {
        message.success(
          'Task cancelled successfully. Redirecting to create new task...'
        );
        setIssueModalVisible(false);
        const taskToCreate = selectedIssueTask;
        setSelectedIssueTask(null);

        // Navigate đến workspace với data pre-filled từ task cũ
        navigate(
          `/admin/milestone-assignments/${taskToCreate.contractId}/new?milestoneId=${taskToCreate.milestoneId}&taskType=${taskToCreate.taskType}&excludeSpecialistId=${taskToCreate.specialistId}`
        );
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(error?.message || 'Error cancelling task');
    } finally {
      setCancellingTask(false);
    }
  };

  // Format specialist text
  const formatSpecialistText = record => {
    const name = record.specialistName || record.specialistId || 'N/A';
    const email = record.specialistEmail;
    if (email) {
      return `${name} (${email})`;
    }
    return name;
  };

  // Format file size
  const formatFileSize = bytes => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Table columns - tối ưu width để tránh scroll ngang
  const columns = [
    {
      title: 'Contract',
      dataIndex: 'contractId',
      key: 'contractId',
      width: 180,
      fixed: 'left',
      render: (contractId, record) => {
        const contract = getContractInfo(contractId);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{contract?.contractNumber || contractId}</Text>
            {contract?.nameSnapshot && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {contract.nameSnapshot}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Task Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      render: type => <Tag color="cyan">{TASK_TYPE_LABELS[type] || type}</Tag>,
    },
    {
      title: 'Specialist',
      dataIndex: 'specialistId',
      key: 'specialistId',
      width: 160,
      render: (_, record) => renderSpecialistCell(record),
    },
    {
      title: 'Milestone',
      dataIndex: 'milestoneId',
      key: 'milestoneId',
      width: 140,
      render: (_, record) => (
        <Text type="secondary" ellipsis={{ tooltip: getMilestoneName(record) }}>
          {getMilestoneName(record)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status, record) => (
        <Space direction="vertical" size={4}>
          <Tag color={STATUS_COLORS[status] || 'default'}>
            {STATUS_LABELS[status] || status?.toUpperCase()}
          </Tag>
          {record.hasIssue && (
            <Tag
              color="orange"
              icon={<ExclamationCircleOutlined />}
              size="small"
            >
              Issue
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 120,
      render: (_, record) => {
        const percent = getProgress(record);
        return (
          <Progress
            percent={percent}
            size="small"
            status={record.status === 'cancelled' ? 'exception' : 'active'}
          />
        );
      },
    },
    {
      title: 'Assigned',
      dataIndex: 'assignedDate',
      key: 'assignedDate',
      width: 130,
      render: date => (date ? dayjs(date).format('HH:mm DD/MM/YYYY') : 'N/A'),
    },
    {
      title: 'Deadline',
      key: 'milestoneDeadline',
      width: 140,
      render: (_, record) => {
        const actualDeadline = getActualDeadlineDayjs(record.milestone);
        const plannedDeadline = getPlannedDeadlineDayjs(record.milestone);
        // Dùng estimatedDeadline từ backend thay vì tính ở frontend
        const estimatedDeadline = record.milestone?.estimatedDeadline
          ? dayjs(record.milestone.estimatedDeadline)
          : null;
        const actualStart = getActualStartDayjs(record.milestone);
        const plannedStart = getPlannedStartDayjs(record.milestone);

        // Nếu không có data gì thì hiển thị -
        if (!actualDeadline && !plannedDeadline && !estimatedDeadline) {
          return <Text type="secondary">-</Text>;
        }

        const now = dayjs();
        // SLA status đã được BE tính sẵn (firstSubmissionLate/overdueNow)
        const hasFirstSubmission = !!record.milestone?.firstSubmissionAt;
        // Dùng hasPendingReview từ backend thay vì check submissions
        const hasPendingReview = record.hasPendingReview === true;
        const shouldHideDeadlineWarning =
          hasFirstSubmission || hasPendingReview;
        const isFirstSubmissionLate =
          record.milestone?.firstSubmissionLate === true;
        const isFirstSubmissionOnTime =
          hasFirstSubmission && record.milestone?.firstSubmissionLate === false;
        const overdueNow = record.milestone?.overdueNow;
        const isOverdue =
          !shouldHideDeadlineWarning &&
          overdueNow === true &&
          record.status !== 'completed';
        const diffDays = actualDeadline
          ? actualDeadline.diff(now, 'day')
          : null;
        const isNearDeadline =
          !shouldHideDeadlineWarning &&
          overdueNow === false &&
          diffDays !== null &&
          diffDays <= 3 &&
          diffDays >= 0 &&
          !isOverdue;

        // Nếu có actual hoặc planned thì chỉ hiển thị actual và planned (không hiển thị estimated)
        const hasActualOrPlanned = actualDeadline || plannedDeadline;

        return (
          <Space direction="vertical" size={0}>
            {/* Hiển thị Actual nếu có */}
            {actualDeadline && (
              <>
                <Text strong>Target</Text>
                <Space direction="vertical" size={0}>
                  {actualStart && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Start: {actualStart.format('HH:mm DD/MM')}
                    </Text>
                  )}
                  <Text
                    type={
                      isOverdue
                        ? 'danger'
                        : isNearDeadline
                          ? 'warning'
                          : undefined
                    }
                    strong={isOverdue || isNearDeadline}
                    style={{ fontSize: 12 }}
                  >
                    Deadline: {actualDeadline.format('HH:mm DD/MM')}
                    {record.milestone?.milestoneSlaDays && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {' '}
                        (+{record.milestone.milestoneSlaDays} ngày SLA)
                      </Text>
                    )}
                  </Text>
                  {isOverdue && (
                    <Tag color="red" size="small">
                      Quá hạn
                    </Tag>
                  )}
                  {isNearDeadline && (
                    <Tag color="orange" size="small">
                      Sắp hạn
                    </Tag>
                  )}
                  {isFirstSubmissionLate && (
                    <Tag color="red" size="small">
                      Nộp trễ (bản đầu)
                    </Tag>
                  )}
                  {isFirstSubmissionOnTime && (
                    <Tag color="green" size="small">
                      Nộp đúng hạn (bản đầu)
                    </Tag>
                  )}
                </Space>
              </>
            )}

            {/* Chỉ hiển thị Planned khi không có Target */}
            {!actualDeadline && plannedDeadline && (
              <>
                <Text strong type="secondary">
                  Planned
                </Text>
                <Space direction="vertical" size={0}>
                  {plannedStart && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Start: {plannedStart.format('HH:mm DD/MM')}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Deadline: {plannedDeadline.format('HH:mm DD/MM')}
                  </Text>
                </Space>
              </>
            )}

            {/* Chỉ hiển thị Estimated khi không có actual và planned */}
            {!hasActualOrPlanned && estimatedDeadline && (
              <>
                <Text strong type="warning">
                  Estimated
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Deadline: {estimatedDeadline.format('HH:mm DD/MM')}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  (Ước tính)
                </Text>
              </>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Completed',
      dataIndex: 'completedDate',
      key: 'completedDate',
      width: 140,
      render: (date, record) => {
        const completionDate = getTaskCompletionDate(record);
        const plannedDeadline = getPlannedDeadlineDayjs(record.milestone);
        if (!completionDate && !plannedDeadline) {
          return <Text type="secondary">-</Text>;
        }
        const completedDate = completionDate ? dayjs(completionDate) : null;
        const actualDeadline = getActualDeadlineDayjs(record.milestone);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>Actual completion</Text>
            {completedDate ? (
              <Space direction="vertical" size={0}>
                <Text style={{ fontSize: 12 }}>
                  {completedDate.format('HH:mm DD/MM/YYYY')}
                </Text>
                {actualDeadline &&
                  (() => {
                    const isOnTime =
                      completedDate.isBefore(actualDeadline) ||
                      completedDate.isSame(actualDeadline);
                    if (isOnTime) {
                      return (
                        <Tag color="green" size="small">
                          Đúng hạn
                        </Tag>
                      );
                    }
                    const daysLate = completedDate.diff(actualDeadline, 'day');
                    return (
                      <Tag color="red" size="small">
                        Trễ {daysLate}d
                      </Tag>
                    );
                  })()}
              </Space>
            ) : (
              <Text type="secondary">Chưa hoàn thành</Text>
            )}
            <Divider style={{ margin: '4px 0' }} dashed />
            {/* Planned deadline: chỉ hiển thị khi chưa có Target deadline */}
            {!actualDeadline && (
              <>
                <Text strong type="secondary">
                  Planned deadline
                </Text>
                {plannedDeadline ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {plannedDeadline.format('HH:mm DD/MM/YYYY')}
                  </Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.hasIssue && record.status !== 'cancelled' && (
            <Tooltip title="Xem và xử lý issue">
              <Button
                type="primary"
                danger
                size="small"
                icon={<ExclamationCircleOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  handleViewIssueDetails(record);
                }}
              >
                Xử lý issue
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Xem chi tiết tiến độ">
            <Button
              // type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewTaskDetails(record)}
            >
              View Details
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            Task Management
          </Title>
          <Text type="secondary">
            List of all tasks. Click "View Details" to see detailed task
            information. tiết task.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchAllTaskAssignments(filters, pagination)}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      <Card className={styles.filterCard}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo: Contract ID, Contract Number, Contract Name, Milestone ID, Specialist ID, Specialist Name"
              value={filters.search}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={handleStatusChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              value={filters.taskType}
              options={TASK_TYPE_OPTIONS}
              onChange={handleTaskTypeChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              value={filters.progress}
              options={PROGRESS_OPTIONS}
              onChange={handleProgressChange}
              style={{ width: '100%' }}
              placeholder="Lọc theo tiến độ"
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Spin spinning={loading}>
          {taskAssignments.length > 0 ? (
            <Table
              columns={columns}
              dataSource={taskAssignments}
              rowKey="assignmentId"
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
              }}
              onChange={handleTableChange}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          ) : (
            <Empty description="Chưa có task assignment nào" />
          )}
        </Spin>
      </Card>

      {/* Task Progress Detail Modal */}
      <Modal
        title="Chi tiết Tiến độ Task"
        open={taskDetailModalVisible}
        onCancel={() => {
          setTaskDetailModalVisible(false);
          setSelectedTask(null);
          setTaskFiles([]);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setTaskDetailModalVisible(false);
              setSelectedTask(null);
              setTaskFiles([]);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={900}
      >
        {selectedTask && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Task Info */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Task Type">
                <Tag color="cyan">
                  {TASK_TYPE_LABELS[selectedTask.taskType] ||
                    selectedTask.taskType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[selectedTask.status] || 'default'}>
                  {STATUS_LABELS[selectedTask.status] || selectedTask.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Specialist">
                <Space direction="vertical" size={0}>
                  <Text strong>
                    {selectedTask.specialistName ||
                      selectedTask.specialistId ||
                      'N/A'}
                  </Text>
                  {selectedTask.specialistEmail && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {selectedTask.specialistEmail}
                    </Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Milestone">
                {getMilestoneName(selectedTask)}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Date">
                {selectedTask.assignedDate
                  ? dayjs(selectedTask.assignedDate).format('HH:mm DD/MM/YYYY')
                  : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Deadline">
                {(() => {
                  const actualStart = getActualStartDayjs(
                    selectedTask.milestone
                  );
                  const actualDeadline = getActualDeadlineDayjs(
                    selectedTask.milestone
                  );
                  const plannedStart = getPlannedStartDayjs(
                    selectedTask.milestone
                  );
                  const plannedDeadline = getPlannedDeadlineDayjs(
                    selectedTask.milestone
                  );
                  // Dùng estimatedDeadline từ backend thay vì tính ở frontend
                  const estimatedDeadline = selectedTask.milestone
                    ?.estimatedDeadline
                    ? dayjs(selectedTask.milestone.estimatedDeadline)
                    : null;
                  return (
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>Target</Text>
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Start:{' '}
                            {actualStart
                              ? actualStart.format('HH:mm DD/MM/YYYY')
                              : 'Chưa có'}
                          </Text>
                          <Text>
                            Deadline:{' '}
                            {actualDeadline
                              ? actualDeadline.format('HH:mm DD/MM/YYYY')
                              : '-'}
                          </Text>
                        </Space>
                      </div>
                      {/* Chỉ hiển thị Planned khi không có Target */}
                      {!actualDeadline && (
                        <div>
                          <Text strong type="secondary">
                            Planned
                          </Text>
                          <Space direction="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Start:{' '}
                              {plannedStart
                                ? plannedStart.format('HH:mm DD/MM/YYYY')
                                : '-'}
                            </Text>
                            <Text type="secondary">
                              Deadline:{' '}
                              {plannedDeadline
                                ? plannedDeadline.format('HH:mm DD/MM/YYYY')
                                : '-'}
                            </Text>
                          </Space>
                        </div>
                      )}
                      {!actualDeadline &&
                        !plannedDeadline &&
                        estimatedDeadline && (
                          <div>
                            <Text strong type="warning">
                              Estimated
                            </Text>
                            <Text type="secondary">
                              Deadline:{' '}
                              {estimatedDeadline.format('HH:mm DD/MM/YYYY')}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              (Ước tính khi chưa có planned/actual)
                            </Text>
                          </div>
                        )}
                    </Space>
                  );
                })()}
              </Descriptions.Item>
              {selectedTask.milestone && (
                <>
                  <Descriptions.Item label="First Submission">
                    {selectedTask.milestone.firstSubmissionAt
                      ? dayjs(selectedTask.milestone.firstSubmissionAt).format(
                          'HH:mm DD/MM/YYYY'
                        )
                      : '—'}
                    {selectedTask.milestone.firstSubmissionAt && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                      >
                        (Lần giao đầu tiên - để check SLA)
                      </Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Work Completed">
                    {selectedTask.milestone.finalCompletedAt
                      ? dayjs(selectedTask.milestone.finalCompletedAt).format(
                          'HH:mm DD/MM/YYYY'
                        )
                      : '—'}
                    {selectedTask.milestone.finalCompletedAt && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                      >
                        (Customer đã chấp nhận)
                      </Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Payment Completed">
                    {selectedTask.milestone.actualEndAt
                      ? dayjs(selectedTask.milestone.actualEndAt).format(
                          'HH:mm DD/MM/YYYY'
                        )
                      : '—'}
                    {selectedTask.milestone.actualEndAt && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                      >
                        (Milestone đã được thanh toán)
                      </Text>
                    )}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            {/* Progress Timeline */}
            <Card title="Timeline Tiến độ" size="small">
              <Timeline
                items={(() => {
                  const timelineItems = [];

                  // 1. Task được gán
                  timelineItems.push({
                    color: selectedTask.assignedDate ? 'green' : 'gray',
                    dot: selectedTask.assignedDate ? (
                      <CheckCircleOutlined />
                    ) : (
                      <ClockCircleOutlined />
                    ),
                    children: (
                      <Space direction="vertical" size={0}>
                        <Text strong>Task được gán</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedTask.assignedDate
                            ? dayjs(selectedTask.assignedDate).format(
                                'HH:mm DD/MM/YYYY'
                              )
                            : 'Chưa có'}
                        </Text>
                      </Space>
                    ),
                  });

                  // 2. Specialist accept task (bắt đầu làm)
                  if (
                    selectedTask.status === 'in_progress' ||
                    selectedTask.status === 'completed'
                  ) {
                    timelineItems.push({
                      color: 'blue',
                      dot: <PlayCircleOutlined />,
                      children: (
                        <Space direction="vertical" size={0}>
                          <Text strong>Specialist bắt đầu làm</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedTask.specialistRespondedAt
                              ? dayjs(
                                  selectedTask.specialistRespondedAt
                                ).format('HH:mm DD/MM/YYYY')
                              : 'Đã bắt đầu'}
                          </Text>
                        </Space>
                      ),
                    });
                  }

                  // 3. File được upload (nếu có)
                  if (taskFiles.length > 0) {
                    const uploadedFiles = taskFiles.filter(f => f.uploadDate);
                    if (uploadedFiles.length > 0) {
                      const latestUpload = uploadedFiles.sort(
                        (a, b) =>
                          new Date(b.uploadDate) - new Date(a.uploadDate)
                      )[0];
                      timelineItems.push({
                        color:
                          latestUpload.fileStatus?.toLowerCase() === 'rejected'
                            ? 'red'
                            : 'blue',
                        dot: <FileOutlined />,
                        children: (
                          <Space direction="vertical" size={0}>
                            <Text strong>
                              File được upload
                              {uploadedFiles.length > 1 &&
                                ` (${uploadedFiles.length} files)`}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(latestUpload.uploadDate).format(
                                'HH:mm DD/MM/YYYY'
                              )}
                            </Text>
                            {latestUpload.fileName && (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                File: {latestUpload.fileName}
                              </Text>
                            )}
                          </Space>
                        ),
                      });
                    }
                  }

                  // 4. File được approve (nếu có)
                  const approvedFiles = taskFiles.filter(
                    f => f.fileStatus?.toLowerCase() === 'approved'
                  );
                  if (approvedFiles.length > 0) {
                    const latestApproved = approvedFiles.sort(
                      (a, b) =>
                        new Date(b.reviewedAt || b.uploadDate) -
                        new Date(a.reviewedAt || a.uploadDate)
                    )[0];
                    timelineItems.push({
                      color: 'green',
                      dot: <CheckCircleOutlined />,
                      children: (
                        <Space direction="vertical" size={0}>
                          <Text strong>
                            File được duyệt
                            {approvedFiles.length > 1 &&
                              ` (${approvedFiles.length} files)`}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {latestApproved.reviewedAt
                              ? dayjs(latestApproved.reviewedAt).format(
                                  'HH:mm DD/MM/YYYY'
                                )
                              : latestApproved.uploadDate
                                ? dayjs(latestApproved.uploadDate).format(
                                    'HH:mm DD/MM/YYYY'
                                  )
                                : 'N/A'}
                          </Text>
                          {latestApproved.fileName && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              File: {latestApproved.fileName}
                            </Text>
                          )}
                        </Space>
                      ),
                    });
                  }

                  // 5. File được deliver (nếu có)
                  const deliveredFiles = taskFiles.filter(
                    f => f.deliveredToCustomer
                  );
                  if (deliveredFiles.length > 0) {
                    const latestDelivered = deliveredFiles.sort(
                      (a, b) =>
                        new Date(b.deliveredAt || b.uploadDate) -
                        new Date(a.deliveredAt || a.uploadDate)
                    )[0];
                    timelineItems.push({
                      color: 'green',
                      dot: <CheckCircleOutlined />,
                      children: (
                        <Space direction="vertical" size={0}>
                          <Text strong>
                            File được giao khách
                            {deliveredFiles.length > 1 &&
                              ` (${deliveredFiles.length} files)`}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {latestDelivered.deliveredAt
                              ? dayjs(latestDelivered.deliveredAt).format(
                                  'HH:mm DD/MM/YYYY'
                                )
                              : latestDelivered.uploadDate
                                ? dayjs(latestDelivered.uploadDate).format(
                                    'HH:mm DD/MM/YYYY'
                                  )
                                : 'N/A'}
                          </Text>
                          {latestDelivered.fileName && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              File: {latestDelivered.fileName}
                            </Text>
                          )}
                        </Space>
                      ),
                    });
                  }

                  // 6. Task hoàn thành
                  if (selectedTask.status === 'completed') {
                    timelineItems.push({
                      color: 'green',
                      dot: <CheckCircleOutlined />,
                      children: (
                        <Space direction="vertical" size={0}>
                          <Text strong>Task hoàn thành</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedTask.completedDate
                              ? dayjs(selectedTask.completedDate).format(
                                  'HH:mm DD/MM/YYYY'
                                )
                              : 'Đã hoàn thành'}
                          </Text>
                        </Space>
                      ),
                    });
                  } else if (selectedTask.status === 'cancelled') {
                    timelineItems.push({
                      color: 'red',
                      dot: <ExclamationCircleOutlined />,
                      children: (
                        <Space direction="vertical" size={0}>
                          <Text strong type="danger">
                            Task đã hủy
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedTask.completedDate
                              ? dayjs(selectedTask.completedDate).format(
                                  'HH:mm DD/MM/YYYY'
                                )
                              : 'Đã hủy'}
                          </Text>
                        </Space>
                      ),
                    });
                  }

                  return timelineItems;
                })()}
              />
            </Card>

            {/* Files Section */}
            <Card title="Files đã upload" size="small">
              <Spin spinning={filesLoading}>
                {taskFiles.length > 0 ? (
                  <List
                    dataSource={taskFiles}
                    renderItem={file => (
                      <List.Item>
                        <Space
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Space>
                            <FileOutlined />
                            <Text strong>{file.fileName}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ({formatFileSize(file.fileSize)})
                            </Text>
                            <Tag
                              color={
                                FILE_STATUS_COLORS[
                                  file.fileStatus?.toLowerCase()
                                ] || 'default'
                              }
                            >
                              {FILE_STATUS_LABELS[
                                file.fileStatus?.toLowerCase()
                              ] ||
                                file.fileStatus ||
                                'N/A'}
                            </Tag>
                            {file.deliveredToCustomer && (
                              <Tag color="green">Đã giao khách</Tag>
                            )}
                          </Space>
                          <Space>
                            {file.uploadDate && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(file.uploadDate).format(
                                  'HH:mm DD/MM/YYYY'
                                )}
                              </Text>
                            )}
                          </Space>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description="Chưa có file nào được upload"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Spin>
            </Card>

            {/* Issue Section */}
            {selectedTask.hasIssue && (
              <Card
                title="Issue"
                size="small"
                style={{ borderColor: '#ff4d4f' }}
                extra={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      setTaskDetailModalVisible(false);
                      handleViewIssueDetails(selectedTask);
                    }}
                  >
                    Xử lý Issue
                  </Button>
                }
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                    Có issue
                  </Tag>
                  {selectedTask.issueReason && (
                    <Text type="danger">{selectedTask.issueReason}</Text>
                  )}
                  {selectedTask.issueReportedAt && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Báo lúc:{' '}
                      {dayjs(selectedTask.issueReportedAt).format(
                        'HH:mm DD/MM/YYYY'
                      )}
                    </Text>
                  )}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Modal>

      {/* Modal hiển thị và xử lý issue */}
      <Modal
        title="Chi tiết Issue / Vấn đề"
        open={issueModalVisible}
        onCancel={handleCloseIssueModal}
        footer={[
          <Button key="close" onClick={handleCloseIssueModal}>
            Đóng
          </Button>,
          <Button key="continue" type="primary" onClick={handleResolveIssue}>
            Cho tiếp tục
          </Button>,
          <Popconfirm
            key="cancel"
            title="Xác nhận hủy task và tạo task mới?"
            description="Task hiện tại sẽ bị hủy và bạn sẽ được chuyển đến trang tạo task mới với thông tin tương tự (milestone, task type). Bạn chỉ cần chọn specialist mới."
            onConfirm={handleCancelAndCreateNew}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={cancellingTask}>
              Cancel and create new
            </Button>
          </Popconfirm>,
        ]}
        width={700}
      >
        {selectedIssueTask && (
          <div style={{ marginTop: 16 }}>
            <p>
              <strong>Assignment ID:</strong> {selectedIssueTask.assignmentId}
            </p>
            <p>
              <strong>Task Type:</strong>{' '}
              {TASK_TYPE_LABELS[selectedIssueTask.taskType] ||
                selectedIssueTask.taskType}
            </p>
            <p>
              <strong>Specialist:</strong>{' '}
              {formatSpecialistText(selectedIssueTask)}
            </p>
            <p>
              <strong>Milestone:</strong> {getMilestoneName(selectedIssueTask)}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <Tag color="processing">Đang thực hiện</Tag>{' '}
              <Tag color="orange">Có issue</Tag>
            </p>
            <p>
              <strong>Assigned Date:</strong>{' '}
              {selectedIssueTask.assignedDate
                ? dayjs(selectedIssueTask.assignedDate).format(
                    'YYYY-MM-DD HH:mm'
                  )
                : 'N/A'}
            </p>

            {selectedIssueTask.issueReportedAt && (
              <p>
                <strong>Thời gian báo issue:</strong>{' '}
                {dayjs(selectedIssueTask.issueReportedAt).format(
                  'YYYY-MM-DD HH:mm'
                )}
              </p>
            )}

            {selectedIssueTask.issueReason && (
              <div style={{ marginTop: 12 }}>
                <p>
                  <strong>Lý do báo issue:</strong>
                </p>
                <p
                  style={{
                    padding: 12,
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: 4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedIssueTask.issueReason}
                </p>
              </div>
            )}

            {selectedIssueTask.notes && (
              <div style={{ marginTop: 12 }}>
                <p>
                  <strong>Ghi chú:</strong>
                </p>
                <p
                  style={{
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {selectedIssueTask.notes}
                </p>
              </div>
            )}

            <Alert
              message="Quyết định"
              description="Bạn có thể cho specialist tiếp tục (clear issue flag) hoặc cancel task nếu thấy không thể tiếp tục."
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
