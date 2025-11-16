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
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './MyTasksPage.module.css';

const { Title, Text } = Typography;
const { Search } = Input;

// -------- Fake API --------
/**
 * Simulate fetching tasks assigned to a Specialist Transcription user.
 * Returns a Promise that resolves with a list of tasks after a short delay.
 */
function fetchTasks() {
  /** @type {Array<{
   *  id: string;
   *  taskCode: string;
   *  title: string;
   *  serviceType: 'TRANSCRIPTION';
   *  instruments: string[];
   *  durationSeconds: number;
   *  dueAt: string;
   *  status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'COMPLETED';
   *  revisionCount: number;
   *  maxFreeRevisions?: number;
   *  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
   *  lastUpdatedAt: string;
   * }>} */
  const mock = [
    {
      id: '1',
      taskCode: 'TX-2025-0001',
      title: 'Chopin Nocturne Op.9 No.2 - Right Hand Melodic Line',
      serviceType: 'TRANSCRIPTION',
      instruments: ['Piano'],
      durationSeconds: 184,
      dueAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      status: 'ASSIGNED',
      revisionCount: 0,
      maxFreeRevisions: 2,
      priority: 'MEDIUM',
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      taskCode: 'TX-2025-0002',
      title: 'Jazz Trio Live - Full Transcription (Piano, Bass, Drums)',
      serviceType: 'TRANSCRIPTION',
      instruments: ['Piano', 'Double Bass', 'Drums'],
      durationSeconds: 512,
      dueAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      revisionCount: 1,
      maxFreeRevisions: 3,
      priority: 'HIGH',
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      taskCode: 'TX-2025-0003',
      title: 'Anime OST Strings Section - Violin I & II',
      serviceType: 'TRANSCRIPTION',
      instruments: ['Violin I', 'Violin II'],
      durationSeconds: 245,
      dueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      status: 'SUBMITTED',
      revisionCount: 0,
      maxFreeRevisions: 2,
      priority: 'LOW',
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      taskCode: 'TX-2025-0004',
      title: 'Rock Guitar Solo - Pitch-Perfect Lead',
      serviceType: 'TRANSCRIPTION',
      instruments: ['Electric Guitar'],
      durationSeconds: 198,
      dueAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      status: 'REVISION_REQUESTED',
      revisionCount: 1,
      maxFreeRevisions: 2,
      priority: 'MEDIUM',
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      taskCode: 'TX-2025-0005',
      title: 'Classical Quartet - Cello Voice Isolation (Completed)',
      serviceType: 'TRANSCRIPTION',
      instruments: ['Cello'],
      durationSeconds: 305,
      dueAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      status: 'COMPLETED',
      revisionCount: 2,
      maxFreeRevisions: 2,
      priority: 'LOW',
      lastUpdatedAt: new Date().toISOString(),
    },
  ];

  return new Promise((resolve) => {
    setTimeout(() => resolve(mock), 650);
  });
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

/**
 * Map task status to antd Tag color and display text.
 */
function getStatusTag(status) {
  const map = {
    ASSIGNED: { color: 'blue', text: 'Assigned' },
    IN_PROGRESS: { color: 'geekblue', text: 'In Progress' },
    SUBMITTED: { color: 'gold', text: 'Submitted' },
    REVISION_REQUESTED: { color: 'red', text: 'Revision Requested' },
    COMPLETED: { color: 'green', text: 'Completed' },
  };
  const item = map[status] || { color: 'default', text: status };
  return <Tag color={item.color}>{item.text}</Tag>;
}

/**
 * Fixed service label for transcription tasks.
 */
function renderServiceLabel(serviceType) {
  if (serviceType === 'TRANSCRIPTION') {
    return 'Transcription (Sound → Sheet)';
  }
  return serviceType;
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

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchText, statusFilter, onlyActive]);

  // Filter logic: search by taskCode/title, filter by status, and only active
  const applyFilters = () => {
    let next = [...tasks];
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      next = next.filter(
        (t) =>
          t.taskCode.toLowerCase().includes(q) ||
          (t.title || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      next = next.filter((t) => t.status === statusFilter);
    }
    if (onlyActive) {
      next = next.filter((t) => t.status !== 'COMPLETED');
    }
    setFilteredTasks(next);
  };

  const handleOpenTask = useCallback(
    (task) => {
      if (typeof onOpenTask === 'function') {
        onOpenTask(task.id);
      } else {
        navigate(`/transcription/my-tasks/${task.id}`);
      }
    },
    [navigate, onOpenTask]
  );

  const columns = useMemo(
    () => [
      {
        title: 'Task ID',
        dataIndex: 'taskCode',
        key: 'taskCode',
        width: 160,
        ellipsis: true,
      },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        render: (text) =>
          text && text.length > 40 ? (
            <Tooltip title={text}>
              <span>{text.slice(0, 40)}...</span>
            </Tooltip>
          ) : (
            <span>{text}</span>
          ),
      },
      {
        title: 'Service',
        dataIndex: 'serviceType',
        key: 'serviceType',
        width: 260,
        render: (value) => renderServiceLabel(value),
      },
      {
        title: 'Instruments',
        dataIndex: 'instruments',
        key: 'instruments',
        width: 260,
        render: (arr) => {
          const joined = Array.isArray(arr) ? arr.join(', ') : '';
          return joined.length > 45 ? (
            <Tooltip title={joined}>
              <span>{joined.slice(0, 45)}...</span>
            </Tooltip>
          ) : (
            <span>{joined}</span>
          );
        },
      },
      {
        title: 'Duration',
        dataIndex: 'durationSeconds',
        key: 'durationSeconds',
        width: 110,
        render: (sec) => formatDuration(sec),
      },
      {
        title: 'Due Date',
        dataIndex: 'dueAt',
        key: 'dueAt',
        width: 170,
        render: (iso) => formatDateTime(iso),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 170,
        render: (status) => getStatusTag(status),
      },
      {
        title: 'Revisions',
        dataIndex: 'revisionCount',
        key: 'revision',
        width: 120,
        render: (count, record) =>
          record.maxFreeRevisions != null
            ? `${count}/${record.maxFreeRevisions}`
            : String(count),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 130,
        render: (_, record) => (
          <Button type="link" size="small" onClick={() => handleOpenTask(record)}>
            View / Work
          </Button>
        ),
      },
    ],
    [handleOpenTask]
  );

  const tableLocale = useMemo(
    () => ({
      emptyText: (
        <Empty description="No tasks found with current filters" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
          <Text type="secondary">View and manage your assigned transcription jobs</Text>
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
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => setSearchText(value)}
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
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Submitted', value: 'SUBMITTED' },
                { label: 'Revision Requested', value: 'REVISION_REQUESTED' },
                { label: 'Completed', value: 'COMPLETED' },
              ]}
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
          rowKey="id"
          dataSource={filteredTasks}
          columns={columns}
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={tableLocale}
        />
      </Card>
    </div>
  );
};

export default MyTasksPage;


