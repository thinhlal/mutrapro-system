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
import FileList from '../../../components/common/FileList/FileList';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMyTaskAssignmentById,
  acceptTaskAssignment,
  reportIssue,
} from '../../../services/taskAssignmentService';
import styles from './TranscriptionTaskDetailPage.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ---------------- Mock Data & Fake APIs ----------------
// Uploaded notation files by taskId
// status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
const mockFilesByTaskId = {
  1: [
    {
      id: 'file-1',
      version: 1,
      fileName: 'Chopin_Nocturne_RH_v1.musicxml',
      uploadedAt: '2025-11-15T10:30:00Z',
      status: 'PENDING_REVIEW',
      note: 'First draft',
    },
  ],
  2: [
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
    specialNotes:
      'Focus only on right-hand melody. No dynamics needed for now.',
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
    specialNotes:
      'Customer wants detailed drum notation including ghost notes.',
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
      const task = mockTasks.find(t => t.id === taskId);
      if (!task) {
        reject(new Error('Task not found'));
      } else {
        resolve(task);
      }
    }, 500);
  });
}

function fetchTaskFiles(taskId) {
  return new Promise(resolve => {
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

function getActualDeadline(milestone) {
  if (!milestone) return null;
  if (milestone.actualStartAt && milestone.milestoneSlaDays) {
    const start = new Date(milestone.actualStartAt);
    if (!Number.isFinite(start.getTime())) return null;
    const due = new Date(start);
    due.setDate(due.getDate() + Number(milestone.milestoneSlaDays || 0));
    return due;
  }
  if (milestone.actualEndAt) {
    const end = new Date(milestone.actualEndAt);
    return Number.isFinite(end.getTime()) ? end : null;
  }
  return null;
}

function getPlannedDeadline(milestone) {
  if (!milestone?.plannedDueDate) return null;
  const due = new Date(milestone.plannedDueDate);
  return Number.isFinite(due.getTime()) ? due : null;
}

// ---------------- Component ----------------
const TranscriptionTaskDetailPage = () => {
  const navigate = useNavigate();
  const { taskId } = useParams(); // taskId thực chất là assignmentId

  const [task, setTask] = useState(null);
  const [request, setRequest] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [acceptingTask, setAcceptingTask] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gọi API để lấy task assignment detail (đã bao gồm request info)
      // Chỉ cần 1 lần gọi API thay vì 3 lần
      const response = await getMyTaskAssignmentById(taskId);
      if (response?.status === 'success' && response?.data) {
        const taskData = response.data;
        setTask(taskData);

        // Extract request từ response (nếu có)
        if (taskData.request) {
          setRequest(taskData.request);
        }

        // Files sẽ được load sau khi có request info
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
    if (
      !task ||
      task.status?.toLowerCase() !== 'in_progress' ||
      files.length === 0
    )
      return;
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
    if (
      !task ||
      task.status?.toLowerCase() !== 'revision_requested' ||
      files.length === 0
    )
      return;
    message.info('Chức năng submit revision sẽ được implement sau');
  }, [task, files.length]);

  const handleOpenIssueModal = useCallback(() => {
    issueForm.resetFields();
    setIssueModalVisible(true);
  }, [issueForm]);

  const handleIssueModalCancel = useCallback(() => {
    setIssueModalVisible(false);
    issueForm.resetFields();
  }, [issueForm]);

  const handleReportIssue = useCallback(async () => {
    if (!task) return;
    try {
      const { reason } = await issueForm.validateFields();
      setReportingIssue(true);
      const response = await reportIssue(task.assignmentId, reason);
      if (response?.status === 'success') {
        message.success('Đã báo issue cho Manager. Manager sẽ được thông báo.');
        setIssueModalVisible(false);
        issueForm.resetFields();
        await loadData();
      }
    } catch (error) {
      if (error?.errorFields) return;
      console.error('Error reporting issue:', error);
      message.error(error?.message || 'Lỗi khi báo issue');
    } finally {
      setReportingIssue(false);
    }
  }, [task, issueForm, loadData]);

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
        files.length > 0 ? Math.max(...files.map(f => f.version)) : 0;
      const version = currentMaxVersion + 1;
      const newFile = {
        id: 'file-' + Date.now(),
        version,
        fileName: values.fileName,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING_REVIEW',
        note: values.note || '',
      };
      setFiles(prev => [...prev, newFile]);
      // Auto mark in progress if starting from ASSIGNED
      setTask(prev => {
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
    return Math.max(...files.map(f => f.version));
  }, [files]);

  const fileColumns = useMemo(
    () => [
      {
        title: 'Version',
        dataIndex: 'version',
        key: 'version',
        width: 90,
        render: v => `v${v}`,
      },
      {
        title: 'File name',
        dataIndex: 'fileName',
        key: 'fileName',
        render: text =>
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
        render: iso => formatDateTime(iso),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: s => getFileStatusTag(s),
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
            <Descriptions column={1} title="Task Assignment Details" bordered>
              <Descriptions.Item label="Assignment ID">
                <Text copyable>{task.assignmentId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Task Type">
                <Tag color="cyan">{getTaskTypeLabel(task.taskType)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Milestone">
                {task.milestone ? (
                  <div>
                    <Text strong>{task.milestone.name}</Text>
                    {task.milestone.description && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {task.milestone.description}
                        </Text>
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <Text
                        copyable
                        type="secondary"
                        style={{ fontSize: '12px' }}
                      >
                        ID: {task.milestone.milestoneId}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <Text copyable type="secondary">
                    {task.milestoneId}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {getStatusTag(task.status)}
                {task.hasIssue && (
                  <Tag
                    color="orange"
                    icon={<ExclamationCircleOutlined />}
                    style={{ marginLeft: 8 }}
                  >
                    Có issue
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Date">
                {task.assignedDate ? formatDateTime(task.assignedDate) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Completed Date">
                {task.completedDate ? formatDateTime(task.completedDate) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Deadline">
                {task.milestone ? (
                  <Space direction="vertical" size={2}>
                    <div>
                      <Text strong>Actual</Text>
                      <div>
                        {getActualDeadline(task.milestone)
                          ? formatDateTime(getActualDeadline(task.milestone))
                          : 'Chưa có'}
                      </div>
                    </div>
                    <div>
                      <Text strong type="secondary">
                        Planned
                      </Text>
                      <Text type="secondary">
                        {getPlannedDeadline(task.milestone)
                          ? formatDateTime(getPlannedDeadline(task.milestone))
                          : 'Chưa có'}
                      </Text>
                    </div>
                  </Space>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Used Revisions">
                <Text strong>{task.usedRevisions || 0}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {task.notes ? (
                  <Text>{task.notes}</Text>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
              {task.specialistResponseReason && (
                <Descriptions.Item label="Cancel Reason">
                  <Text type="danger">{task.specialistResponseReason}</Text>
                  {task.specialistRespondedAt && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        (Canceled at:{' '}
                        {formatDateTime(task.specialistRespondedAt)})
                      </Text>
                    </div>
                  )}
                </Descriptions.Item>
              )}
              {task.hasIssue && task.issueReason && (
                <Descriptions.Item label="Issue Report" span={2}>
                  <Alert
                    message="Đã báo issue / không kịp deadline"
                    description={
                      <div>
                        <Text strong>Lý do: </Text>
                        <Text>{task.issueReason}</Text>
                        {task.issueReportedAt && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Báo lúc: {formatDateTime(task.issueReportedAt)}
                            </Text>
                          </div>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Manager đã được thông báo. Vui lòng chờ quyết định
                            từ Manager.
                          </Text>
                        </div>
                      </div>
                    }
                    type="warning"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>
          <Col xs={24} lg={10}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Request Information */}
              {request && (
                <Card title="Request Information" size="small" bordered>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Request ID">
                      <Text copyable type="secondary">
                        {request.requestId}
                      </Text>
                    </Descriptions.Item>
                    {request.serviceType && (
                      <Descriptions.Item label="Service Type">
                        <Tag>{request.serviceType}</Tag>
                      </Descriptions.Item>
                    )}
                    {request.title && (
                      <Descriptions.Item label="Title">
                        <Text>{request.title}</Text>
                      </Descriptions.Item>
                    )}
                    {request.description && (
                      <Descriptions.Item label="Description" span={2}>
                        <Text>{request.description}</Text>
                      </Descriptions.Item>
                    )}
                    {request.durationSeconds && (
                      <Descriptions.Item label="Duration">
                        <Text>{formatDuration(request.durationSeconds)}</Text>
                      </Descriptions.Item>
                    )}
                    {request.tempo && (
                      <Descriptions.Item label="Tempo">
                        <Text>{request.tempo} BPM</Text>
                      </Descriptions.Item>
                    )}
                    {request.timeSignature && (
                      <Descriptions.Item label="Time Signature">
                        <Text>{request.timeSignature}</Text>
                      </Descriptions.Item>
                    )}
                    {request.instruments && request.instruments.length > 0 && (
                      <Descriptions.Item label="Instruments" span={2}>
                        <Space wrap>
                          {request.instruments.map((inst, idx) => (
                            <Tag key={idx}>
                              {inst.instrumentName || inst.name || inst}
                            </Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {request.specialNotes && (
                      <Descriptions.Item label="Special Notes" span={2}>
                        <Text>{request.specialNotes}</Text>
                      </Descriptions.Item>
                    )}
                    {request.files &&
                      Array.isArray(request.files) &&
                      (() => {
                        // Filter out contract PDF files - specialist không cần thấy contract files
                        const filteredFiles = request.files.filter(file => {
                          const contentType = file.contentType || '';
                          const fileName = (
                            file.fileName ||
                            file.name ||
                            ''
                          ).toLowerCase();
                          // Loại bỏ contract PDF files
                          return !(
                            contentType === 'contract_pdf' ||
                            contentType === 'CONTRACT_PDF' ||
                            (fileName.includes('contract') &&
                              fileName.endsWith('.pdf'))
                          );
                        });
                        return filteredFiles.length > 0 ? (
                          <Descriptions.Item
                            label="Files"
                            span={2}
                            contentStyle={{
                              width: 0,
                              maxWidth: '100%',
                              overflow: 'hidden',
                              padding: '4px 0',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                              }}
                            >
                              <FileList
                                files={filteredFiles}
                                maxNameLength={30}
                              />
                            </div>
                          </Descriptions.Item>
                        ) : null;
                      })()}
                  </Descriptions>
                </Card>
              )}

              {/* Quick Actions */}
              {(() => {
                // Kiểm tra issue report: có thể có issueReason ngay cả khi hasIssue = false (nếu task đã cancelled)
                const hasIssueAlert =
                  task.issueReason && task.issueReason.trim().length > 0;
                const hasAcceptButton =
                  task.status?.toLowerCase() === 'assigned';
                const hasSubmitButton =
                  task.status?.toLowerCase() !== 'cancelled';
                const hasIssueButton =
                  task.status?.toLowerCase() === 'in_progress' &&
                  !task.hasIssue;
                // Hiển thị Quick Actions nếu có issue alert HOẶC có button nào đó
                const hasAnyAction =
                  hasIssueAlert ||
                  hasAcceptButton ||
                  hasSubmitButton ||
                  hasIssueButton;

                if (!hasAnyAction) return null;

                return (
                  <Card size="small" bordered title="Quick Actions">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {/* Hiển thị thông tin issue nếu đã báo (kể cả khi task đã cancelled) */}
                      {hasIssueAlert && (
                        <Alert
                          message={
                            task.status?.toLowerCase() === 'cancelled'
                              ? 'Task đã bị hủy sau khi báo issue'
                              : 'Đã báo issue / không kịp deadline'
                          }
                          description={
                            <div>
                              <Text strong>Lý do: </Text>
                              <Text>{task.issueReason}</Text>
                              {task.issueReportedAt && (
                                <div style={{ marginTop: 8 }}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: '12px' }}
                                  >
                                    Báo lúc:{' '}
                                    {formatDateTime(task.issueReportedAt)}
                                  </Text>
                                </div>
                              )}
                              {task.status?.toLowerCase() === 'cancelled' ? (
                                <div style={{ marginTop: 8 }}>
                                  <Text
                                    type="danger"
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 500,
                                    }}
                                  >
                                    Task này đã bị Manager hủy sau khi bạn báo
                                    issue.
                                  </Text>
                                </div>
                              ) : task.hasIssue ? (
                                <div style={{ marginTop: 8 }}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: '12px' }}
                                  >
                                    Manager đã được thông báo. Vui lòng chờ
                                    quyết định từ Manager.
                                  </Text>
                                </div>
                              ) : null}
                            </div>
                          }
                          type={
                            task.status?.toLowerCase() === 'cancelled'
                              ? 'error'
                              : 'warning'
                          }
                          showIcon
                        />
                      )}

                      {(hasAcceptButton ||
                        hasSubmitButton ||
                        hasIssueButton) && (
                        <Space wrap>
                          {hasAcceptButton && (
                            <Button
                              type="primary"
                              onClick={handleAcceptTask}
                              loading={acceptingTask}
                            >
                              Accept Task
                            </Button>
                          )}
                          {hasSubmitButton && (
                            <Button
                              onClick={handleSubmitForReview}
                              disabled={
                                task.status?.toLowerCase() !== 'in_progress' ||
                                files.length === 0
                              }
                            >
                              Submit for Review
                            </Button>
                          )}
                          {hasIssueButton && (
                            <Button
                              danger
                              icon={<ExclamationCircleOutlined />}
                              onClick={handleOpenIssueModal}
                            >
                              Báo không kịp deadline
                            </Button>
                          )}
                        </Space>
                      )}
                    </Space>
                  </Card>
                );
              })()}
            </Space>
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
        title={
          <div className={styles.filesHeader}>Notation Files & Versions</div>
        }
        extra={
          task.status?.toLowerCase() !== 'cancelled' && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleOpenUploadModal}
            >
              Upload new version
            </Button>
          )
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
            <TextArea
              rows={3}
              placeholder="Optional notes about this version"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal báo issue */}
      <Modal
        title="Báo không kịp deadline / Có vấn đề"
        open={issueModalVisible}
        onOk={handleReportIssue}
        onCancel={handleIssueModalCancel}
        okText="Gửi báo cáo"
        cancelText="Hủy"
        confirmLoading={reportingIssue}
      >
        <Form layout="vertical" form={issueForm}>
          <Form.Item
            label="Lý do báo issue (bắt buộc)"
            name="reason"
            rules={[
              { required: true, message: 'Vui lòng nhập lý do báo issue' },
              { min: 10, message: 'Lý do phải có ít nhất 10 ký tự' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Mô tả lý do bạn không kịp deadline hoặc có vấn đề (ví dụ: công việc phức tạp hơn dự kiến, thiếu tài liệu, v.v.)..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
        <Alert
          message="Lưu ý"
          description="Báo issue sẽ được gửi tới Manager. Task vẫn tiếp tục ở trạng thái 'In Progress'. Manager sẽ xem xét và quyết định cho bạn tiếp tục hoặc cancel task."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default TranscriptionTaskDetailPage;
