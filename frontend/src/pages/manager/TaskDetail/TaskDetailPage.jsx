import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Descriptions,
  Empty,
  List,
  Modal,
  Input,
  Popconfirm,
  Divider,
  Alert,
  Progress,
  Timeline,
  Collapse,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  FileOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getTaskAssignmentById,
  resolveIssue,
  cancelTaskByManager,
} from '../../../services/taskAssignmentService';
import {
  approveFile,
  rejectFile,
  fetchFileForPreview,
} from '../../../services/fileService';
import {
  getSubmissionsByAssignmentId,
  reviewSubmission,
  deliverSubmission,
} from '../../../services/fileSubmissionService';
import {
  getRevisionRequestsByAssignment,
  reviewRevisionRequest,
} from '../../../services/revisionRequestService';
import { getContractById } from '../../../services/contractService';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import FileList from '../../../components/common/FileList/FileList';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './TaskDetailPage.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording: 'Recording',
};

const STATUS_COLORS = {
  assigned: 'blue',
  accepted_waiting: 'gold',
  ready_to_start: 'purple',
  in_progress: 'processing',
  ready_for_review: 'orange',
  revision_requested: 'warning',
  in_revision: 'processing',
  delivery_pending: 'cyan',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABELS = {
  assigned: 'Đã gán',
  accepted_waiting: 'Đã nhận - Chờ',
  ready_to_start: 'Sẵn sàng làm',
  in_progress: 'Đang thực hiện',
  ready_for_review: 'Chờ duyệt',
  revision_requested: 'Yêu cầu chỉnh sửa',
  in_revision: 'Đang chỉnh sửa',
  delivery_pending: 'Chờ giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const FILE_STATUS_LABELS = {
  uploaded: 'Đã upload',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  delivered: 'Đã giao',
};

const FILE_STATUS_COLORS = {
  uploaded: 'default',
  pending_review: 'processing',
  approved: 'success',
  rejected: 'error',
  delivered: 'green',
};

const SUBMISSION_STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  delivered: 'Đã gửi',
};

const SUBMISSION_STATUS_COLORS = {
  draft: 'default',
  pending_review: 'processing',
  approved: 'success',
  rejected: 'error',
  delivered: 'green',
};

