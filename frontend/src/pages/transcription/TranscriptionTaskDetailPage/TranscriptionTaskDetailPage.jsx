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
  Upload,
} from 'antd';
import {
  LeftOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  EditOutlined,
  InboxOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import FileList from '../../../components/common/FileList/FileList';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMyTaskAssignmentById,
  getMyTaskAssignments,
  acceptTaskAssignment,
  reportIssue,
  startTaskAssignment,
} from '../../../services/taskAssignmentService';
import {
  uploadTaskFile,
  getFilesByAssignmentId,
} from '../../../services/fileService';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import styles from './TranscriptionTaskDetailPage.module.css';

const { Title, Text } = Typography;

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
    accepted_waiting: { color: 'gold', text: 'Accepted - Waiting' },
    ready_to_start: { color: 'purple', text: 'Ready to Start' },
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
  if (!milestone?.actualStartAt || !milestone?.milestoneSlaDays) return null;
  const start = new Date(milestone.actualStartAt);
  if (!Number.isFinite(start.getTime())) return null;
  const due = new Date(start);
  due.setDate(due.getDate() + Number(milestone.milestoneSlaDays || 0));
  return due;
}

function getPlannedDeadline(milestone) {
  if (!milestone) return null;
  if (milestone.plannedDueDate) {
    const due = new Date(milestone.plannedDueDate);
    if (Number.isFinite(due.getTime())) {
      return due;
    }
  }
  if (milestone.plannedStartAt && milestone.milestoneSlaDays) {
    const start = new Date(milestone.plannedStartAt);
    if (!Number.isFinite(start.getTime())) return null;
    const due = new Date(start);
    due.setDate(due.getDate() + Number(milestone.milestoneSlaDays || 0));
    return due;
  }
  return null;
}

const fallbackDeadlineCache = new Map();

