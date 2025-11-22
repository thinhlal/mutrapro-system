import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Button,
  Card,
  Row,
  Col,
  Descriptions,
  Tooltip,
  Tag,
  message,
  Spin,
  Result,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Empty,
  Alert,
} from 'antd';
import {
  LeftOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMyTaskAssignmentById,
  acceptTaskAssignment,
} from '../../../services/taskAssignmentService';
import styles from './TranscriptionTaskDetailPage.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ---------------- Mock Data & Fake APIs ----------------
// Uploaded notation files by taskId
// status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
const mockFilesByTaskId = {
  '1': [
    {
      id: 'file-1',
      version: 1,
      fileName: 'Chopin_Nocturne_RH_v1.musicxml',
      uploadedAt: '2025-11-15T10:30:00Z',
      status: 'PENDING_REVIEW',
      note: 'First draft',
    },
  ],
  '2': [
    {
      id: 'file-2',
      version: 1,
      fileName: 'Jazz_Trio_Live_v1.musicxml',
      uploadedAt: '2025-11-14T09:00:00Z',
      status: 'REJECTED',
      note: 'Customer requested more swing feel',
    },
    {
      id: 'file-3',
      version: 2,
      fileName: 'Jazz_Trio_Live_v2.musicxml',
      uploadedAt: '2025-11-15T15:45:00Z',
      status: 'PENDING_REVIEW',
      note: 'Adjusted rhythm in bar 12–16',
    },
  ],
};

// Task detail model
// status: 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'COMPLETED'
// priority: 'LOW' | 'MEDIUM' | 'HIGH'
const mockTasks = [
  {
    id: '1',
    taskCode: 'TX-2025-0001',
    title: 'Chopin Nocturne Op.9 No.2 - Right Hand Melody',
    serviceType: 'TRANSCRIPTION',
    instruments: ['Piano'],
    durationSeconds: 184,
    audioUrl: 'https://example.com/audio/chopin-nocturne.mp3',
    dueAt: '2025-11-17T23:30:00Z',
    status: 'ASSIGNED',
    revisionCount: 0,
    maxFreeRevisions: 2,
    priority: 'HIGH',
    lastUpdatedAt: '2025-11-15T08:00:00Z',
    customerName: 'Nguyen Minh',
    specialNotes: 'Focus only on right-hand melody. No dynamics needed for now.',
    tempo: 120,
    timeSignature: '4/4',
  },
  {
    id: '2',
    taskCode: 'TX-2025-0002',
    title: 'Jazz Trio Live - Full Transcription',
    serviceType: 'TRANSCRIPTION',
    instruments: ['Piano', 'Double Bass', 'Drums'],
    durationSeconds: 512,
    audioUrl: 'https://example.com/audio/jazz-trio.mp3',
    dueAt: '2025-11-16T23:30:00Z',
    status: 'REVISION_REQUESTED',
    revisionCount: 1,
    maxFreeRevisions: 3,
    priority: 'MEDIUM',
    lastUpdatedAt: '2025-11-15T12:45:00Z',
    customerName: 'Tran Hoang',
    specialNotes: 'Customer wants detailed drum notation including ghost notes.',
    tempo: 140,
    timeSignature: '4/4',
    revisionRequest: {
      revisionNumber: 2,
      requestedBy: 'Customer',
      requestedAt: '2025-11-15T11:00:00Z',
      message:
        'Bars 24–28: please correct bass line; some notes are missing. Also add chord symbols for the piano part.',
    },
  },
];

function fetchTaskDetail(taskId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const task = mockTasks.find((t) => t.id === taskId);
      if (!task) {
        reject(new Error('Task not found'));
      } else {
        resolve(task);
      }
    }, 500);
  });
}

function fetchTaskFiles(taskId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockFilesByTaskId[taskId] || []);
    }, 400);
  });
}

