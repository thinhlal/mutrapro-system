import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  FileOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getAllContracts,
  getContractById,
} from '../../../services/contractService';
import {
  getTaskAssignmentsByContract,
  resolveIssue,
  cancelTaskByManager,
} from '../../../services/taskAssignmentService';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './TaskProgressManagement.module.css';

const { Title, Text } = Typography;

// Task type labels
const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording: 'Recording',
};

// Assignment status colors
const STATUS_COLORS = {
  assigned: 'blue',
  accepted_waiting: 'gold',
  ready_to_start: 'purple',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'error',
};

// Assignment status labels
const STATUS_LABELS = {
  assigned: 'Đã gán',
  accepted_waiting: 'Đã nhận - Chờ',
  ready_to_start: 'Sẵn sàng làm',
  in_progress: 'Đang thực hiện',
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

const getPlannedDeadlineDayjs = milestone =>
  milestone?.plannedDueDate ? dayjs(milestone.plannedDueDate) : null;

const getActualDeadlineDayjs = milestone => {
  if (!milestone) return null;
  const actualStart = getActualStartDayjs(milestone);
  if (actualStart && milestone.milestoneSlaDays) {
    return actualStart.add(milestone.milestoneSlaDays, 'day');
  }
  if (milestone.actualEndAt) {
    return dayjs(milestone.actualEndAt);
  }
  return null;
};

const getTaskCompletionDate = task =>
  task?.completedDate || task?.milestone?.actualEndAt || null;

export default function TaskProgressManagement() {
  const [contracts, setContracts] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [taskAssignments, setTaskAssignments] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailModalVisible, setTaskDetailModalVisible] = useState(false);
  const [taskFiles, setTaskFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [taskFilesMap, setTaskFilesMap] = useState({}); // Map assignmentId -> files[]
  const [contractTaskStats, setContractTaskStats] = useState({}); // Map contractId -> stats
  const [contractsCollapsed, setContractsCollapsed] = useState(false); // Collapse contracts sidebar
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedIssueTask, setSelectedIssueTask] = useState(null);
  const [cancellingTask, setCancellingTask] = useState(false);
  const navigate = useNavigate();

  const fetchContracts = useCallback(async () => {
    try {
      setContractsLoading(true);
      setContracts([]);
      const response = await getAllContracts();
      if (response?.status === 'success' && response?.data) {
        const activeContracts = response.data.filter(
          c => {
            const status = c.status?.toLowerCase();
            return status === 'active' || status === 'active_pending_assignment';
          }
        );
        setContracts(activeContracts);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      message.error('Lỗi khi tải danh sách contracts');
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Auto select first contract when data available
  useEffect(() => {
    if (!selectedContractId && contracts.length > 0) {
      setSelectedContractId(contracts[0].contractId);
    }
  }, [contracts, selectedContractId]);

  // Fetch task assignments when contract is selected
  useEffect(() => {
    if (selectedContractId) {
      fetchTaskAssignments(selectedContractId);
      fetchContractDetail(selectedContractId);
    } else {
      setTaskAssignments([]);
      setSelectedContract(null);
    }
  }, [selectedContractId]);

  const fetchContractDetail = async contractId => {
    try {
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        setSelectedContract(response.data);
      }
    } catch (error) {
      console.error('Error fetching contract detail:', error);
    }
  };

  // Compute task stats for a contract
  const computeTaskStats = tasks => {
    const stats = {
      total: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      hasIssue: 0,
    };

    tasks.forEach(task => {
      stats.total += 1;
      const status = task.status?.toLowerCase();
      if (status === 'in_progress') stats.inProgress += 1;
      else if (status === 'completed') stats.completed += 1;
      else if (status === 'cancelled') stats.cancelled += 1;
      else stats.assigned += 1;
      if (task.hasIssue) stats.hasIssue += 1;
    });

    return stats;
  };

  // Update contract stats
  const updateContractStats = useCallback((contractId, tasks) => {
    setContractTaskStats(prev => ({
      ...prev,
      [contractId]: computeTaskStats(tasks),
    }));
  }, []);

  // Fetch stats for a contract (lazy loading)
  const fetchContractTaskStats = useCallback(
    async contractId => {
      if (contractTaskStats[contractId]) return; // Already fetched

      try {
        const response = await getTaskAssignmentsByContract(contractId);
        const tasks =
          response?.status === 'success' && response?.data ? response.data : [];
        updateContractStats(contractId, tasks);
      } catch (error) {
        console.error(
          `Error fetching task stats for contract ${contractId}:`,
          error
        );
        updateContractStats(contractId, []); // Set default stats on error
      }
    },
    [contractTaskStats, updateContractStats]
  );

  const fetchTaskAssignments = async contractId => {
    try {
      setAssignmentsLoading(true);
      const response = await getTaskAssignmentsByContract(contractId);
      if (response?.status === 'success' && response?.data) {
        const assignments = response.data || [];
        setTaskAssignments(assignments);

        // Update contract stats
        updateContractStats(contractId, assignments);

        // Fetch files for all assignments to calculate progress
        const filesMap = {};
        await Promise.all(
          assignments.map(async assignment => {
            // Skip if assignmentId is missing or invalid
            if (!assignment.assignmentId) {
              filesMap[assignment.assignmentId] = [];
              return;
            }

            try {
              const filesResponse = await axiosInstance.get(
                `/api/v1/projects/files/by-assignment/${assignment.assignmentId}`
              );
              if (
                filesResponse?.data?.status === 'success' &&
                filesResponse?.data?.data
              ) {
                filesMap[assignment.assignmentId] =
                  filesResponse.data.data || [];
              } else {
                filesMap[assignment.assignmentId] = [];
              }
            } catch (error) {
              // Log error but don't break the flow - just set empty array
              if (error?.response?.status !== 500) {
                console.error(
                  `Error fetching files for assignment ${assignment.assignmentId}:`,
                  error
                );
              }
              filesMap[assignment.assignmentId] = [];
            }
          })
        );
        setTaskFilesMap(filesMap);
      }
    } catch (error) {
      console.error('Error fetching task assignments:', error);
      message.error('Lỗi khi tải danh sách task assignments');
      setTaskAssignments([]);
      setTaskFilesMap({});
    } finally {
      setAssignmentsLoading(false);
    }
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

  // Get milestone name by ID
  const getMilestoneName = milestoneId => {
    if (!selectedContract?.milestones || !milestoneId) return 'N/A';
    const milestone = selectedContract.milestones.find(
      m => m.milestoneId === milestoneId
    );
    return milestone ? milestone.name : milestoneId;
  };

  // Calculate progress percentage
  // Logic: Kết hợp status và files (Cách 2)
  // - assigned: 0% (chưa bắt đầu)
  // - in_progress + chưa có file: 25%
  // - in_progress + có file uploaded: 50%
  // - in_progress + có file approved: 75%
  // - completed: 100% (hoàn thành)
  // - cancelled: 0% (đã hủy)
  const calculateProgress = record => {
    const status = record.status?.toLowerCase();
    if (
      status === 'assigned' ||
      status === 'accepted_waiting' ||
      status === 'ready_to_start'
    )
      return 0;
    if (status === 'cancelled') return 0;
    if (status === 'completed') return 100;

    // in_progress: tính dựa trên files
    if (status === 'in_progress') {
      const files = taskFilesMap[record.assignmentId] || [];

      if (files.length === 0) {
        // Chưa có file nào
        return 25;
      }

      // Kiểm tra file status cao nhất
      const hasDelivered = files.some(f => f.deliveredToCustomer);
      const hasApproved = files.some(
        f => f.fileStatus?.toLowerCase() === 'approved'
      );
      const hasPendingReview = files.some(
        f => f.fileStatus?.toLowerCase() === 'pending_review'
      );
      const hasUploaded = files.some(
        f => f.fileStatus?.toLowerCase() === 'uploaded'
      );

      if (hasDelivered) return 100;
      if (hasApproved) return 75;
      if (hasPendingReview) return 50;
      if (hasUploaded) return 50;

      // Có file nhưng không rõ status
      return 50;
    }

    return 0;
  };

  // Get contract badge/indicator
  const getContractBadge = useCallback(
    contractId => {
      const stats = contractTaskStats[contractId];
      if (!stats) {
        // Chưa có stats - ưu tiên thấp nhưng không phải cuối cùng
        return { label: null, color: null, priority: 50 };
      }

      const activeTasks = stats.total - stats.cancelled;

      // Ưu tiên hiển thị issue nếu có (cần theo dõi)
      if (stats.hasIssue > 0 && activeTasks > 0) {
        return {
          label: `⚠️ ${stats.hasIssue} issue`,
          color: 'orange',
          priority: 0,
        };
      }

      // Hiển thị thông tin task active - ưu tiên cao
      if (stats.inProgress > 0) {
        return {
          label: `🔄 ${stats.inProgress} đang làm`,
          color: 'blue',
          priority: 1, // Đổi từ 2 xuống 1 để ưu tiên hơn "chưa có task"
        };
      }

      if (stats.total === 0) {
        return { label: 'Chưa có task', color: 'default', priority: 2 };
      }

      if (stats.assigned > 0) {
        return {
          label: `📋 ${stats.assigned} đã gán`,
          color: 'cyan',
          priority: 3,
        };
      }

      if (stats.completed === activeTasks && activeTasks > 0) {
        return {
          label: `✅ ${stats.completed} hoàn thành`,
          color: 'green',
          priority: 4, // Hoàn thành ưu tiên thấp nhất
        };
      }

      return { label: null, color: null, priority: 50 };
    },
    [contractTaskStats]
  );

  // Filter contracts by search
  const filteredContracts = useMemo(() => {
    const keyword = contractSearch.toLowerCase();
    return contracts
      .filter(contract => {
        if (!keyword) return true;
        const number = contract.contractNumber?.toLowerCase() || '';
        const name = contract.nameSnapshot?.toLowerCase() || '';
        const type = contract.contractType?.toLowerCase() || '';
        return (
          number.includes(keyword) ||
          name.includes(keyword) ||
          type.includes(keyword)
        );
      })
      .sort((a, b) => {
        // Sort by priority: contracts with issues first, then in progress, then others
        const badgeA = getContractBadge(a.contractId);
        const badgeB = getContractBadge(b.contractId);
        const priorityA = badgeA?.priority ?? 99;
        const priorityB = badgeB?.priority ?? 99;

        // Sort by priority (lower number = higher priority)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // If same priority, sort by contract number
        return (a.contractNumber || '').localeCompare(b.contractNumber || '');
      });
  }, [contracts, contractSearch, getContractBadge]);

  // Lazy load stats for displayed contracts
  useEffect(() => {
    if (filteredContracts.length === 0) return;
    // Fetch stats for first 20 contracts (to avoid too many API calls)
    filteredContracts.slice(0, 20).forEach(contract => {
      if (!contractTaskStats[contract.contractId]) {
        fetchContractTaskStats(contract.contractId);
      }
    });
  }, [filteredContracts, contractTaskStats, fetchContractTaskStats]);

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
        {specialization && <Tag size="small">{specialization}</Tag>}
      </Space>
    );
  };

  // Handle view task details - navigate to milestone detail page
  const handleViewTaskDetails = record => {
    if (record.milestoneId) {
      navigate(
        `/manager/milestone-assignments/${record.contractId}/milestone/${record.milestoneId}`
      );
    } else {
      message.warning('Không tìm thấy milestone ID');
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
    if (!selectedIssueTask || !selectedContractId) return;
    try {
      const response = await resolveIssue(
        selectedContractId,
        selectedIssueTask.assignmentId
      );
      if (response?.status === 'success') {
        message.success('Đã cho phép specialist tiếp tục task');
        setIssueModalVisible(false);
        setSelectedIssueTask(null);
        await fetchTaskAssignments(selectedContractId);
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      message.error(error?.message || 'Lỗi khi resolve issue');
    }
  };

  // Handle cancel task by manager and create new
  const handleCancelAndCreateNew = async () => {
    if (!selectedIssueTask || !selectedContractId) return;
    try {
      setCancellingTask(true);
      const response = await cancelTaskByManager(
        selectedContractId,
        selectedIssueTask.assignmentId
      );
      if (response?.status === 'success') {
        message.success(
          'Đã hủy task thành công. Đang chuyển đến trang tạo task mới...'
        );
        setIssueModalVisible(false);
        const taskToCreate = selectedIssueTask;
        setSelectedIssueTask(null);

        // Navigate đến workspace với data pre-filled từ task cũ
        navigate(
          `/manager/milestone-assignments/${selectedContractId}/new?milestoneId=${taskToCreate.milestoneId}&taskType=${taskToCreate.taskType}&excludeSpecialistId=${taskToCreate.specialistId}`
        );
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(error?.message || 'Lỗi khi hủy task');
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

  // Sort task assignments: ưu tiên theo status, issue, và deadline
  const sortedTaskAssignments = useMemo(() => {
    return [...taskAssignments].sort((a, b) => {
      // 1. Ưu tiên tasks có issue (cần theo dõi)
      if (a.hasIssue && !b.hasIssue) return -1;
      if (!a.hasIssue && b.hasIssue) return 1;

      // 2. Ưu tiên theo status: in_progress > assigned > completed > cancelled
      const statusPriority = {
        in_progress: 0,
        assigned: 1,
        completed: 2,
        cancelled: 3,
      };
      const priorityA = statusPriority[a.status?.toLowerCase()] ?? 99;
      const priorityB = statusPriority[b.status?.toLowerCase()] ?? 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Nếu cùng status, sort theo deadline (sắp đến hạn lên trước)
      const dueDateA =
        getActualDeadlineDayjs(a.milestone) ||
        getPlannedDeadlineDayjs(a.milestone);
      const dueDateB =
        getActualDeadlineDayjs(b.milestone) ||
        getPlannedDeadlineDayjs(b.milestone);
      if (dueDateA && dueDateB) {
        return dayjs(dueDateA).valueOf() - dayjs(dueDateB).valueOf();
      }
      if (dueDateA && !dueDateB) return -1;
      if (!dueDateA && dueDateB) return 1;

      // 4. Nếu không có deadline, sort theo assignedDate (mới nhất lên trước)
      const dateA = a.assignedDate || '';
      const dateB = b.assignedDate || '';
      if (dateA && dateB) {
        return new Date(dateB) - new Date(dateA);
      }

      return 0;
    });
  }, [taskAssignments]);

  // Table columns - tối ưu width để tránh scroll ngang
  const columns = [
    {
      title: 'Task Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 100,
      fixed: 'left',
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
      render: milestoneId => (
        <Text
          type="secondary"
          ellipsis={{ tooltip: getMilestoneName(milestoneId) }}
        >
          {getMilestoneName(milestoneId)}
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
        const percent = calculateProgress(record);
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
        const actualStart = getActualStartDayjs(record.milestone);
        const plannedStart = getPlannedStartDayjs(record.milestone);
        if (!actualDeadline && !plannedDeadline) {
          return <Text type="secondary">-</Text>;
        }
        const now = dayjs();
        const isOverdue =
          actualDeadline &&
          actualDeadline.isBefore(now) &&
          record.status !== 'completed';
        const diffDays = actualDeadline
          ? actualDeadline.diff(now, 'day')
          : null;
        const isNearDeadline =
          diffDays !== null && diffDays <= 3 && diffDays >= 0 && !isOverdue;
        return (
          <Space direction="vertical" size={0}>
            <Text strong>Actual timeline</Text>
            {actualDeadline ? (
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
              </Space>
            ) : (
              <Text type="secondary">Chưa bắt đầu</Text>
            )}
            <Divider style={{ margin: '4px 0' }} dashed />
            <Text strong type="secondary">
              Planned timeline
            </Text>
            {plannedDeadline ? (
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
            ) : (
              <Text type="secondary">-</Text>
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
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewTaskDetails(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Quản lý Tiến độ Task</Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchContracts();
              if (selectedContractId) {
                fetchContractDetail(selectedContractId);
                fetchTaskAssignments(selectedContractId);
              }
            }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className={styles.layoutGrid}>
        {!contractsCollapsed && (
          <Col xs={24} lg={6}>
            <Card
              title="Contracts"
              extra={
                <Button
                  type="text"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setContractsCollapsed(true)}
                  size="small"
                />
              }
            >
              <Input.Search
                placeholder="Tìm contract..."
                allowClear
                value={contractSearch}
                onChange={e => setContractSearch(e.target.value)}
                onSearch={value => setContractSearch(value)}
              />
              <div className={styles.contractList}>
                {contractsLoading ? (
                  <div className={styles.contractListLoading}>
                    <Spin size="large" tip="Đang tải contracts..." />
                  </div>
                ) : filteredContracts.length > 0 ? (
                  <List
                    rowKey="contractId"
                    dataSource={filteredContracts}
                    renderItem={item => {
                      const isActive = item.contractId === selectedContractId;
                      return (
                        <List.Item
                          className={`${styles.contractItem} ${
                            isActive ? styles.contractItemActive : ''
                          }`}
                          onClick={() => setSelectedContractId(item.contractId)}
                        >
                          <div style={{ flex: 1 }}>
                            <div>
                              <Text strong>{item.contractNumber}</Text>
                              <span className={styles.contractMeta}>
                                {item.nameSnapshot || 'N/A'}
                              </span>
                            </div>
                            {(() => {
                              const badge = getContractBadge(item.contractId);
                              const stats = contractTaskStats[item.contractId];
                              return (
                                <div style={{ marginTop: 4 }}>
                                  {badge && (
                                    <Tag
                                      color={badge.color}
                                      style={{ marginRight: 4 }}
                                    >
                                      {badge.label}
                                    </Tag>
                                  )}
                                  {stats && stats.total > 0 && (
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: 11 }}
                                    >
                                      Tổng: {stats.total} tasks
                                    </Text>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div>
                            <Tag>{item.contractType}</Tag>
                            <Tag
                              color="green"
                              className={styles.contractStatus}
                            >
                              {item.status}
                            </Tag>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty
                    description="Không có contract nào"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </Card>
          </Col>
        )}
        <Col xs={24} lg={contractsCollapsed ? 24 : 18}>
          <Card
            title={
              contractsCollapsed && (
                <Space>
                  <Button
                    type="text"
                    icon={<MenuUnfoldOutlined />}
                    onClick={() => setContractsCollapsed(false)}
                    size="small"
                  />
                  <span>Danh sách Tasks</span>
                </Space>
              )
            }
          >
            {selectedContract ? (
              <Space
                direction="vertical"
                size="large"
                style={{ width: '100%' }}
              >
                <div className={styles.contractInfo}>
                  <div>
                    <Text strong>Contract Number: </Text>
                    <Text>{selectedContract.contractNumber}</Text>
                  </div>
                  <div>
                    <Text strong>Customer: </Text>
                    <Text>{selectedContract.nameSnapshot || 'N/A'}</Text>
                  </div>
                  <div>
                    <Text strong>Contract Type: </Text>
                    <Tag>{selectedContract.contractType}</Tag>
                  </div>
                </div>

                <div>
                  <Title level={4}>Danh sách Tasks</Title>
                  <Spin spinning={assignmentsLoading}>
                    {taskAssignments.length > 0 ? (
                      <Table
                        columns={columns}
                        dataSource={sortedTaskAssignments}
                        rowKey="assignmentId"
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 'max-content' }}
                        size="small"
                      />
                    ) : (
                      <Empty description="Chưa có task assignment nào" />
                    )}
                  </Spin>
                </div>
              </Space>
            ) : (
              <Empty description="Vui lòng chọn contract để xem tasks" />
            )}
          </Card>
        </Col>
      </Row>

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
                {getMilestoneName(selectedTask.milestoneId)}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Date">
                {selectedTask.assignedDate
                  ? dayjs(selectedTask.assignedDate).format('HH:mm DD/MM/YYYY')
                  : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Deadline">
                <Space direction="vertical" size="small">
                  <div>
                    <Text strong>Actual</Text>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Start:{' '}
                        {getActualStartDayjs(selectedTask.milestone)
                          ? getActualStartDayjs(selectedTask.milestone).format(
                              'HH:mm DD/MM/YYYY'
                            )
                          : 'Chưa có'}
                      </Text>
                      <Text>
                        Deadline:{' '}
                        {getActualDeadlineDayjs(selectedTask.milestone)
                          ? getActualDeadlineDayjs(
                              selectedTask.milestone
                            ).format('HH:mm DD/MM/YYYY')
                          : '-'}
                      </Text>
                    </Space>
                  </div>
                  <div>
                    <Text strong type="secondary">
                      Planned
                    </Text>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Start:{' '}
                        {getPlannedStartDayjs(selectedTask.milestone)
                          ? getPlannedStartDayjs(selectedTask.milestone).format(
                              'HH:mm DD/MM/YYYY'
                            )
                          : '-'}
                      </Text>
                      <Text type="secondary">
                        Deadline:{' '}
                        {getPlannedDeadlineDayjs(selectedTask.milestone)
                          ? getPlannedDeadlineDayjs(
                              selectedTask.milestone
                            ).format('HH:mm DD/MM/YYYY')
                          : '-'}
                      </Text>
                    </Space>
                  </div>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Completed Date">
                <Space direction="vertical" size="small">
                  <div>
                    <Text strong>Actual</Text>
                    {getTaskCompletionDate(selectedTask) ? (
                      <Text>
                        {dayjs(getTaskCompletionDate(selectedTask)).format(
                          'HH:mm DD/MM/YYYY'
                        )}
                      </Text>
                    ) : (
                      <Text type="secondary">Chưa có</Text>
                    )}
                  </div>
                  <div>
                    <Text strong type="secondary">
                      Planned deadline
                    </Text>
                    {getPlannedDeadlineDayjs(selectedTask.milestone) ? (
                      <Text type="secondary">
                        {getPlannedDeadlineDayjs(selectedTask.milestone).format(
                          'HH:mm DD/MM/YYYY'
                        )}
                      </Text>
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </div>
                </Space>
              </Descriptions.Item>
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
              <strong>Milestone:</strong>{' '}
              {getMilestoneName(selectedIssueTask.milestoneId)}
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
