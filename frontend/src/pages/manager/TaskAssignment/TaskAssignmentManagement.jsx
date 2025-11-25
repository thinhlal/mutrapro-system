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
  Popconfirm,
  Empty,
  Row,
  Col,
  List,
  Alert,
  Modal,
  Form,
} from 'antd';
import {
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getAllContracts,
  getContractById,
} from '../../../services/contractService';
import {
  getTaskAssignmentsByContract,
  deleteTaskAssignment,
  resolveIssue,
  cancelTaskByManager,
} from '../../../services/taskAssignmentService';
import styles from './TaskAssignmentManagement.module.css';

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
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'error',
};

// Assignment status labels
const STATUS_LABELS = {
  assigned: 'Đã gán',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

// Milestone work status colors
const MILESTONE_WORK_STATUS_COLORS = {
  PLANNED: 'default',
  IN_PROGRESS: 'processing',
  READY_FOR_PAYMENT: 'warning',
  COMPLETED: 'success',
};

// Milestone work status labels
const MILESTONE_WORK_STATUS_LABELS = {
  PLANNED: 'Đã lên kế hoạch',
  IN_PROGRESS: 'Đang thực hiện',
  READY_FOR_PAYMENT: 'Sẵn sàng thanh toán',
  COMPLETED: 'Hoàn thành',
};

const defaultTaskStats = {
  total: 0,
  assigned: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
  hasIssue: 0, // Số task có issue
};

const computeTaskStats = tasks =>
  tasks.reduce(
    (acc, task) => {
      acc.total += 1;
      const status = task.status?.toLowerCase();
      if (status === 'in_progress') acc.inProgress += 1;
      else if (status === 'completed') acc.completed += 1;
      else if (status === 'cancelled') acc.cancelled += 1;
      else acc.assigned += 1;
      // Đếm task có issue
      if (task.hasIssue) acc.hasIssue += 1;
      return acc;
    },
    { ...defaultTaskStats }
  );

export default function TaskAssignmentManagement() {
  const [contracts, setContracts] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [taskAssignments, setTaskAssignments] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [contractTaskStats, setContractTaskStats] = useState({});
  const [contractsDisplayLimit, setContractsDisplayLimit] = useState(50); // Giới hạn số contracts hiển thị ban đầu
  const [cancelledTaskModalVisible, setCancelledTaskModalVisible] =
    useState(false);
  const [selectedCancelledTask, setSelectedCancelledTask] = useState(null);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedIssueTask, setSelectedIssueTask] = useState(null);
  const [cancellingTask, setCancellingTask] = useState(false);
  const navigate = useNavigate();

  const updateContractStats = useCallback((contractId, tasks) => {
    setContractTaskStats(prev => ({
      ...prev,
      [contractId]: computeTaskStats(tasks),
    }));
  }, []);

  // Fetch stats cho một contract cụ thể (lazy loading)
  const fetchContractTaskStats = useCallback(async contractId => {
    // Nếu đã có stats rồi thì không fetch lại
    if (contractTaskStats[contractId]) {
      return;
    }
    
    try {
      const response = await getTaskAssignmentsByContract(contractId);
      const tasks =
        response?.status === 'success' && response?.data
          ? response.data
          : [];
      updateContractStats(contractId, tasks);
    } catch (error) {
      // Nếu lỗi, set default stats
      updateContractStats(contractId, []);
    }
  }, [contractTaskStats, updateContractStats]);

  const fetchContracts = useCallback(async () => {
    try {
      setContractsLoading(true);
      const response = await getAllContracts();
      if (response?.status === 'success' && response?.data) {
        const activeContracts = response.data.filter(
          c => c.status?.toLowerCase() === 'active'
        );
        setContracts(activeContracts);
        // Không fetch stats cho tất cả contracts nữa (quá chậm nếu có nhiều contracts)
        // Stats sẽ được fetch khi:
        // 1. Contract được chọn (trong fetchTaskAssignments)
        // 2. Contract được hover/visible (lazy loading - có thể implement sau)
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      message.error('Lỗi khi tải danh sách contracts');
    } finally {
      setContractsLoading(false);
    }
  }, []);

  // Fetch contracts
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

  const fetchTaskAssignments = async contractId => {
    try {
      setAssignmentsLoading(true);
      const response = await getTaskAssignmentsByContract(contractId);
      if (response?.status === 'success' && response?.data) {
        setTaskAssignments(response.data || []);
        updateContractStats(contractId, response.data || []);
      }
    } catch (error) {
      console.error('Error fetching task assignments:', error);
      message.error('Lỗi khi tải danh sách task assignments');
      setTaskAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const getContractBadge = useCallback(
    contractId => {
      const stats = contractTaskStats[contractId];
      if (!stats) return null;

      // Tính số task active (không phải cancelled)
      const activeTasks = stats.total - stats.cancelled;

      // Ưu tiên hiển thị issue nếu có (cần manager xử lý) và có task active
      if (stats.hasIssue > 0 && activeTasks > 0) {
        return {
          label: `có issue (${stats.hasIssue})`,
          color: 'orange',
          priority: 0,
        };
      }

      if (stats.total === 0) {
        return { label: 'need assignment', color: 'orange', priority: 1 };
      }

      // Chỉ hiển thị cancelled nếu TẤT CẢ task đều cancelled (không còn task active)
      if (stats.cancelled > 0 && activeTasks === 0) {
        return {
          label: `cancelled (${stats.cancelled})`,
          color: 'red',
          priority: -1,
        };
      }

      // Nếu có task cancelled nhưng vẫn còn task active, hiển thị thông tin task active
      if (stats.inProgress > 0) {
        return { label: 'in progress', color: 'green', priority: 2 };
      }
      if (stats.completed === activeTasks && activeTasks > 0) {
        return { label: 'completed', color: 'purple', priority: 3 };
      }
      if (stats.assigned > 0) {
        return { label: 'assigned', color: 'blue', priority: 1 };
      }

      return null;
    },
    [contractTaskStats]
  );

  const filteredContracts = useMemo(() => {
    const keyword = contractSearch.toLowerCase();
    const list = contracts.filter(contract => {
      if (!keyword) return true;
      const number = contract.contractNumber?.toLowerCase() || '';
      const name = contract.nameSnapshot?.toLowerCase() || '';
      const type = contract.contractType?.toLowerCase() || '';
      return (
        number.includes(keyword) ||
        name.includes(keyword) ||
        type.includes(keyword)
      );
    });
    return list.sort((a, b) => {
      const badgeA = getContractBadge(a.contractId);
      const badgeB = getContractBadge(b.contractId);
      const priorityA = badgeA?.priority ?? 99;
      const priorityB = badgeB?.priority ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.contractNumber || '').localeCompare(b.contractNumber || '');
    });
  }, [contracts, contractSearch, getContractBadge]);

  // Chỉ hiển thị một số contracts đầu tiên (giới hạn để tránh quá nhiều)
  const displayedContracts = useMemo(() => {
    return filteredContracts.slice(0, contractsDisplayLimit);
  }, [filteredContracts, contractsDisplayLimit]);

  const hasMoreContracts = filteredContracts.length > contractsDisplayLimit;

  // Lazy load stats cho contracts hiển thị (chỉ fetch cho contracts đang hiển thị)
  useEffect(() => {
    if (displayedContracts.length === 0) return;
    
    // Chỉ fetch stats cho contracts đang hiển thị (giới hạn để tránh quá nhiều API calls)
    displayedContracts.forEach(contract => {
      // Chỉ fetch nếu chưa có stats
      if (!contractTaskStats[contract.contractId]) {
        fetchContractTaskStats(contract.contractId);
      }
    });
  }, [displayedContracts, contractTaskStats, fetchContractTaskStats]);

  const milestoneTaskStats = useMemo(() => {
    const stats = {};
    taskAssignments.forEach(task => {
      if (!task.milestoneId) return;
      if (!stats[task.milestoneId]) {
        stats[task.milestoneId] = { ...defaultTaskStats };
      }
      const status = task.status?.toLowerCase();
      stats[task.milestoneId].total += 1;
      if (status === 'completed') stats[task.milestoneId].completed += 1;
      else if (status === 'in_progress')
        stats[task.milestoneId].inProgress += 1;
      else if (status === 'cancelled') stats[task.milestoneId].cancelled += 1;
      else stats[task.milestoneId].assigned += 1;
      // Đếm task có issue
      if (task.hasIssue) stats[task.milestoneId].hasIssue += 1;
    });
    return stats;
  }, [taskAssignments]);

  const selectedContractSummary = useMemo(
    () => computeTaskStats(taskAssignments),
    [taskAssignments]
  );

  // Sort task assignments: mới nhất lên trước (theo assignedDate hoặc createdAt)
  const sortedTaskAssignments = useMemo(() => {
    return [...taskAssignments].sort((a, b) => {
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
  }, [taskAssignments]);

  // Handle assign task
  const handleAssignTask = () => {
    if (!selectedContractId) {
      message.warning('Vui lòng chọn contract trước');
      return;
    }
    if (
      !selectedContract?.milestones ||
      selectedContract.milestones.length === 0
    ) {
      message.warning('Contract chưa có milestone. Không thể gán task.');
      return;
    }
    navigate(`/manager/task-assignments/${selectedContractId}/new`);
  };

  // Handle edit task assignment
  const handleEdit = record => {
    if (!selectedContractId) {
      message.warning('Vui lòng chọn contract trước');
      return;
    }
    navigate(
      `/manager/task-assignments/${selectedContractId}/edit/${record.assignmentId}`
    );
  };

  // Handle delete task assignment
  const handleDelete = async assignmentId => {
    try {
      const response = await deleteTaskAssignment(
        selectedContractId,
        assignmentId
      );

      if (response?.status === 'success') {
        message.success('Xóa task assignment thành công!');
        fetchTaskAssignments(selectedContractId);
      }
    } catch (error) {
      console.error('Error deleting task assignment:', error);
      message.error(
        error?.message || 'Lỗi khi xóa task assignment. Vui lòng thử lại.'
      );
    }
  };

  // Handle view cancelled task details
  const handleViewCancelledDetails = record => {
    setSelectedCancelledTask(record);
    setCancelledTaskModalVisible(true);
  };

  const handleCloseCancelledTaskModal = () => {
    setCancelledTaskModalVisible(false);
    setSelectedCancelledTask(null);
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
        // Thêm excludeSpecialistId để filter out specialist cũ
        navigate(
          `/manager/task-assignments/${selectedContractId}/new?milestoneId=${taskToCreate.milestoneId}&taskType=${taskToCreate.taskType}&excludeSpecialistId=${taskToCreate.specialistId}`
        );
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(error?.message || 'Lỗi khi hủy task');
    } finally {
      setCancellingTask(false);
    }
  };

  const formatSpecialistText = task => {
    if (!task) return 'N/A';
    const name =
      task.specialistName ||
      task.specialistEmail ||
      task.specialistId ||
      'N/A';
    const specialization = task.specialistSpecialization;
    return specialization ? `${name} (${specialization})` : name;
  };

  const renderSpecialistCell = task => {
    if (!task) return <Text>N/A</Text>;
    const name =
      task.specialistName ||
      task.specialistEmail ||
      task.specialistId ||
      'N/A';
    const specialization = task.specialistSpecialization;
    const email = task.specialistEmail;

    return (
      <Space direction="vertical" size={0}>
        <Text strong>{name}</Text>
        {specialization && (
          <Text type="secondary">{specialization}</Text>
        )}
        {email && (
          <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
        )}
      </Space>
    );
  };

  // Get milestone name by ID
  const getMilestoneName = milestoneId => {
    if (!selectedContract?.milestones || !milestoneId) return 'N/A';
    const milestone = selectedContract.milestones.find(
      m => m.milestoneId === milestoneId
    );
    return milestone ? milestone.name : milestoneId;
  };

  // Table columns
  const columns = [
    {
      title: 'Task Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 150,
      render: type => <Tag color="cyan">{TASK_TYPE_LABELS[type] || type}</Tag>,
    },
    {
      title: 'Specialist',
      dataIndex: 'specialistId',
      key: 'specialistId',
      width: 250,
      render: (_, record) => renderSpecialistCell(record),
    },
    {
      title: 'Milestone',
      dataIndex: 'milestoneId',
      key: 'milestoneId',
      width: 200,
      render: milestoneId => (
        <Text type="secondary">{getMilestoneName(milestoneId)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status, record) => (
        <Space direction="vertical" size={4}>
          <Tag color={STATUS_COLORS[status] || 'default'}>
            {STATUS_LABELS[status] || status?.toUpperCase()}
          </Tag>
          {record.hasIssue && (
            <Tag color="orange" icon={<ExclamationCircleOutlined />}>
              Có issue
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Assigned Date',
      dataIndex: 'assignedDate',
      key: 'assignedDate',
      width: 150,
      render: date => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : 'N/A'),
    },
    {
      title: 'Completed Date',
      dataIndex: 'completedDate',
      key: 'completedDate',
      width: 150,
      render: date => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      width: 150,
      render: notes => (notes ? <Text type="secondary">{notes}</Text> : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const status = record.status?.toLowerCase();
        const isCancelled = status === 'cancelled';
        const isCompleted = status === 'completed';
        const hasIssue = record.hasIssue;

        // Nếu task có issue, ưu tiên hiển thị nút "Xử lý issue"
        if (hasIssue && !isCancelled) {
          return (
            <Space size="small">
              <Tooltip title="Xem và xử lý issue">
                <Button
                  type="primary"
                  danger
                  icon={<ExclamationCircleOutlined />}
                  onClick={() => handleViewIssueDetails(record)}
                >
                  Xử lý issue
                </Button>
              </Tooltip>
            </Space>
          );
        }

        // Nếu task bị hủy, chỉ hiển thị chi tiết
        if (isCancelled) {
          return (
            <Space size="small">
              <Tooltip title="Xem chi tiết task đã hủy">
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewCancelledDetails(record)}
                >
                  Chi tiết
                </Button>
              </Tooltip>
            </Space>
          );
        }

        // Nếu task chưa bị hủy và không có issue, hiển thị Edit và Delete
        return (
          <Space size="small">
            <Tooltip title="Chỉnh sửa">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                disabled={isCompleted}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa task assignment này?"
              description="Bạn có chắc chắn muốn xóa task assignment này không?"
              onConfirm={() => handleDelete(record.assignmentId)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Tooltip title="Xóa">
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isCompleted}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={3}>Quản lý Task Assignment</Title>
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
        <Col xs={24} lg={8}>
          <Card title="Contracts">
            <Input.Search
              placeholder="Tìm contract..."
              allowClear
              value={contractSearch}
              onChange={e => {
                setContractSearch(e.target.value);
                // Reset limit khi search thay đổi
                setContractsDisplayLimit(50);
              }}
              onSearch={value => {
                setContractSearch(value);
                setContractsDisplayLimit(50);
              }}
            />
            <div className={styles.contractList}>
              {contractsLoading ? (
                <div className={styles.contractListLoading}>
                  <Spin />
                </div>
              ) : displayedContracts.length > 0 ? (
                <>
                  <List
                    rowKey="contractId"
                    dataSource={displayedContracts}
                    renderItem={item => {
                    const isActive = item.contractId === selectedContractId;
                    const badge = getContractBadge(item.contractId);
                    return (
                      <List.Item
                        className={`${styles.contractItem} ${
                          isActive ? styles.contractItemActive : ''
                        }`}
                        onClick={() => setSelectedContractId(item.contractId)}
                      >
                        <div>
                          <Text strong>{item.contractNumber}</Text>
                          <span className={styles.contractMeta}>
                            {item.nameSnapshot || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <Tag>{item.contractType}</Tag>
                          {badge && (
                            <Tag
                              color={badge.color}
                              className={styles.contractBadge}
                            >
                              {badge.label}
                            </Tag>
                          )}
                          <Tag color="green" className={styles.contractStatus}>
                            {item.status}
                          </Tag>
                        </div>
                      </List.Item>
                    );
                  }}
                />
                  {hasMoreContracts && (
                    <div style={{ textAlign: 'center', padding: '12px' }}>
                      <Button
                        type="link"
                        onClick={() => setContractsDisplayLimit(prev => prev + 50)}
                      >
                        Xem thêm ({filteredContracts.length - contractsDisplayLimit} contracts)
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Empty
                  description="Không có contract nào"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card>
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
                  <div>
                    <Text strong>Status: </Text>
                    <Tag color="green">{selectedContract.status}</Tag>
                  </div>
                  {(!selectedContract.milestones ||
                    selectedContract.milestones.length === 0) && (
                    <Alert
                      type="warning"
                      message="Contract chưa có milestone. Không thể gán task."
                    />
                  )}
                  <div className={styles.contractSummary}>
                    <Text strong>Tasks:</Text>
                    <Text>
                      {selectedContractSummary.total} tổng · Chưa bắt đầu:{' '}
                      {selectedContractSummary.assigned} · Đang làm:{' '}
                      {selectedContractSummary.inProgress} · Hoàn thành:{' '}
                      {selectedContractSummary.completed}
                      {selectedContractSummary.hasIssue > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          <Text type="warning">
                            Có issue: {selectedContractSummary.hasIssue}
                          </Text>
                        </>
                      )}
                      {selectedContractSummary.cancelled > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          <Text type="danger">
                            Đã hủy: {selectedContractSummary.cancelled}
                          </Text>
                        </>
                      )}
                    </Text>
                  </div>

                  <Card
                    size="small"
                    title="Milestones"
                    className={styles.milestoneCard}
                  >
                    {selectedContract.milestones &&
                    selectedContract.milestones.length > 0 ? (
                      <List
                        dataSource={selectedContract.milestones}
                        rowKey="milestoneId"
                        renderItem={item => {
                          const stats = milestoneTaskStats[
                            item.milestoneId
                          ] || {
                            total: 0,
                            completed: 0,
                            inProgress: 0,
                            assigned: 0,
                            cancelled: 0,
                            hasIssue: 0,
                          };
                          const workStatus = item.workStatus || 'PLANNED';
                          const getWorkStatusColor = () => {
                            switch (workStatus) {
                              case 'PLANNED':
                                return 'default';
                              case 'IN_PROGRESS':
                                return 'processing';
                              case 'READY_FOR_PAYMENT':
                                return 'warning';
                              case 'COMPLETED':
                                return 'success';
                              default:
                                return 'default';
                            }
                          };

                          return (
                            <List.Item className={styles.milestoneItem}>
                              <div className={styles.milestoneInfo}>
                                <div className={styles.milestoneHeader}>
                                  <Text strong>
                                    {item.orderIndex && `Milestone ${item.orderIndex}: `}
                                    {item.name}
                                  </Text>
                                  <Tag color={getWorkStatusColor()}>
                                    {MILESTONE_WORK_STATUS_LABELS[workStatus] || workStatus}
                                  </Tag>
                                </div>
                                <div className={styles.milestoneMeta}>
                                  {item.plannedStartAt && (
                                    <span>
                                      <Text type="secondary">Start: </Text>
                                      {dayjs(item.plannedStartAt).format('YYYY-MM-DD')}
                                    </span>
                                  )}
                                  {item.plannedDueDate && (
                                    <span>
                                      <Text type="secondary">Due: </Text>
                                      {dayjs(item.plannedDueDate).format('YYYY-MM-DD')}
                                    </span>
                                  )}
                                  {item.milestoneSlaDays && (
                                    <span>
                                      <Text type="secondary">SLA: </Text>
                                      {item.milestoneSlaDays} ngày
                                    </span>
                                  )}
                                </div>
                              </div>
                              {stats.total > 0 && (
                                <div className={styles.milestoneStats}>
                                  <div>
                                    <Text strong>{stats.total}</Text>
                                    <Text type="secondary">Task tổng</Text>
                                  </div>
                                  <div>
                                    <Text strong>{stats.inProgress}</Text>
                                    <Text type="secondary">Đang làm</Text>
                                  </div>
                                  <div>
                                    <Text strong>{stats.completed}</Text>
                                    <Text type="secondary">Hoàn thành</Text>
                                  </div>
                                  <div>
                                    <Text strong>{stats.assigned}</Text>
                                    <Text type="secondary">Chưa bắt đầu</Text>
                                  </div>
                                  {stats.hasIssue > 0 && (
                                    <div>
                                      <Text strong type="warning">
                                        {stats.hasIssue}
                                      </Text>
                                      <Text type="secondary">Có issue</Text>
                                    </div>
                                  )}
                                  {stats.cancelled > 0 && (
                                    <div>
                                      <Text strong type="danger">
                                        {stats.cancelled}
                                      </Text>
                                      <Text type="secondary">Đã hủy</Text>
                                    </div>
                                  )}
                                </div>
                              )}
                            </List.Item>
                          );
                        }}
                      />
                    ) : (
                      <Empty
                        description="Chưa tạo milestone"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Card>
                </div>

                <div className={styles.taskHeader}>
                  <Title level={4} style={{ margin: 0 }}>
                    Task Assignments
                  </Title>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={handleAssignTask}
                    disabled={
                      !selectedContract?.milestones ||
                      selectedContract.milestones.length === 0
                    }
                  >
                    Gán Task Mới
                  </Button>
                </div>

                {selectedContractSummary.total === 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Contract này chưa được gán task nào."
                    description="Để bắt đầu milestone tiếp theo, hãy bấm “Gán Task Mới”."
                  />
                ) : selectedContractSummary.assigned > 0 ? (
                  <Alert
                    type="info"
                    showIcon
                    message={`Còn ${selectedContractSummary.assigned} task chưa bắt đầu.`}
                    description="Lọc trạng thái 'Assigned' để xem chi tiết và gán specialist phù hợp."
                  />
                ) : null}

                <Spin spinning={assignmentsLoading}>
                  <Table
                    columns={columns}
                    dataSource={sortedTaskAssignments}
                    rowKey="assignmentId"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1400 }}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Chưa có task assignment nào"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                  />
                </Spin>
              </Space>
            ) : (
              <Empty
                description="Vui lòng chọn contract để xem task assignments"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal hiển thị chi tiết task đã hủy */}
      <Modal
        title="Chi tiết Task đã hủy"
        open={cancelledTaskModalVisible}
        onCancel={handleCloseCancelledTaskModal}
        footer={[
          <Button key="close" onClick={handleCloseCancelledTaskModal}>
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedCancelledTask && (
          <div style={{ marginTop: 16 }}>
            <p>
              <strong>Assignment ID:</strong>{' '}
              {selectedCancelledTask.assignmentId}
            </p>
            <p>
              <strong>Task Type:</strong>{' '}
              {TASK_TYPE_LABELS[selectedCancelledTask.taskType] ||
                selectedCancelledTask.taskType}
            </p>
            <p>
              <strong>Milestone ID:</strong> {selectedCancelledTask.milestoneId}
            </p>
            <p>
              <strong>Status:</strong> <Tag color="red">Đã hủy</Tag>
            </p>
            <p>
              <strong>Assigned Date:</strong>{' '}
              {selectedCancelledTask.assignedDate
                ? dayjs(selectedCancelledTask.assignedDate).format(
                    'YYYY-MM-DD HH:mm'
                  )
                : 'N/A'}
            </p>
            {selectedCancelledTask.specialistRespondedAt && (
              <p>
                <strong>Thời gian hủy:</strong>{' '}
                {dayjs(selectedCancelledTask.specialistRespondedAt).format(
                  'YYYY-MM-DD HH:mm'
                )}
              </p>
            )}
            {selectedCancelledTask.specialistResponseReason && (
              <div style={{ marginTop: 12 }}>
                <p>
                  <strong>Lý do hủy:</strong>
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
                  {selectedCancelledTask.specialistResponseReason}
                </p>
              </div>
            )}
            {selectedCancelledTask.notes && (
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
                  {selectedCancelledTask.notes}
                </p>
              </div>
            )}
          </div>
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