const TaskDetailPage = () => {
  const { contractId, assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [contract, setContract] = useState(null);
  const [request, setRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [selectedFileForRevision, setSelectedFileForRevision] = useState(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rejectionReasonModalVisible, setRejectionReasonModalVisible] =
    useState(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState(null);
  const [selectedSubmissionForReject, setSelectedSubmissionForReject] =
    useState(null);
  const [submissionRejectReason, setSubmissionRejectReason] = useState('');
  const [expandedSubmissions, setExpandedSubmissions] = useState(new Set()); // Track which submissions are expanded
  const [showAllFiles, setShowAllFiles] = useState({}); // Track which submissions show all files
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [loadingRevisionRequests, setLoadingRevisionRequests] = useState(false);
  const [reviewRevisionModalVisible, setReviewRevisionModalVisible] = useState(false);
  const [selectedRevisionRequest, setSelectedRevisionRequest] = useState(null);
  const [reviewRevisionAction, setReviewRevisionAction] = useState(''); // 'approve' or 'reject'
  const [reviewRevisionNote, setReviewRevisionNote] = useState('');

  useEffect(() => {
    if (contractId && assignmentId) {
      loadData();
    }
  }, [contractId, assignmentId]);

  useEffect(() => {
    // Load assignment files khi task đã được load
    // Request files đã có trong request.files (từ API getServiceRequestById)
    if (task && assignmentId) {
      loadFiles();
      loadRevisionRequests();
    }
  }, [task, assignmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load task và contract trước
      await Promise.all([loadTask(), loadContract()]);
      // Sau khi task đã load, mới load request và files
      // (sẽ được trigger bởi useEffect khi task thay đổi)
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Lỗi khi tải dữ liệu task');
    } finally {
      setLoading(false);
    }
  };

  const loadTask = async () => {
    try {
      const response = await getTaskAssignmentById(contractId, assignmentId);
      if (response?.status === 'success' && response?.data) {
        setTask(response.data);
      }
    } catch (error) {
      console.error('Error loading task:', error);
      message.error('Lỗi khi tải thông tin task');
    }
  };

  const loadContract = async () => {
    try {
      const response = await getContractById(contractId);
      if (response?.status === 'success' && response?.data) {
        setContract(response.data);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
    }
  };

  const loadRequestById = async requestId => {
    if (!requestId) return;
    // Nếu đã có request cùng ID rồi thì khỏi gọi lại
    if (request?.requestId === requestId) {
      return;
    }
    try {
      setRequestLoading(true);
      console.log('Loading request with ID:', requestId);
      const response = await getServiceRequestById(requestId);
      if (response?.status === 'success' && response?.data) {
        let requestData = response.data;

        setRequest(requestData);
      } else {
        console.warn('Request response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading request:', error);
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    // Chỉ gọi khi THỰC SỰ có requestId
    const requestId = task?.request?.requestId || contract?.requestId;

    if (!requestId) return;

    loadRequestById(requestId);
  }, [task?.request?.requestId, contract?.requestId]);

  const loadFiles = async () => {
    try {
      setFilesLoading(true);

      // Load submissions từ assignmentId
      try {
        const submissionsResponse =
          await getSubmissionsByAssignmentId(assignmentId);
        if (
          submissionsResponse?.status === 'success' &&
          Array.isArray(submissionsResponse?.data)
        ) {
          // Sort submissions theo version (mới nhất trước) - version lớn nhất = mới nhất
          const sortedSubmissions = [...submissionsResponse.data].sort(
            (a, b) => {
              const versionA = a.version || 0;
              const versionB = b.version || 0;
              return versionB - versionA; // Mới nhất trước
            }
          );
          setSubmissions(sortedSubmissions);
        } else {
          setSubmissions([]);
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
        message.error('Lỗi khi tải danh sách submissions');
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Lỗi khi tải danh sách files');
      setSubmissions([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const loadRevisionRequests = async () => {
    if (!assignmentId) return;
    try {
      setLoadingRevisionRequests(true);
      const response = await getRevisionRequestsByAssignment(assignmentId);
      if (response?.status === 'success' && Array.isArray(response?.data)) {
        setRevisionRequests(response.data);
      } else {
        setRevisionRequests([]);
      }
    } catch (error) {
      console.error('Error loading revision requests:', error);
      setRevisionRequests([]);
    } finally {
      setLoadingRevisionRequests(false);
    }
  };

  const handleApproveFile = async fileId => {
    try {
      setActionLoading(true);
      const response = await approveFile(fileId);
      if (response?.status === 'success') {
        message.success('Đã duyệt file thành công');
        await loadFiles();
      }
    } catch (error) {
      console.error('Error approving file:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi duyệt file');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedFileForRevision || !revisionReason.trim()) {
      message.warning('Vui lòng nhập lý do yêu cầu chỉnh sửa');
      return;
    }
    try {
      setActionLoading(true);
      const response = await rejectFile(
        selectedFileForRevision.fileId,
        revisionReason
      );
      if (response?.status === 'success') {
        message.success('Đã yêu cầu chỉnh sửa file');
        setRevisionModalVisible(false);
        setSelectedFileForRevision(null);
        setRevisionReason('');
        await loadFiles();
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi yêu cầu chỉnh sửa file'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverSubmission = async submissionId => {
    try {
      setActionLoading(true);
      const response = await deliverSubmission(submissionId);
      if (response?.status === 'success') {
        message.success('Đã gửi submission cho khách hàng');
        await loadFiles();
        await loadTask();
      }
    } catch (error) {
      console.error('Error delivering submission:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi gửi submission cho khách hàng'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveSubmission = async submissionId => {
    try {
      setActionLoading(true);
      const response = await reviewSubmission(submissionId, 'approve');
      if (response?.status === 'success') {
        message.success('Đã duyệt submission thành công');
        // Reload cả task assignment và submissions để cập nhật status
        await Promise.all([loadTask(), loadFiles()]);
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi duyệt submission'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmission = async () => {
    if (!submissionRejectReason || submissionRejectReason.trim().length === 0) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setActionLoading(true);
      const response = await reviewSubmission(
        selectedSubmissionForReject.submissionId,
        'reject',
        submissionRejectReason
      );
      if (response?.status === 'success') {
        message.success('Đã từ chối submission');
        setRejectionReasonModalVisible(false);
        setSelectedSubmissionForReject(null);
        setSubmissionRejectReason('');
        // Reload cả task assignment và submissions để cập nhật status
        // (assignment status sẽ chuyển thành revision_requested sau khi reject)
        await Promise.all([loadTask(), loadFiles()]);
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi từ chối submission'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewRevisionRequest = async () => {
    if (!selectedRevisionRequest) return;
    
    if (reviewRevisionAction === 'reject' && !reviewRevisionNote.trim()) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setActionLoading(true);
      const response = await reviewRevisionRequest(
        selectedRevisionRequest.revisionRequestId,
        reviewRevisionAction,
        reviewRevisionNote
      );
      if (response?.status === 'success') {
        message.success(
          reviewRevisionAction === 'approve'
            ? 'Đã duyệt revision request'
            : 'Đã từ chối revision request'
        );
        setReviewRevisionModalVisible(false);
        setSelectedRevisionRequest(null);
        setReviewRevisionAction('');
        setReviewRevisionNote('');
        // Reload revision requests và task
        await Promise.all([loadRevisionRequests(), loadTask()]);
      }
    } catch (error) {
      console.error('Error reviewing revision request:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi review revision request'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveIssue = async () => {
    if (!contractId || !assignmentId) {
      message.warning('Thiếu thông tin contract hoặc assignment');
      return;
    }
    try {
      setActionLoading(true);
      const response = await resolveIssue(contractId, assignmentId);
      if (response?.status === 'success') {
        message.success('Đã cho phép specialist tiếp tục task');
        await loadTask();
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi resolve issue'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTaskByManager = async () => {
    if (!contractId || !assignmentId) {
      message.warning('Thiếu thông tin contract hoặc assignment');
      return;
    }
    try {
      setActionLoading(true);
      const response = await cancelTaskByManager(contractId, assignmentId);
      if (response?.status === 'success') {
        message.success(
          'Đã hủy task thành công. Đang chuyển đến trang tạo task mới...'
        );
        // Navigate đến workspace với data pre-filled từ task cũ
        navigate(
          `/manager/milestone-assignments/${contractId}/new?milestoneId=${task.milestoneId}&taskType=${task.taskType}&excludeSpecialistId=${task.specialistId}`
        );
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi hủy task'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const url = `/api/v1/projects/files/download/${fileId}`;
      const response = await axiosInstance.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      message.success('Đã tải file thành công');
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('Lỗi khi tải file');
    }
  };

  const handlePreviewFile = async file => {
    try {
      setPreviewLoading(true);
      setPreviewFile(file);
      setPreviewModalVisible(true);

      const { blob, fileName, mimeType } = await fetchFileForPreview(
        file.fileId
      );

      // Tạo blob với đúng MIME type
      const finalMimeType =
        mimeType || file.mimeType || 'application/octet-stream';
      const blobWithType = new Blob([blob], { type: finalMimeType });
      const url = window.URL.createObjectURL(blobWithType);

      setPreviewFile(prev => ({
        ...prev,
        previewUrl: url,
        mimeType: finalMimeType,
      }));
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('Lỗi khi xem file');
      setPreviewModalVisible(false);
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatFileSize = bytes => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getContentTypeLabel = contentType => {
    const labels = {
      audio: 'Audio',
      notation: 'Notation',
      sheet_music: 'Sheet Music',
      project_file: 'Project File',
      documentation: 'Documentation',
      video: 'Video',
      archive: 'Archive',
      contract_pdf: 'Contract PDF',
    };
    return labels[contentType] || contentType;
  };

  // Helper functions for milestone deadline calculations
  const getActualStartDayjs = milestone =>
    milestone?.actualStartAt ? dayjs(milestone.actualStartAt) : null;

  const getPlannedStartDayjs = milestone =>
    milestone?.plannedStartAt ? dayjs(milestone.plannedStartAt) : null;

  const getPlannedDeadlineDayjs = milestone => {
    if (!milestone) return null;
    if (milestone.plannedDueDate) {
      return dayjs(milestone.plannedDueDate);
    }
    if (milestone.plannedStartAt && milestone.milestoneSlaDays) {
      return dayjs(milestone.plannedStartAt).add(
        Number(milestone.milestoneSlaDays || 0),
        'day'
      );
    }
    return null;
  };

  const getActualDeadlineDayjs = milestone => {
    if (!milestone?.actualStartAt || !milestone?.milestoneSlaDays) {
      return null;
    }
    return dayjs(milestone.actualStartAt).add(
      Number(milestone.milestoneSlaDays || 0),
      'day'
    );
  };

  const getEstimatedDeadlineDayjs = (milestone, contractMilestones = []) => {
    if (!milestone) return null;
    const slaDays = Number(milestone.milestoneSlaDays || 0);
    if (!slaDays) return null;

    // Ưu tiên 1: Nếu có plannedStartAt thì dùng nó
    const plannedStart = getPlannedStartDayjs(milestone);
    if (plannedStart) {
      return plannedStart.add(slaDays, 'day');
    }

    // Ưu tiên 2: Nếu là milestone đầu tiên (orderIndex <= 1) thì dùng thời gian hiện tại
    const orderIndex = milestone.orderIndex;
    if (!orderIndex || orderIndex <= 1) {
      return dayjs().add(slaDays, 'day');
    }

    // Ưu tiên 3: Tìm milestone trước đó để tính deadline
    const previousMilestone =
      contractMilestones.find(
        item =>
          item &&
          item.orderIndex === orderIndex - 1 &&
          (item.contractId
            ? item.contractId === (milestone.contractId || item.contractId)
            : true)
      ) || null;

    if (!previousMilestone) {
      return dayjs().add(slaDays, 'day');
    }

    // Tính deadline của milestone trước đó
    const previousDeadline =
      getActualDeadlineDayjs(previousMilestone) ||
      getPlannedDeadlineDayjs(previousMilestone) ||
      getEstimatedDeadlineDayjs(previousMilestone, contractMilestones);

    if (!previousDeadline) {
      return dayjs().add(slaDays, 'day');
    }

    // Deadline của milestone hiện tại = deadline của milestone trước + SLA days
    return previousDeadline.add(slaDays, 'day');
  };

  const calculateDaysRemaining = deadlineDayjs => {
    if (!deadlineDayjs) return null;
    const now = dayjs();
    const diffDays = deadlineDayjs.diff(now, 'day');
    return diffDays;
  };

  const getFileVersion = (file, allFiles) => {
    // Tính version dựa trên số file cùng assignment (tất cả delivery files đều cùng assignmentId)
    // Sắp xếp theo uploadDate (cũ nhất = version 1)
    const sortedFiles = [...allFiles].sort((a, b) => {
      const dateA = a.uploadDate ? new Date(a.uploadDate) : 0;
      const dateB = b.uploadDate ? new Date(b.uploadDate) : 0;
      return dateA - dateB;
    });

    const index = sortedFiles.findIndex(f => f.fileId === file.fileId);
    return index >= 0 ? index + 1 : null;
  };

  const isFinalVersion = (file, allFiles) => {
    // File là final nếu:
    // 1. Có status approved hoặc delivered
    // 2. Là file mới nhất (uploadDate lớn nhất) trong tất cả delivery files
    if (allFiles.length === 0) return false;

    const latestFile = allFiles.reduce((latest, current) => {
      const latestDate = latest.uploadDate ? new Date(latest.uploadDate) : 0;
      const currentDate = current.uploadDate ? new Date(current.uploadDate) : 0;
      return currentDate > latestDate ? current : latest;
    });

    const isLatest = latestFile.fileId === file.fileId;
    const isApproved =
      file.fileStatus === 'approved' || file.fileStatus === 'delivered';

    return isLatest && isApproved;
  };

  const canApprove = file => {
    const status = file.fileStatus?.toLowerCase();
    return status === 'uploaded' || status === 'pending_review';
  };

  const canReject = file => {
    const status = file.fileStatus?.toLowerCase();
    return status === 'uploaded' || status === 'pending_review';
  };


  // Phân loại submissions: Current Submission và Previous Submissions
  const currentSubmission = useMemo(() => {
    // Current submission: submission mới nhất (version lớn nhất)
    if (submissions.length === 0) return null;
    return submissions[0]; // Đã sort theo version desc
  }, [submissions]);

  const previousSubmissions = useMemo(() => {
    // Previous submissions: các submission cũ hơn (bỏ submission đầu tiên)
    if (submissions.length <= 1) return [];
    return submissions.slice(1);
  }, [submissions]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="Không tìm thấy task" />
        <Button onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.backRow}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
          <Space size="small" wrap className={styles.headerMeta}>
            {contract?.contractNumber && <Tag>{contract.contractNumber}</Tag>}
            <Tag color="cyan">
              {TASK_TYPE_LABELS[task.taskType] || task.taskType}
            </Tag>
            <Tag color={STATUS_COLORS[task.status] || 'default'}>
              {STATUS_LABELS[task.status] || task.status}
            </Tag>
          </Space>
        </div>
        <div className={styles.headerInfo}>
          <Title level={3} style={{ margin: 0 }}>
            Chi tiết Task
          </Title>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => navigate(`/manager/contracts/${contractId}`)}
            >
              Xem contract
            </Button>
            {task.milestoneId && (
              <Button
                onClick={() =>
                  navigate(
                    `/manager/milestone-assignments/${contractId}/milestone/${task.milestoneId}`
                  )
                }
              >
                Xem milestone
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className={styles.sectionStack}>
        {/* Request Info */}
        {(request || task?.request || contract?.requestId) && (
          <Card
            title="Thông tin Request"
            extra={requestLoading && <Spin size="small" />}
          >
            <Spin spinning={requestLoading}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Request ID" span={1}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {request?.requestId ||
                      task?.request?.requestId ||
                      contract?.requestId ||
                      'N/A'}
                  </span>
                </Descriptions.Item>

                <Descriptions.Item label="Service Type" span={1}>
                  <Tag color="orange">
                    {request?.requestType
                      ? request.requestType === 'transcription'
                        ? 'Transcription'
                        : request.requestType === 'arrangement'
                          ? 'Arrangement'
                          : request.requestType === 'arrangement_with_recording'
                            ? 'Arrangement with Recording'
                            : request.requestType === 'recording'
                              ? 'Recording'
                              : request.requestType
                      : task?.request?.serviceType || 'N/A'}
                  </Tag>
                </Descriptions.Item>

                {(request?.title || task?.request?.title) && (
                  <Descriptions.Item label="Title" span={2}>
                    <Text strong>{request?.title || task?.request?.title}</Text>
                  </Descriptions.Item>
                )}

                {(request?.description || task?.request?.description) && (
                  <Descriptions.Item label="Description" span={2}>
                    <Paragraph style={{ margin: 0 }}>
                      {request?.description || task?.request?.description}
                    </Paragraph>
                  </Descriptions.Item>
                )}

                {((request?.instruments && request.instruments.length > 0) ||
                  (task?.request?.instruments &&
                    Array.isArray(task.request.instruments) &&
                    task.request.instruments.length > 0)) && (
                  <Descriptions.Item label="Instruments" span={2}>
                    <Space wrap>
                      {(
                        request?.instruments ||
                        task?.request?.instruments ||
                        []
                      ).map((inst, idx) => (
                        <Tag key={idx} color="purple">
                          {inst.instrumentName || inst.name || inst}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                {request?.files &&
                  request.files.filter(
                    file => file.fileSource === 'customer_upload'
                  ).length > 0 && (
                    <Descriptions.Item label="Uploaded Files" span={2}>
                      <FileList
                        files={request.files.filter(
                          file => file.fileSource === 'customer_upload'
                        )}
                      />
                    </Descriptions.Item>
                  )}
              </Descriptions>
            </Spin>
          </Card>
        )}

        {/* Task Info */}
        <Card 
          title="Thông tin Task"
          extra={
            task.hasIssue && (
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleResolveIssue}
                  loading={actionLoading}
                >
                  Resolve Issue
                </Button>
                <Popconfirm
                  title="Xác nhận hủy task và tạo task mới?"
                  description="Task hiện tại sẽ bị hủy và bạn sẽ được chuyển đến trang tạo task mới với thông tin tương tự (milestone, task type). Bạn chỉ cần chọn specialist mới."
                  onConfirm={handleCancelTaskByManager}
                  okText="Xác nhận"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    danger 
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading}
                  >
                    Cancel Task
                  </Button>
                </Popconfirm>
              </Space>
            )
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Task Type">
              <Tag color="cyan">
                {TASK_TYPE_LABELS[task.taskType] || task.taskType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[task.status] || 'default'}>
                {STATUS_LABELS[task.status] || task.status}
              </Tag>
              {task.hasIssue && (
                <Tag
                  color="orange"
                  icon={<ExclamationCircleOutlined />}
                  style={{ marginLeft: 8 }}
                >
                  Issue
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Specialist">
              <Space direction="vertical" size={0}>
                <Text strong>
                  {task.specialistName || task.specialistId || 'N/A'}
                </Text>
                {task.specialistEmail && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {task.specialistEmail}
                  </Text>
                )}
                {task.specialistSpecialization && (
                  <Tag size="small">{task.specialistSpecialization}</Tag>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Milestone">
              {task.milestone?.name || task.milestoneId || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Date">
              {task.assignedDate
                ? dayjs(task.assignedDate).format('HH:mm DD/MM/YYYY')
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Completed Date">
              {task.completedDate
                ? dayjs(task.completedDate).format('HH:mm DD/MM/YYYY')
                : 'Chưa hoàn thành'}
            </Descriptions.Item>
            <Descriptions.Item label="Milestone Deadline" span={2}>
              {(() => {
                const actualDeadline = getActualDeadlineDayjs(task.milestone);
                const plannedDeadline = getPlannedDeadlineDayjs(task.milestone);
                const contractMilestones = contract?.milestones || [];
                const estimatedDeadline = getEstimatedDeadlineDayjs(
                  task.milestone,
                  contractMilestones
                );

                // Chỉ hiển thị "-" nếu không có bất kỳ deadline nào
                if (!actualDeadline && !plannedDeadline && !estimatedDeadline) {
                  return <Text type="secondary">-</Text>;
                }

                // Tính days remaining/overdue cho từng deadline
                const actualDaysDiff = actualDeadline
                  ? calculateDaysRemaining(actualDeadline)
                  : null;
                const plannedDaysDiff = plannedDeadline
                  ? calculateDaysRemaining(plannedDeadline)
                  : null;
                const estimatedDaysDiff = estimatedDeadline
                  ? calculateDaysRemaining(estimatedDeadline)
                  : null;

                // Dùng deadline nào để hiển thị cảnh báo (ưu tiên: actual > planned > estimated)
                const deadlineToUse =
                  actualDeadline || plannedDeadline || estimatedDeadline;
                const daysDiff =
                  actualDaysDiff !== null
                    ? actualDaysDiff
                    : plannedDaysDiff !== null
                      ? plannedDaysDiff
                      : estimatedDaysDiff;
                const isOverdue =
                  daysDiff !== null &&
                  daysDiff < 0 &&
                  task.status !== 'completed';
                const isNearDeadline =
                  daysDiff !== null &&
                  daysDiff <= 3 &&
                  daysDiff >= 0 &&
                  !isOverdue;

                return (
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    {/* Actual Deadline */}
                    {actualDeadline && (
                      <div>
                        <Space>
                          <Text strong>Actual Deadline:</Text>
                          <Text
                            type={
                              isOverdue && actualDaysDiff !== null
                                ? 'danger'
                                : isNearDeadline && actualDaysDiff !== null
                                  ? 'warning'
                                  : undefined
                            }
                            strong={
                              (isOverdue || isNearDeadline) &&
                              actualDaysDiff !== null
                            }
                          >
                            {actualDeadline.format('HH:mm DD/MM/YYYY')}
                          </Text>
                          {actualDaysDiff !== null && (
                            <>
                              {actualDaysDiff < 0 && (
                                <Tag color="red">
                                  Trễ {Math.abs(actualDaysDiff)} ngày
                                </Tag>
                              )}
                              {actualDaysDiff >= 0 && actualDaysDiff <= 3 && (
                                <Tag color="orange">
                                  Còn {actualDaysDiff} ngày
                                </Tag>
                              )}
                              {actualDaysDiff > 3 && (
                                <Tag color="green">
                                  Còn {actualDaysDiff} ngày
                                </Tag>
                              )}
                            </>
                          )}
                        </Space>
                      </div>
                    )}

                    {/* Planned Deadline */}
                    {plannedDeadline && (
                      <div>
                        <Space>
                          <Text strong type="secondary">
                            Planned Deadline:
                          </Text>
                          <Text type="secondary">
                            {plannedDeadline.format('HH:mm DD/MM/YYYY')}
                          </Text>
                          {!actualDeadline && plannedDaysDiff !== null && (
                            <>
                              {plannedDaysDiff < 0 && (
                                <Tag color="red">
                                  Trễ {Math.abs(plannedDaysDiff)} ngày
                                </Tag>
                              )}
                              {plannedDaysDiff >= 0 && plannedDaysDiff <= 3 && (
                                <Tag color="orange">
                                  Còn {plannedDaysDiff} ngày
                                </Tag>
                              )}
                              {plannedDaysDiff > 3 && (
                                <Tag color="green">
                                  Còn {plannedDaysDiff} ngày
                                </Tag>
                              )}
                            </>
                          )}
                        </Space>
                      </div>
                    )}

                    {/* Estimated Deadline - chỉ hiển thị khi không có actual và planned */}
                    {!actualDeadline &&
                      !plannedDeadline &&
                      estimatedDeadline && (
                        <div>
                          <Space>
                            <Text strong type="warning">
                              Estimated Deadline:
                            </Text>
                            <Text type="warning">
                              {estimatedDeadline.format('HH:mm DD/MM/YYYY')}
                            </Text>
                            {estimatedDaysDiff !== null && (
                              <>
                                {estimatedDaysDiff < 0 && (
                                  <Tag color="red">
                                    Trễ {Math.abs(estimatedDaysDiff)} ngày (ước
                                    tính)
                                  </Tag>
                                )}
                                {estimatedDaysDiff >= 0 &&
                                  estimatedDaysDiff <= 3 && (
                                    <Tag color="orange">
                                      Còn {estimatedDaysDiff} ngày (ước tính)
                                    </Tag>
                                  )}
                                {estimatedDaysDiff > 3 && (
                                  <Tag color="blue">
                                    Còn {estimatedDaysDiff} ngày (ước tính)
                                  </Tag>
                                )}
                              </>
                            )}
                          </Space>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              marginLeft: 0,
                              display: 'block',
                            }}
                          >
                            (Ước tính dựa trên milestone trước đó và SLA days)
                          </Text>
                        </div>
                      )}

                    {/* Alert nếu đang trễ */}
                    {isOverdue && task.status !== 'completed' && (
                      <Alert
                        message="Task đang quá hạn SLA"
                        description={`Milestone deadline đã qua ${Math.abs(daysDiff)} ngày. Cần ưu tiên review ngay.`}
                        type="error"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}
                    {isNearDeadline &&
                      task.status !== 'completed' &&
                      !isOverdue && (
                        <Alert
                          message="Task sắp đến hạn SLA"
                          description={`Còn ${daysDiff} ngày nữa đến deadline. Nên ưu tiên review sớm.`}
                          type="warning"
                          showIcon
                          style={{ marginTop: 8 }}
                        />
                      )}
                  </Space>
                );
              })()}
            </Descriptions.Item>
            {task.notes && (
              <Descriptions.Item label="Notes" span={2}>
                <Paragraph>{task.notes}</Paragraph>
              </Descriptions.Item>
            )}
            {task.hasIssue && task.issueReason && (
              <Descriptions.Item label="Issue Reason" span={2}>
                <Alert
                  message="Lý do báo issue"
                  description={task.issueReason}
                  type="warning"
                  showIcon
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Revision Requests */}
        {revisionRequests.length > 0 && (
          <Card
            title={
              <Space>
                <Text strong>Revision Requests</Text>
                <Tag color="orange">{revisionRequests.length}</Tag>
              </Space>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadRevisionRequests}
                loading={loadingRevisionRequests}
                size="small"
              >
                Làm mới
              </Button>
            }
          >
            <Spin spinning={loadingRevisionRequests}>
              <Collapse>
                {revisionRequests.map(revision => {
                  const status = revision.status?.toLowerCase();
                  const statusColors = {
                    pending_manager_review: 'orange',
                    in_revision: 'processing',
                    waiting_manager_review: 'blue',
                    approved_pending_delivery: 'cyan',
                    waiting_customer_confirm: 'purple',
                    completed: 'success',
                    rejected: 'error',
                    canceled: 'default',
                  };
                  const statusLabels = {
                    pending_manager_review: 'Chờ Manager duyệt',
                    in_revision: 'Đang chỉnh sửa',
                    waiting_manager_review: 'Chờ Manager review',
                    approved_pending_delivery: 'Đã duyệt, chờ deliver',
                    waiting_customer_confirm: 'Chờ Customer xác nhận',
                    completed: 'Hoàn thành',
                    rejected: 'Từ chối',
                    canceled: 'Đã hủy',
                  };

                  return (
                    <Collapse.Panel
                      key={revision.revisionRequestId}
                      header={
                        <Space>
                          <Text strong>
                            Revision Round #{revision.revisionRound}
                          </Text>
                          <Tag color={statusColors[status] || 'default'}>
                            {statusLabels[status] || status}
                          </Tag>
                          {revision.isFreeRevision && (
                            <Tag color="green">Free Revision</Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {revision.title}
                          </Text>
                        </Space>
                      }
                      extra={
                        status === 'pending_manager_review' && (
                          <Space>
                            <Button
                              size="small"
                              type="primary"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedRevisionRequest(revision);
                                setReviewRevisionAction('approve');
                                setReviewRevisionNote('');
                                setReviewRevisionModalVisible(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedRevisionRequest(revision);
                                setReviewRevisionAction('reject');
                                setReviewRevisionNote('');
                                setReviewRevisionModalVisible(true);
                              }}
                            >
                              Reject
                            </Button>
                          </Space>
                        )
                      }
                    >
                      <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Title">
                          <Text strong>{revision.title}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Description">
                          <Paragraph>{revision.description}</Paragraph>
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={statusColors[status] || 'default'}>
                            {statusLabels[status] || status}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Revision Round">
                          #{revision.revisionRound}
                        </Descriptions.Item>
                        <Descriptions.Item label="Free Revision">
                          {revision.isFreeRevision ? (
                            <Tag color="green">Yes</Tag>
                          ) : (
                            <Tag color="orange">No</Tag>
                          )}
                        </Descriptions.Item>
                        {revision.requestedAt && (
                          <Descriptions.Item label="Requested At">
                            {dayjs(revision.requestedAt).format(
                              'HH:mm DD/MM/YYYY'
                            )}
                          </Descriptions.Item>
                        )}
                        {revision.managerReviewedAt && (
                          <Descriptions.Item label="Manager Reviewed At">
                            {dayjs(revision.managerReviewedAt).format(
                              'HH:mm DD/MM/YYYY'
                            )}
                          </Descriptions.Item>
                        )}
                        {revision.managerNote && (
                          <Descriptions.Item label="Manager Note">
                            <Paragraph>{revision.managerNote}</Paragraph>
                          </Descriptions.Item>
                        )}
                        {revision.specialistSubmittedAt && (
                          <Descriptions.Item label="Specialist Submitted At">
                            {dayjs(revision.specialistSubmittedAt).format(
                              'HH:mm DD/MM/YYYY'
                            )}
                          </Descriptions.Item>
                        )}
                        {revision.customerConfirmedAt && (
                          <Descriptions.Item label="Customer Confirmed At">
                            {dayjs(revision.customerConfirmedAt).format(
                              'HH:mm DD/MM/YYYY'
                            )}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Collapse.Panel>
                  );
                })}
              </Collapse>
            </Spin>
          </Card>
        )}

        {/* Khối 1: Current Submission */}
        {currentSubmission && (
          <Card
            title={
              <Space>
                <Text strong>
                  Current review – Submission #{currentSubmission.version}
                  {currentSubmission.status?.toLowerCase() === 'rejected' &&
                    ' (Revision Requested)'}
                </Text>
                <Tag
                  color={
                    SUBMISSION_STATUS_COLORS[
                      currentSubmission.status?.toLowerCase()
                    ] || 'default'
                  }
                >
                  {SUBMISSION_STATUS_LABELS[
                    currentSubmission.status?.toLowerCase()
                  ] || currentSubmission.status}
                </Tag>
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadFiles}
                  loading={filesLoading}
                  size="small"
                >
                  Làm mới
                </Button>
                {/* 👉 Thêm nút Xem lý do nếu submission bị reject */}
                {currentSubmission.status?.toLowerCase() === 'rejected' &&
                  currentSubmission.rejectionReason && (
                    <Button
                      size="small"
                      icon={<ExclamationCircleOutlined />}
                      onClick={() => {
                        setSelectedSubmissionForReject(null); // đảm bảo modal ở mode view
                        setSubmissionRejectReason('');
                        setSelectedRejectionReason(
                          currentSubmission.rejectionReason
                        );
                        setRejectionReasonModalVisible(true);
                      }}
                    >
                      Xem lý do
                    </Button>
                  )}
                {currentSubmission.submittedAt && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Submitted:{' '}
                    {dayjs(currentSubmission.submittedAt).format(
                      'HH:mm DD/MM/YYYY'
                    )}
                  </Text>
                )}
                {currentSubmission.status?.toLowerCase() ===
                  'pending_review' && (
                  <>
                    <Popconfirm
                      title="Xác nhận duyệt submission?"
                      description="Tất cả files trong submission này sẽ được đánh dấu là đã duyệt"
                      onConfirm={() =>
                        handleApproveSubmission(currentSubmission.submissionId)
                      }
                      okText="Duyệt"
                      cancelText="Hủy"
                    >
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={actionLoading}
                      >
                        Approve
                      </Button>
                    </Popconfirm>
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        setSelectedSubmissionForReject(currentSubmission);
                        setSubmissionRejectReason('');
                        setRejectionReasonModalVisible(true);
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {currentSubmission.status?.toLowerCase() === 'approved' && (
                  <Popconfirm
                    title="Xác nhận gửi submission cho khách hàng?"
                    description="Tất cả files trong submission này sẽ được gửi cho khách hàng"
                    onConfirm={() =>
                      handleDeliverSubmission(currentSubmission.submissionId)
                    }
                    okText="Gửi"
                    cancelText="Hủy"
                  >
                    <Button
                      size="small"
                      type="primary"
                      icon={<SendOutlined />}
                      loading={actionLoading}
                    >
                      Deliver Submission
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            }
          >
            <Spin spinning={filesLoading}>
              {currentSubmission.files && currentSubmission.files.length > 0 ? (
                <List
                  dataSource={currentSubmission.files}
                  renderItem={file => {
                    const fileStatus = file.fileStatus?.toLowerCase();
                    const submissionStatus =
                      currentSubmission.status?.toLowerCase();
                    // Chỉ hiển thị file status nếu submission là draft (chưa submit)
                    // Nếu submission đã có status (pending_review, approved, rejected) thì không hiển thị file status để tránh lặp
                    const showFileStatus = submissionStatus === 'draft';

                    return (
                      <List.Item
                        actions={[
                          <Button
                            key="preview"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewFile(file)}
                          >
                            Preview
                          </Button>,
                          <Button
                            key="download"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() =>
                              handleDownloadFile(file.fileId, file.fileName)
                            }
                          >
                            Download
                          </Button>,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          avatar={<FileOutlined style={{ fontSize: 24 }} />}
                          title={
                              <Text strong>{file.fileName}</Text>
                          }
                          description={
                            <Space direction="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Loại: {getContentTypeLabel(file.contentType)} •
                                Dung lượng: {formatFileSize(file.fileSize)}
                              </Text>
                              {file.uploadDate && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Upload:{' '}
                                  {dayjs(file.uploadDate).format(
                                    'HH:mm DD/MM/YYYY'
                                  )}
                                </Text>
                              )}
                              {file.reviewedAt && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Reviewed:{' '}
                                  {dayjs(file.reviewedAt).format(
                                    'HH:mm DD/MM/YYYY'
                                  )}
                                </Text>
                              )}
                              {file.deliveredAt && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Delivered:{' '}
                                  {dayjs(file.deliveredAt).format(
                                    'HH:mm DD/MM/YYYY'
                                  )}
                                </Text>
                              )}
                              {file.description && (
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 12, fontStyle: 'italic' }}
                                >
                                  Note: {file.description}
                                </Text>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty description="Không có files trong submission này" />
              )}
            </Spin>
          </Card>
        )}

        {/* Khối 2: Previous Submissions (History) */}
        {previousSubmissions.length > 0 && (
          <Card
            title="Previous submissions (History)"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadFiles}
                loading={filesLoading}
                size="small"
              >
                Làm mới
              </Button>
            }
          >
            <Spin spinning={filesLoading}>
              <Collapse
                activeKey={Array.from(expandedSubmissions)}
                onChange={keys => {
                  setExpandedSubmissions(new Set(keys));
                }}
              >
                {previousSubmissions.map(submission => {
                  const submissionStatus = submission.status?.toLowerCase();
                  const files = submission.files || [];
                  const MAX_FILES_PREVIEW = 3; // Số file hiển thị ban đầu
                  const showAll =
                    showAllFiles[submission.submissionId] || false;
                  const displayedFiles = showAll
                    ? files
                    : files.slice(0, MAX_FILES_PREVIEW);
                  const hasMoreFiles = files.length > MAX_FILES_PREVIEW;

                  return (
                    <Collapse.Panel
                      key={submission.submissionId}
                      header={
                        <Space wrap>
                          <Text strong>Submission #{submission.version}</Text>
                          <Tag
                            color={
                              SUBMISSION_STATUS_COLORS[submissionStatus] ||
                              'default'
                            }
                          >
                            {SUBMISSION_STATUS_LABELS[submissionStatus] ||
                              submissionStatus}
                          </Tag>
                          {submission.fileCount > 0 && (
                            <Tag>{submission.fileCount} file(s)</Tag>
                          )}
                          {submission.submittedAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Submitted:{' '}
                              {dayjs(submission.submittedAt).format(
                                'HH:mm DD/MM/YYYY'
                              )}
                            </Text>
                          )}
                          {/* 👉 Nút xem lý do cho submission bị reject */}
                          {submissionStatus === 'rejected' &&
                            submission.rejectionReason && (
                              <Button
                                size="small"
                                type="link"
                                icon={<ExclamationCircleOutlined />}
                                onClick={e => {
                                  e.stopPropagation(); // tránh toggle collapse khi bấm nút
                                  setSelectedSubmissionForReject(null);
                                  setSubmissionRejectReason('');
                                  setSelectedRejectionReason(
                                    submission.rejectionReason
                                  );
                                  setRejectionReasonModalVisible(true);
                                }}
                              >
                                Xem lý do
                              </Button>
                            )}
                        </Space>
                      }
                    >
                      {files.length > 0 ? (
                        <>
                          <List
                            dataSource={displayedFiles}
                            renderItem={file => {
                              const fileStatus = file.fileStatus?.toLowerCase();
                              const submissionStatus =
                                submission.status?.toLowerCase();
                              // Chỉ hiển thị file status nếu submission là draft (chưa submit)
                              // Nếu submission đã có status (pending_review, approved, rejected) thì không hiển thị file status để tránh lặp
                              const showFileStatus =
                                submissionStatus === 'draft';

                              return (
                                <List.Item
                                  actions={[
                                    <Button
                                      key="preview"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => handlePreviewFile(file)}
                                    >
                                      Preview
                                    </Button>,
                                    <Button
                                      key="download"
                                      size="small"
                                      icon={<DownloadOutlined />}
                                      onClick={() =>
                                        handleDownloadFile(
                                          file.fileId,
                                          file.fileName
                                        )
                                      }
                                    >
                                      Download
                                    </Button>,
                                  ].filter(Boolean)}
                                >
                                  <List.Item.Meta
                                    avatar={
                                      <FileOutlined style={{ fontSize: 24 }} />
                                    }
                                    title={
                                        <Text strong>{file.fileName}</Text>
                                    }
                                    description={
                                      <Space direction="vertical" size={0}>
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: 12 }}
                                        >
                                          Loại:{' '}
                                          {getContentTypeLabel(
                                            file.contentType
                                          )}{' '}
                                          • Dung lượng:{' '}
                                          {formatFileSize(file.fileSize)}
                                        </Text>
                                        {file.uploadDate && (
                                          <Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                          >
                                            Upload:{' '}
                                            {dayjs(file.uploadDate).format(
                                              'HH:mm DD/MM/YYYY'
                                            )}
                                          </Text>
                                        )}
                                        {file.reviewedAt && (
                                          <Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                          >
                                            Reviewed:{' '}
                                            {dayjs(file.reviewedAt).format(
                                              'HH:mm DD/MM/YYYY'
                                            )}
                                          </Text>
                                        )}
                                        {file.deliveredAt && (
                                          <Text
                                            type="secondary"
                                            style={{ fontSize: 12 }}
                                          >
                                            Delivered:{' '}
                                            {dayjs(file.deliveredAt).format(
                                              'HH:mm DD/MM/YYYY'
                                            )}
                                          </Text>
                                        )}
                                        {file.description && (
                                          <Text
                                            type="secondary"
                                            style={{
                                              fontSize: 12,
                                              fontStyle: 'italic',
                                            }}
                                          >
                                            Note: {file.description}
                                          </Text>
                                        )}
                                      </Space>
                                    }
                                  />
                                </List.Item>
                              );
                            }}
                          />
                          {hasMoreFiles && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                              <Button
                                type="link"
                                onClick={() => {
                                  setShowAllFiles(prev => ({
                                    ...prev,
                                    [submission.submissionId]: !showAll,
                                  }));
                                }}
                              >
                                {showAll
                                  ? `Thu gọn (hiển thị ${MAX_FILES_PREVIEW} file đầu)`
                                  : `Xem thêm ${files.length - MAX_FILES_PREVIEW} file nữa`}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <Empty description="Không có files trong submission này" />
                      )}
                    </Collapse.Panel>
                  );
                })}
              </Collapse>
            </Spin>
          </Card>
        )}

        {/* Nếu không có submissions nào */}
        {!currentSubmission && previousSubmissions.length === 0 && (
          <Card
            title="Submissions"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadFiles}
                loading={filesLoading}
                size="small"
              >
                Làm mới
              </Button>
            }
          >
            <Spin spinning={filesLoading}>
              <Empty description="Chưa có submissions nào" />
            </Spin>
          </Card>
        )}
      </div>

      {/* Request Revision Modal */}
      <Modal
        title="Yêu cầu chỉnh sửa File"
        open={revisionModalVisible}
        onOk={handleRequestRevision}
        onCancel={() => {
          setRevisionModalVisible(false);
          setSelectedFileForRevision(null);
          setRevisionReason('');
        }}
        confirmLoading={actionLoading}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        {selectedFileForRevision && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong>File: </Text>
              <Text>{selectedFileForRevision.fileName}</Text>
            </div>
            <div>
              <Text strong>Lý do yêu cầu chỉnh sửa: </Text>
              <TextArea
                rows={4}
                value={revisionReason}
                onChange={e => setRevisionReason(e.target.value)}
                placeholder="Nhập lý do yêu cầu chỉnh sửa file (ví dụ: cần điều chỉnh tempo, thêm instrument, sửa notation...)..."
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Rejection Reason Modal - for viewing file rejection or rejecting submission */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>
              {selectedSubmissionForReject
                ? 'Từ chối Submission'
                : 'Lý do từ chối file'}
            </span>
          </Space>
        }
        open={rejectionReasonModalVisible}
        onOk={selectedSubmissionForReject ? handleRejectSubmission : undefined}
        onCancel={() => {
          setRejectionReasonModalVisible(false);
          setSelectedRejectionReason(null);
          setSelectedSubmissionForReject(null);
          setSubmissionRejectReason('');
        }}
        footer={
          selectedSubmissionForReject
            ? [
                <Button
                  key="cancel"
                  onClick={() => {
                    setRejectionReasonModalVisible(false);
                    setSelectedSubmissionForReject(null);
                    setSubmissionRejectReason('');
                  }}
                >
                  Hủy
                </Button>,
                <Button
                  key="reject"
                  danger
                  onClick={handleRejectSubmission}
                  loading={actionLoading}
                >
                  Từ chối
                </Button>,
              ]
            : [
                <Button
                  key="close"
                  onClick={() => {
                    setRejectionReasonModalVisible(false);
                    setSelectedRejectionReason(null);
                  }}
                >
                  Đóng
                </Button>,
              ]
        }
        width={600}
      >
        {selectedSubmissionForReject ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong>Submission: </Text>
              <Text>
                {selectedSubmissionForReject.submissionName ||
                  `Submission v${selectedSubmissionForReject.version}`}
              </Text>
            </div>
            <div>
              <Text strong>Lý do từ chối: </Text>
              <TextArea
                rows={4}
                value={submissionRejectReason}
                onChange={e => setSubmissionRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối submission này..."
              />
            </div>
          </Space>
        ) : (
          <Alert
            message="File đã bị từ chối"
            description={
              <Paragraph
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedRejectionReason}
              </Paragraph>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
      </Modal>

      {/* Review Revision Request Modal */}
      <Modal
        title={
          reviewRevisionAction === 'approve'
            ? 'Duyệt Revision Request'
            : 'Từ chối Revision Request'
        }
        open={reviewRevisionModalVisible}
        onOk={handleReviewRevisionRequest}
        onCancel={() => {
          setReviewRevisionModalVisible(false);
          setSelectedRevisionRequest(null);
          setReviewRevisionAction('');
          setReviewRevisionNote('');
        }}
        confirmLoading={actionLoading}
        okText={reviewRevisionAction === 'approve' ? 'Duyệt' : 'Từ chối'}
        cancelText="Hủy"
        okButtonProps={
          reviewRevisionAction === 'reject' ? { danger: true } : {}
        }
        width={600}
      >
        {selectedRevisionRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message={`Revision Round #${selectedRevisionRequest.revisionRound}`}
              description={selectedRevisionRequest.title}
              type="info"
              showIcon
            />
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Description">
                <Paragraph>{selectedRevisionRequest.description}</Paragraph>
              </Descriptions.Item>
            </Descriptions>
            {reviewRevisionAction === 'reject' && (
              <div>
                <Text strong>Lý do từ chối (bắt buộc):</Text>
                <TextArea
                  rows={4}
                  value={reviewRevisionNote}
                  onChange={e => setReviewRevisionNote(e.target.value)}
                  placeholder="Nhập lý do từ chối revision request này..."
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
            {reviewRevisionAction === 'approve' && (
              <div>
                <Text strong>Ghi chú (tùy chọn):</Text>
                <TextArea
                  rows={4}
                  value={reviewRevisionNote}
                  onChange={e => setReviewRevisionNote(e.target.value)}
                  placeholder="Nhập ghi chú cho specialist..."
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* Preview File Modal */}
      <Modal
        title={previewFile?.fileName || 'Preview File'}
        open={previewModalVisible}
        onCancel={() => {
          // Cleanup blob URL
          if (previewFile?.previewUrl) {
            window.URL.revokeObjectURL(previewFile.previewUrl);
          }
          setPreviewModalVisible(false);
          setPreviewFile(null);
        }}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (previewFile) {
                handleDownloadFile(previewFile.fileId, previewFile.fileName);
              }
            }}
          >
            Tải file
          </Button>,
          <Button
            key="close"
            onClick={() => {
              // Cleanup blob URL
              if (previewFile?.previewUrl) {
                window.URL.revokeObjectURL(previewFile.previewUrl);
              }
              setPreviewModalVisible(false);
              setPreviewFile(null);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={900}
        destroyOnHidden={true}
      >
        <Spin spinning={previewLoading}>
          {previewFile?.previewUrl && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {previewFile.mimeType?.startsWith('image/') ? (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.fileName}
                  style={{ maxWidth: '100%', maxHeight: '600px' }}
                />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewFile.previewUrl}
                  style={{ width: '100%', height: '600px', border: 'none' }}
                  title={previewFile.fileName}
                />
              ) : previewFile.mimeType?.startsWith('audio/') ? (
                <div
                  style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
                >
                  <audio controls style={{ width: '100%' }} preload="metadata">
                    <source
                      src={previewFile.previewUrl}
                      type={previewFile.mimeType}
                    />
                    Trình duyệt không hỗ trợ audio player
                  </audio>
                </div>
              ) : previewFile.mimeType?.startsWith('video/') ? (
                <video
                  controls
                  style={{ width: '100%', maxHeight: '600px' }}
                  preload="metadata"
                >
                  <source
                    src={previewFile.previewUrl}
                    type={previewFile.mimeType}
                  />
                  Trình duyệt không hỗ trợ video player
                </video>
              ) : (
                <Alert
                  message="Không thể preview file này"
                  description="Vui lòng tải file để xem"
                  type="info"
                />
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default TaskDetailPage;