function getFallbackDeadline(milestone, allTasks = []) {
  if (!milestone) return null;
  const slaDays = milestone.milestoneSlaDays;
  if (slaDays == null || slaDays <= 0) return null;

  const plannedStart = milestone.plannedStartAt
    ? new Date(milestone.plannedStartAt)
    : null;
  if (plannedStart && Number.isFinite(plannedStart.getTime())) {
    const dueDate = new Date(plannedStart);
    dueDate.setDate(dueDate.getDate() + Number(slaDays));
    return dueDate;
  }

  const cacheKey = milestone.milestoneId;
  if (fallbackDeadlineCache.has(cacheKey)) {
    return fallbackDeadlineCache.get(cacheKey);
  }

  const orderIndex = milestone.orderIndex;
  if (!orderIndex || orderIndex === 1) {
    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + Number(slaDays));
    fallbackDeadlineCache.set(cacheKey, due);
    return due;
  }

  const contractId =
    milestone.contractId ||
    allTasks.find(
      t => t.milestone?.milestoneId === milestone.milestoneId
    )?.contractId;
  if (contractId && allTasks.length > 0) {
    const previousTask = allTasks.find(
      t =>
        t.contractId === contractId &&
        t.milestone?.orderIndex === orderIndex - 1,
    );
    if (previousTask?.milestone) {
      const previousMilestone = previousTask.milestone;
      const previousActualDeadline = getActualDeadline(previousMilestone);
      const previousPlannedDeadline = getPlannedDeadline(previousMilestone);
      const previousFallbackDeadline = getFallbackDeadline(
        previousMilestone,
        allTasks,
      );
      const previousDeadline =
        previousActualDeadline ||
        previousPlannedDeadline ||
        previousFallbackDeadline;
      if (previousDeadline) {
        const dueDate = new Date(previousDeadline);
        dueDate.setDate(dueDate.getDate() + Number(slaDays));
        fallbackDeadlineCache.set(cacheKey, dueDate);
        return dueDate;
      }
    }
  }

  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + Number(slaDays));
  fallbackDeadlineCache.set(cacheKey, due);
  return due;
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
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // File đang được chọn trong form
  const [uploadForm] = Form.useForm();
  const [acceptingTask, setAcceptingTask] = useState(false);
  const [startingTask, setStartingTask] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueForm] = Form.useForm();
  const [contractTasks, setContractTasks] = useState([]);

  const loadContractTasks = useCallback(async contractId => {
    if (!contractId) {
      setContractTasks([]);
      return;
    }
    try {
      const resp = await getMyTaskAssignments();
      if (resp?.status === 'success' && Array.isArray(resp.data)) {
        const sameContractTasks = resp.data.filter(
          assignment => assignment.contractId === contractId,
        );
        setContractTasks(sameContractTasks);
      } else {
        setContractTasks([]);
      }
    } catch (error) {
      console.error('Failed to load contract tasks', error);
      setContractTasks([]);
    }
  }, []);

  const { actualDeadline, plannedDeadline, estimatedDeadline } = useMemo(() => {
    if (!task?.milestone) {
      return {
        actualDeadline: null,
        plannedDeadline: null,
        estimatedDeadline: null,
      };
    }
    const actual = getActualDeadline(task.milestone);
    const planned = getPlannedDeadline(task.milestone);
    const estimated =
      !actual && !planned
        ? getFallbackDeadline(task.milestone, contractTasks)
        : null;
    return {
      actualDeadline: actual,
      plannedDeadline: planned,
      estimatedDeadline: estimated,
    };
  }, [task, contractTasks]);

  const loadTaskFiles = useCallback(async () => {
    if (!task?.assignmentId) return;
    
    try {
      const response = await getFilesByAssignmentId(task.assignmentId);
      if (response?.status === 'success' && Array.isArray(response?.data)) {
        // Map API response to UI format
        // Sort by uploadDate để version đúng thứ tự
        const sortedFiles = [...response.data].sort((a, b) => {
          const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
          const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
          return dateA - dateB; // Oldest first
        });
        
        const mappedFiles = sortedFiles.map((file, index) => ({
          fileId: file.fileId, // Use fileId for download
          id: file.fileId, // Keep id for backward compatibility
          version: index + 1, // Version based on upload order
          fileName: file.fileName,
          uploadDate: file.uploadDate, // Keep original field name
          uploadedAt: file.uploadDate, // Also map to uploadedAt for table
          fileStatus: file.fileStatus || 'uploaded', // Keep original field name
          status: file.fileStatus || 'uploaded', // Also map to status for table
          description: file.description || '', // Keep original field name
          note: file.description || '', // Also map to note for table
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        }));
        setFiles(mappedFiles);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      // Don't show error - files might not exist yet
    }
  }, [task?.assignmentId]);

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

        fallbackDeadlineCache.clear();
        const contractId =
          taskData.contractId || taskData?.milestone?.contractId;
        await loadContractTasks(contractId);
      } else {
        setError('Task not found');
      }
    } catch (err) {
      console.error('Error loading task detail:', err);
      setError(err?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId, loadContractTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (task?.assignmentId) {
      loadTaskFiles();
    }
  }, [task?.assignmentId, loadTaskFiles]);

  const handleReload = useCallback(() => {
    loadData();
    if (task?.assignmentId) {
      loadTaskFiles();
    }
  }, [loadData, task?.assignmentId, loadTaskFiles]);

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

  const handleStartTask = useCallback(async () => {
    if (!task || task.status?.toLowerCase() !== 'ready_to_start') return;
    try {
      setStartingTask(true);
      const response = await startTaskAssignment(task.assignmentId);
      if (response?.status === 'success') {
        message.success('Bạn đã bắt đầu task');
        await loadData();
      }
    } catch (error) {
      console.error('Error starting task:', error);
      message.error(error?.message || 'Lỗi khi bắt đầu task');
    } finally {
      setStartingTask(false);
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

  const handleDownloadFile = useCallback(async (file) => {
    // downloadFileHelper đã có error handling và success message built-in
    await downloadFileHelper(file.fileId, file.fileName);
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    setUploadModalVisible(true);
    setSelectedFile(null); // Reset selected file khi mở modal
    uploadForm.resetFields();
  }, [uploadForm]);

  const handleUploadCancel = useCallback(() => {
    if (uploading) return; // Prevent closing while uploading
    uploadForm.resetFields();
    setSelectedFile(null);
    setUploadModalVisible(false);
    setUploading(false);
  }, [uploadForm, uploading]);

  const handleUploadOk = useCallback(async () => {
    if (!task?.assignmentId) {
      message.error('Assignment ID not found');
      return;
    }

    if (uploading) {
      console.log('Already uploading, ignoring');
      return; // Prevent multiple clicks
    }

    try {
      setUploading(true);
      console.log('Starting upload process...');
      
      // Validate form fields
      const values = await uploadForm.validateFields();
      
      // Get file from selectedFile state
      if (!selectedFile) {
        message.error('Please select a file');
        setUploading(false);
        return;
      }
      
      const file = selectedFile;
      
      const response = await uploadTaskFile(
        task.assignmentId,
        file,
        values.note || '',
        'notation' // default content type
      );

      if (response?.status === 'success') {
        message.success('File uploaded successfully');
        uploadForm.resetFields();
        setSelectedFile(null);
        setUploadModalVisible(false);
        
        // Reload task files
        await loadTaskFiles();
      } else {
        message.error(response?.message || 'Failed to upload file');
      }
    } catch (error) {
      if (error?.errorFields) {
        // Validation error - do nothing
        return;
      }
      console.error('Error uploading file:', error);
      message.error(error?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [task, uploadForm, loadTaskFiles]);

  // Calculate version based on upload date (newer = higher version)
  const latestVersion = useMemo(() => {
    if (files.length === 0) return 0;
    // Sort by uploadDate descending and assign version numbers
    const sortedFiles = [...files].sort((a, b) => {
      const dateA = new Date(a.uploadDate || 0);
      const dateB = new Date(b.uploadDate || 0);
      return dateB - dateA;
    });
    return sortedFiles.length; // Latest version = total files count
  }, [files]);

  const fileColumns = useMemo(
    () => [
      {
        title: 'Version',
        key: 'version',
        width: 90,
        render: (_, record, index) => {
          // Calculate version based on upload date order
          const sortedFiles = [...files].sort((a, b) => {
            const dateA = new Date(a.uploadDate || 0);
            const dateB = new Date(b.uploadDate || 0);
            return dateB - dateA;
          });
          const version = sortedFiles.findIndex(f => f.fileId === record.fileId) + 1;
          return `v${version}`;
        },
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
        dataIndex: 'uploadDate',
        key: 'uploadDate',
        width: 180,
        render: iso => formatDateTime(iso),
      },
      {
        title: 'Status',
        dataIndex: 'fileStatus',
        key: 'fileStatus',
        width: 160,
        render: s => getFileStatusTag(s),
      },
      {
        title: 'Note',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (text) =>
          text && text.length > 0 ? (
            text.length > 50 ? (
              <Tooltip title={text}>
                <span>{text.slice(0, 50)}...</span>
              </Tooltip>
            ) : (
              <span>{text}</span>
            )
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: 'Latest',
        key: 'latest',
        width: 100,
        render: (_, record) => {
          // Check if this is the latest file (most recent uploadDate)
          const sortedFiles = [...files].sort((a, b) => {
            const dateA = new Date(a.uploadDate || 0);
            const dateB = new Date(b.uploadDate || 0);
            return dateB - dateA;
          });
          return sortedFiles[0]?.fileId === record.fileId ? <Tag>Latest</Tag> : null;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadFile(record)}
            size="small"
          >
            Download
          </Button>
        ),
      },
    ],
    [latestVersion, handleDownloadFile]
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
                  <Space direction="vertical" size={4}>
                    <div>
                      <Text strong>Actual</Text>
                      <div>
                        {actualDeadline
                          ? formatDateTime(actualDeadline)
                          : 'Chưa có'}
                      </div>
                    </div>
                    <div>
                      <Text strong type="secondary">
                        Planned
                      </Text>
                      <Text type="secondary">
                        {plannedDeadline
                          ? formatDateTime(plannedDeadline)
                          : 'Chưa có'}
                      </Text>
                    </div>
                    {estimatedDeadline && (
                      <div>
                        <Text strong type="warning">
                          Estimated
                        </Text>
                        <Text type="secondary">
                          {formatDateTime(estimatedDeadline)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          (Ước tính khi chưa Start Work)
                        </Text>
                      </div>
                    )}
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
                const status = task.status?.toLowerCase();
                const hasAcceptButton = status === 'assigned';
                const hasStartButton = status === 'ready_to_start';
                const awaitingAlert = status === 'accepted_waiting';
                const hasSubmitButton = status !== 'cancelled';
                const hasIssueButton = status === 'in_progress' && !task.hasIssue;
                // Hiển thị Quick Actions nếu có issue alert HOẶC có button nào đó
                const hasAnyAction =
                  hasIssueAlert ||
                  hasAcceptButton ||
                  hasStartButton ||
                  awaitingAlert ||
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

                      {awaitingAlert && (
                        <Alert
                          message="Đã nhận task - chờ tới lượt"
                          description="Milestone này đang chờ hoàn tất các bước trước đó. Bạn sẽ được thông báo khi có thể bắt đầu."
                          type="info"
                          showIcon
                        />
                      )}

                      {(hasAcceptButton ||
                        hasStartButton ||
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
                          {hasStartButton && (
                            <Button
                              type="primary"
                              onClick={handleStartTask}
                              loading={startingTask}
                            >
                              Start Task
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
            rowKey="fileId"
            dataSource={files.sort((a, b) => {
              const dateA = new Date(a.uploadDate || 0);
              const dateB = new Date(b.uploadDate || 0);
              return dateB - dateA; // Sort by newest first
            })}
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
        title="Upload Task Output"
        okText="Upload"
        onOk={() => {
          handleUploadOk();
        }}
        onCancel={handleUploadCancel}
        confirmLoading={uploading}
        destroyOnHidden
      >
        <Form layout="vertical" form={uploadForm}>
          <Form.Item
            name="file"
            rules={[
              { required: true, message: 'Please select a file' },
              {
                validator: () => {
                  // Validate file từ selectedFile state
                  if (!selectedFile) {
                    return Promise.reject(new Error('Please select a file'));
                  }
                  
                  const fileName = selectedFile.name?.toLowerCase() || '';
                  const taskType = task?.taskType?.toLowerCase();
                  
                  // Define allowed extensions for each task type
                  const notationExts = ['.musicxml', '.xml', '.mid', '.midi', '.pdf'];
                  const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
                  
                  let allowedExts = [];
                  let allowedTypes = '';
                  
                  if (taskType === 'transcription') {
                    allowedExts = notationExts;
                    allowedTypes = 'notation files (MusicXML, XML, MIDI, PDF)';
                  } else if (taskType === 'arrangement') {
                    allowedExts = [...notationExts, ...audioExts];
                    allowedTypes = 'notation or audio files';
                  } else if (taskType === 'recording') {
                    allowedExts = audioExts;
                    allowedTypes = 'audio files (MP3, WAV, FLAC, etc.)';
                  } else {
                    return Promise.resolve(); // Unknown task type, let backend validate
                  }
                  
                  const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));
                  
                  if (!hasValidExt) {
                    return Promise.reject(
                      new Error(
                        `File type not allowed for ${taskType} task. Only ${allowedTypes} are allowed.`
                      )
                    );
                  }
                  
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Upload.Dragger
              maxCount={1}
              beforeUpload={() => false} // Prevent auto upload
              accept={
                task?.taskType?.toLowerCase() === 'transcription'
                  ? '.musicxml,.xml,.mid,.midi,.pdf'
                  : task?.taskType?.toLowerCase() === 'recording'
                  ? '.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma'
                  : '.musicxml,.xml,.mid,.midi,.pdf,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma'
              }
              onChange={info => {
                // Khi user chọn file, lưu vào state để hiển thị
                const file = info.fileList.length > 0 
                  ? (info.fileList[0].originFileObj || info.fileList[0])
                  : null;
                setSelectedFile(file);
              }}
              onRemove={() => {
                setSelectedFile(null);
                return true;
              }}
            >
              {!selectedFile ? (
                <>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag file to upload
                  </p>
                  <p className="ant-upload-hint">
                    {task?.taskType?.toLowerCase() === 'transcription'
                      ? 'Only notation files allowed: MusicXML, XML, MIDI, PDF'
                      : task?.taskType?.toLowerCase() === 'recording'
                      ? 'Only audio files allowed: MP3, WAV, FLAC, etc.'
                      : 'Support: Notation (MusicXML, MIDI, PDF) or Audio files'}
                  </p>
                </>
              ) : (
                <div style={{ padding: '20px 0' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
                    <Text strong style={{ fontSize: '16px' }}>
                      {selectedFile.name}
                    </Text>
                    <Text type="secondary">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Click to change file
                    </Text>
                  </Space>
                </div>
              )}
            </Upload.Dragger>
          </Form.Item>
          <Form.Item label="Note (optional)" name="note">
            <Input.TextArea
              rows={3}
              placeholder="Optional notes about this upload"
              maxLength={500}
              showCount
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