// ---------------- Helpers ----------------
function formatDuration(seconds) {
  const m = Math.floor((seconds || 0) / 60);
  const s = Math.floor((seconds || 0) % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}

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

function getStatusTag(status) {
  if (!status) return <Tag color="default">Unknown</Tag>;
  const map = {
    assigned: { color: 'blue', text: 'Assigned' },
    in_progress: { color: 'geekblue', text: 'In Progress' },
    completed: { color: 'green', text: 'Completed' },
    cancelled: { color: 'default', text: 'Cancelled' },
  };
  const item = map[status.toLowerCase()] || { color: 'default', text: status };
  return <Tag color={item.color}>{item.text}</Tag>;
}

function getFileStatusTag(status) {
  const map = {
    PENDING_REVIEW: { color: 'blue', text: 'Pending Review' },
    APPROVED: { color: 'green', text: 'Approved' },
    REJECTED: { color: 'red', text: 'Rejected' },
  };
  const item = map[status] || { color: 'default', text: status };
  return <Tag color={item.color}>{item.text}</Tag>;
}

function getTaskTypeLabel(taskType) {
  if (!taskType) return 'N/A';
  const labels = {
    transcription: 'Transcription',
    arrangement: 'Arrangement',
    recording: 'Recording',
  };
  return labels[taskType.toLowerCase()] || taskType;
}


// ---------------- Component ----------------
const TranscriptionTaskDetailPage = () => {
  const navigate = useNavigate();
  const { taskId } = useParams(); // taskId thực chất là assignmentId

  const [task, setTask] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [acceptingTask, setAcceptingTask] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi real API để lấy task assignment detail
      const response = await getMyTaskAssignmentById(taskId);
      if (response?.status === 'success' && response?.data) {
        setTask(response.data);
        // Files sẽ được load sau khi có contract/request info
        setFiles([]);
      } else {
        setError('Task not found');
      }
    } catch (err) {
      console.error('Error loading task detail:', err);
      setError(err?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReload = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleSubmitForReview = useCallback(() => {
    if (!task || task.status?.toLowerCase() !== 'in_progress' || files.length === 0) return;
    message.info('Chức năng submit for review sẽ được implement sau');
  }, [task, files.length]);
  
  const handleAcceptTask = useCallback(async () => {
    if (!task || task.status?.toLowerCase() !== 'assigned') return;
    try {
      setAcceptingTask(true);
      const response = await acceptTaskAssignment(task.assignmentId);
      if (response?.status === 'success') {
        message.success('Bạn đã accept task thành công');
        await loadData();
      }
    } catch (error) {
      console.error('Error accepting task:', error);
      message.error(error?.message || 'Lỗi khi accept task');
    } finally {
      setAcceptingTask(false);
    }
  }, [task, loadData]);

  const handleSubmitRevision = useCallback(() => {
    // TODO: Implement submit revision API
    if (!task || task.status?.toLowerCase() !== 'revision_requested' || files.length === 0) return;
    message.info('Chức năng submit revision sẽ được implement sau');
  }, [task, files.length]);

  const handleOpenUploadModal = useCallback(() => {
    setUploadModalVisible(true);
  }, []);

  const handleUploadCancel = useCallback(() => {
    uploadForm.resetFields();
    setUploadModalVisible(false);
  }, [uploadForm]);

  const handleUploadOk = useCallback(async () => {
    try {
      const values = await uploadForm.validateFields();
      const currentMaxVersion =
        files.length > 0 ? Math.max(...files.map((f) => f.version)) : 0;
      const version = currentMaxVersion + 1;
      const newFile = {
        id: 'file-' + Date.now(),
        version,
        fileName: values.fileName,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING_REVIEW',
        note: values.note || '',
      };
      setFiles((prev) => [...prev, newFile]);
      // Auto mark in progress if starting from ASSIGNED
      setTask((prev) => {
        if (!prev) return prev;
        if (prev.status === 'ASSIGNED') {
          return { ...prev, status: 'IN_PROGRESS' };
        }
        return prev;
      });
      message.success('Uploaded new version');
      uploadForm.resetFields();
      setUploadModalVisible(false);
    } catch (e) {
      // validation failed: do nothing
    }
  }, [files, uploadForm]);



  const latestVersion = useMemo(() => {
    if (files.length === 0) return 0;
    return Math.max(...files.map((f) => f.version));
  }, [files]);

  const fileColumns = useMemo(
    () => [
      {
        title: 'Version',
        dataIndex: 'version',
        key: 'version',
        width: 90,
        render: (v) => `v${v}`,
      },
      {
        title: 'File name',
        dataIndex: 'fileName',
        key: 'fileName',
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
        title: 'Uploaded at',
        dataIndex: 'uploadedAt',
        key: 'uploadedAt',
        width: 180,
        render: (iso) => formatDateTime(iso),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (s) => getFileStatusTag(s),
      },
      {
        title: 'Note',
        dataIndex: 'note',
        key: 'note',
        ellipsis: true,
      },
      {
        title: 'Latest',
        key: 'latest',
        width: 100,
        render: (_, record) =>
          record.version === latestVersion ? <Tag>Latest</Tag> : null,
      },
    ],
    [latestVersion]
  );

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className={styles.pageWrapper}>
        <Result
          status="404"
          title="Task not found"
          subTitle={error || 'We could not locate this task.'}
          extra={
            <Button
              type="default"
              icon={<LeftOutlined />}
              onClick={() => navigate('/transcription/my-tasks')}
            >
              Back to My Tasks
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Title level={3} className={styles.headerTitle}>
            Task Detail
          </Title>
          <Text className={styles.headerSubtitle}>
            Work on your transcription assignment
          </Text>
        </div>
        <div className={styles.headerActions}>
          <Button
            type="default"
            icon={<LeftOutlined />}
            onClick={() => navigate('/transcription/my-tasks')}
          >
            Back to My Tasks
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            Reload
          </Button>
        </div>
      </div>

      {/* Overview */}
      <Card className={styles.section}>
        <Row gutter={[16, 16]} className={styles.overviewRow}>
          <Col xs={24} lg={14}>
            <Descriptions column={1} title="Task Assignment Details">
              <Descriptions.Item label="Assignment ID">
                {task.assignmentId}
              </Descriptions.Item>
              <Descriptions.Item label="Task Type">
                <Tag>{getTaskTypeLabel(task.taskType)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Contract ID">
                {task.contractId}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone ID">
                {task.milestoneId}
              </Descriptions.Item>
              <Descriptions.Item label="Notes">
                {task.notes || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Used Revisions">
                {task.usedRevisions || 0}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} lg={10}>
            <Card size="small" bordered>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Status: </Text>
                  {getStatusTag(task.status)}
                </div>
                <div>
                  <Text strong>Assigned Date: </Text>
                  <Text>{formatDateTime(task.assignedDate)}</Text>
                </div>
                {task.completedDate && (
                  <div>
                    <Text strong>Completed Date: </Text>
                    <Text>{formatDateTime(task.completedDate)}</Text>
                  </div>
                )}
                
                <Space>
                  {task.status?.toLowerCase() === 'assigned' && (
                    <Button
                      type="primary"
                      onClick={handleAcceptTask}
                      loading={acceptingTask}
                    >
                      Accept Task
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={
                      task.status?.toLowerCase() !== 'in_progress' || files.length === 0
                    }
                  >
                    Submit for Review
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Audio Preview - TODO: Load from contract/request */}
      {/* <Card className={styles.section} title="Audio Preview">
        {task.audioUrl ? (
          <audio controls src={task.audioUrl} className={styles.audioPlayer} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No audio provided" />
        )}
      </Card> */}

      {/* Files & Versions */}
      <Card
        className={styles.section}
        title={<div className={styles.filesHeader}>Notation Files & Versions</div>}
        extra={
          <Button type="primary" icon={<UploadOutlined />} onClick={handleOpenUploadModal}>
            Upload new version
          </Button>
        }
      >
        {files.length > 0 ? (
          <Table
            rowKey="id"
            dataSource={files.sort((a, b) => a.version - b.version)}
            columns={fileColumns}
            pagination={false}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notation files yet. Upload your first version to start."
          />
        )}
      </Card>

      {/* Notation Editor link */}
      <Card className={styles.section} title="Open in Notation Editor">
        <Space direction="vertical">
          <Text>Use the full transcription editor to work on this task.</Text>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/transcription/editor/${task.id}`)}
          >
            Open Editor
          </Button>
        </Space>
      </Card>

      {/* Upload Modal */}
      <Modal
        open={uploadModalVisible}
        title="Upload new version"
        okText="Upload"
        onOk={handleUploadOk}
        onCancel={handleUploadCancel}
        destroyOnClose
      >
        <Form layout="vertical" form={uploadForm}>
          <Form.Item
            label="File name"
            name="fileName"
            rules={[{ required: true, message: 'Please input file name' }]}
          >
            <Input placeholder="e.g., My_Piece_v3.musicxml" />
          </Form.Item>
          <Form.Item label="Note" name="note">
            <TextArea rows={3} placeholder="Optional notes about this version" />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default TranscriptionTaskDetailPage;


