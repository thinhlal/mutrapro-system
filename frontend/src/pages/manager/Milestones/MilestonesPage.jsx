import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Input,
  Select,
  Checkbox,
  Row,
  Col,
} from 'antd';
import {
  ReloadOutlined,
  UserAddOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getMilestoneAssignmentSlots } from '../../../services/taskAssignmentService';
import styles from './MilestonesPage.module.css';

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chưa gán', value: 'unassigned' },
  { label: 'Đã gán', value: 'assigned' },
  { label: 'Đã nhận - Chờ', value: 'accepted_waiting' },
  { label: 'Ready to Start', value: 'ready_to_start' },
  { label: 'Đang làm', value: 'in_progress' },
  { label: 'Hoàn thành', value: 'completed' },
];

const TASK_TYPE_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Transcription', value: 'TRANSCRIPTION' },
  { label: 'Arrangement', value: 'ARRANGEMENT' },
  { label: 'Recording', value: 'RECORDING' },
];

const STATUS_COLORS = {
  unassigned: 'orange',
  assigned: 'blue',
  accepted_waiting: 'gold',
  ready_to_start: 'purple',
  in_progress: 'processing',
  completed: 'green',
  cancelled: 'default',
};

const MilestonesPage = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    taskType: 'all',
    onlyUnassigned: false,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [summary, setSummary] = useState({
    total: 0,
    unassigned: 0,
    inProgress: 0,
    completed: 0,
  });
  const navigate = useNavigate();

  const fetchSlots = useCallback(async (currentFilters, currentPagination) => {
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
      if (currentFilters.onlyUnassigned) {
        params.onlyUnassigned = true;
      }
      if (currentFilters.search && currentFilters.search.trim()) {
        params.keyword = currentFilters.search.trim();
      }
      const response = await getMilestoneAssignmentSlots(params);
      if (response?.status === 'success' && response.data) {
        const pageData = response.data;
        // Sort: milestone chưa có task (unassigned) lên trên
        const sortedSlots = (pageData.content || []).sort((a, b) => {
          const aStatus = a.assignmentStatus?.toLowerCase() || 'unassigned';
          const bStatus = b.assignmentStatus?.toLowerCase() || 'unassigned';

          // Ưu tiên unassigned lên đầu
          if (aStatus === 'unassigned' && bStatus !== 'unassigned') return -1;
          if (aStatus !== 'unassigned' && bStatus === 'unassigned') return 1;

          // Nếu cùng trạng thái, sort theo milestone order index
          const aOrder = a.milestoneOrderIndex ?? 999;
          const bOrder = b.milestoneOrderIndex ?? 999;
          return aOrder - bOrder;
        });
        setSlots(sortedSlots);
        const metadata = response.metadata || {};
        setSummary({
          total: pageData.totalElements ?? 0,
          unassigned: metadata.totalUnassigned ?? 0,
          inProgress: metadata.totalInProgress ?? 0,
          completed: metadata.totalCompleted ?? 0,
        });
        setPagination(prev => {
          const next = {
            ...prev,
            page: (pageData.pageNumber ?? 0) + 1,
            pageSize: pageData.pageSize ?? prev.pageSize,
            total: pageData.totalElements ?? 0,
          };
          if (
            prev.page === next.page &&
            prev.pageSize === next.pageSize &&
            prev.total === next.total
          ) {
            return prev;
          }
          return next;
        });
      } else {
        setSlots([]);
        setSummary({
          total: 0,
          unassigned: 0,
          inProgress: 0,
          completed: 0,
        });
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('Error fetching milestone slots:', error);
      message.error(error?.message || 'Không thể tải danh sách milestone');
      setSlots([]);
      setSummary({
        total: 0,
        unassigned: 0,
        inProgress: 0,
        completed: 0,
      });
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots(filters, pagination);
  }, [
    filters.status,
    filters.taskType,
    filters.onlyUnassigned,
    filters.search,
    pagination.page,
    pagination.pageSize,
    fetchSlots,
  ]);

  const handleAssign = slot => {
    navigate(
      `/manager/milestone-assignments/${slot.contractId}/new?milestoneId=${slot.milestoneId}`
    );
  };

  const handleViewDetail = slot => {
    navigate(
      `/manager/milestone-assignments/${slot.contractId}/milestone/${slot.milestoneId}`
    );
  };

  const handleStatusChange = value => {
    setFilters(prev => ({ ...prev, status: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTaskTypeChange = value => {
    setFilters(prev => ({ ...prev, taskType: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleOnlyUnassignedChange = e => {
    setFilters(prev => ({ ...prev, onlyUnassigned: e.target.checked }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = e => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleTableChange = newPagination => {
    setPagination(prev => ({
      ...prev,
      page: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  const columns = [
    {
      title: 'Contract',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.contractNumber}</Text>
          <Text type="secondary">{record.customerName || '-'}</Text>
          <Tag>{record.contractType || 'N/A'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Milestone',
      dataIndex: 'milestoneName',
      key: 'milestoneName',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.milestoneOrderIndex
              ? `Milestone ${record.milestoneOrderIndex}: ${record.milestoneName}`
              : record.milestoneName}
          </Text>
          {record.milestoneDescription && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.milestoneDescription}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Deadline',
      dataIndex: 'plannedDueDate',
      key: 'plannedDueDate',
      width: 160,
      render: (_, record) => {
        const display = record.actualEndAt || record.plannedDueDate;
        return display ? dayjs(display).format('DD/MM/YYYY') : '—';
      },
    },
    {
      title: 'Task Type',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 140,
      render: (type, record) => {
        // Ưu tiên taskType từ assignment; nếu chưa có task thì fallback contractType
        const rawType = type || record.contractType;
        if (!rawType) {
          return <Tag color="default">N/A</Tag>;
        }
        const lower = String(rawType).toLowerCase();
        const label =
          lower === 'transcription'
            ? 'Transcription'
            : lower === 'arrangement'
              ? 'Arrangement'
              : lower === 'arrangement_with_recording'
                ? 'Arrangement + Recording'
                : lower === 'recording'
                  ? 'Recording'
                  : lower === 'bundle'
                    ? 'Bundle (T+A+R)'
                    : rawType;
        return <Tag color="cyan">{label}</Tag>;
      },
    },
    {
      title: 'Task Status',
      dataIndex: 'assignmentStatus',
      key: 'assignmentStatus',
      width: 150,
      render: (status, record) => {
        const normalized = (status || 'unassigned').toLowerCase();
        const label =
          normalized === 'unassigned'
            ? 'Chưa gán'
            : normalized === 'assigned'
              ? 'Đã gán'
              : normalized === 'accepted_waiting'
                ? 'Đã nhận - Chờ'
                : normalized === 'ready_to_start'
                  ? 'Ready to Start'
                  : normalized === 'in_progress'
                    ? 'Đang làm'
                    : normalized === 'completed'
                      ? 'Hoàn thành'
                      : normalized === 'cancelled'
                        ? 'Đã hủy'
                        : normalized;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={STATUS_COLORS[normalized] || 'default'}>{label}</Tag>
            {record.hasIssue && (
              <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                Issue
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Specialist',
      dataIndex: 'specialistId',
      key: 'specialistId',
      width: 200,
      render: (_, record) =>
        record.specialistId ? (
          <Space direction="vertical" size={0}>
            <Text strong>{record.specialistName || record.specialistId}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {record.specialistId}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">Chưa gán</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => {
        const status = record.assignmentStatus?.toLowerCase();
        const hasActiveTask =
          status === 'assigned' ||
          status === 'accepted_waiting' ||
          status === 'ready_to_start' ||
          status === 'in_progress';

        return (
          <Space size="small">
            {!hasActiveTask && (
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => handleAssign(record)}
              >
                Assign Task
              </Button>
            )}
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              title="Xem chi tiết milestone"
            />
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            Quản lý Milestones
          </Title>
          <Text type="secondary">
            Danh sách milestones và tasks. Click "Xem chi tiết" để quản lý tasks
            của milestone.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchSlots(filters, pagination)}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      <Card className={styles.filterCard}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Tìm contract / customer / milestone"
              value={filters.search}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={handleStatusChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              value={filters.taskType}
              options={TASK_TYPE_OPTIONS}
              onChange={handleTaskTypeChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={4}>
            <Checkbox
              checked={filters.onlyUnassigned}
              onChange={handleOnlyUnassignedChange}
            >
              Chỉ hiện chưa gán
            </Checkbox>
          </Col>
        </Row>
      </Card>

      <Card>
        <div className={styles.summaryBar}>
          <Space wrap size="large">
            <Text>
              Tổng milestone: <Text strong>{summary.total}</Text>
            </Text>
            <Text>
              Chưa gán: <Text strong>{summary.unassigned}</Text>
            </Text>
            <Text>
              Đang làm: <Text strong>{summary.inProgress}</Text>
            </Text>
            <Text>
              Hoàn thành: <Text strong>{summary.completed}</Text>
            </Text>
          </Space>
        </div>
        <Table
          rowKey={record => `${record.contractId}-${record.milestoneId}`}
          dataSource={slots}
          columns={columns}
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default MilestonesPage;
