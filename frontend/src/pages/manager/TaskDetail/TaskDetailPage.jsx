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
  StarFilled,
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
import { getStudioBookingById } from '../../../services/studioBookingService';
import { getSpecialistById } from '../../../services/specialistService';
import FileList from '../../../components/common/FileList/FileList';
import axiosInstance from '../../../utils/axiosInstance';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import {
  getGenreLabel,
  getPurposeLabel,
} from '../../../constants/musicOptionsConstants';
import styles from './TaskDetailPage.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const TASK_TYPE_LABELS = {
  transcription: 'Transcription',
  arrangement: 'Arrangement',
  recording_supervision: 'Recording Supervision',
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
  waiting_customer_review: 'purple',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABELS = {
  assigned: 'Assigned',
  accepted_waiting: 'Accepted - Waiting',
  ready_to_start: 'Ready to start',
  in_progress: 'In progress',
  ready_for_review: 'Ready for review',
  revision_requested: 'Revision requested',
  in_revision: 'In revision',
  delivery_pending: 'Pending delivery',
  waiting_customer_review: 'Waiting customer review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const FILE_STATUS_LABELS = {
  uploaded: 'Uploaded',
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  delivered: 'Delivered',
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
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  delivered: 'Delivered',
  customer_accepted: 'Customer accepted',
  customer_rejected: 'Customer rejected - Needs revision',
};

const SUBMISSION_STATUS_COLORS = {
  draft: 'default',
  pending_review: 'processing',
  approved: 'success',
  rejected: 'error',
  delivered: 'green',
  customer_accepted: 'success',
  customer_rejected: 'error',
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
  const [reviewRevisionModalVisible, setReviewRevisionModalVisible] =
    useState(false);
  const [selectedRevisionRequest, setSelectedRevisionRequest] = useState(null);
  const [reviewRevisionAction, setReviewRevisionAction] = useState(''); // 'approve' or 'reject'
  const [reviewRevisionNote, setReviewRevisionNote] = useState('');
  const [studioBooking, setStudioBooking] = useState(null);
  const [loadingStudioBooking, setLoadingStudioBooking] = useState(false);
  const [artistsInfo, setArtistsInfo] = useState({});
  const [loadingArtists, setLoadingArtists] = useState(false);

  const loadArtistsInfo = useCallback(async participants => {
    try {
      setLoadingArtists(true);
      const specialistIds = participants
        .map(p => p.specialistId)
        .filter(Boolean);

      if (specialistIds.length === 0) {
        setLoadingArtists(false);
        return;
      }

      const promises = specialistIds.map(async specialistId => {
        try {
          const response = await getSpecialistById(specialistId);
          if (response?.status === 'success' && response?.data) {
            return { specialistId, data: response.data };
          }
          return { specialistId, data: null };
        } catch (error) {
          console.warn(`Error loading specialist ${specialistId}:`, error);
          return { specialistId, data: null };
        }
      });

      const results = await Promise.all(promises);
      const infoMap = {};
      results.forEach(({ specialistId, data }) => {
        if (data) {
          infoMap[specialistId] = data;
        }
      });
      setArtistsInfo(infoMap);
    } catch (error) {
      console.error('Error loading artists info:', error);
    } finally {
      setLoadingArtists(false);
    }
  }, []);

  const loadStudioBooking = useCallback(
    async bookingId => {
      if (!bookingId) {
        setStudioBooking(null);
        return;
      }
      try {
        setLoadingStudioBooking(true);
        const response = await getStudioBookingById(bookingId);
        if (response?.status === 'success' && response?.data) {
          const booking = response.data;
          setStudioBooking(booking);

          // Load thông tin artists nếu có (từ participants với performerSource = INTERNAL_ARTIST)
          const internalArtists =
            booking?.participants?.filter(
              p => p.performerSource === 'INTERNAL_ARTIST'
            ) || [];
          if (internalArtists.length > 0) {
            loadArtistsInfo(internalArtists);
          }
        } else {
          setStudioBooking(null);
        }
      } catch (error) {
        console.error('Error loading studio booking:', error);
        setStudioBooking(null);
      } finally {
        setLoadingStudioBooking(false);
      }
    },
    [loadArtistsInfo]
  );

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
      // Load studio booking nếu là recording_supervision task
      if (task.studioBookingId && task.taskType === 'recording_supervision') {
        loadStudioBooking(task.studioBookingId);
      }
    }
  }, [task, assignmentId, loadStudioBooking]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load task và contract trước
      await Promise.all([loadTask(), loadContract()]);
      // Sau khi task đã load, mới load request và files
      // (sẽ được trigger bởi useEffect khi task thay đổi)
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load task data');
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
      message.error('Failed to load task info');
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
        message.error('Failed to load submissions');
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Failed to load files');
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
        message.success('Approved file successfully');
        await loadFiles();
      }
    } catch (error) {
      console.error('Error approving file:', error);
      message.error(error?.response?.data?.message || 'Failed to approve file');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedFileForRevision || !revisionReason.trim()) {
      message.warning('Please enter a revision reason');
      return;
    }
    try {
      setActionLoading(true);
      const response = await rejectFile(
        selectedFileForRevision.fileId,
        revisionReason
      );
      if (response?.status === 'success') {
        message.success('Requested file revision');
        setRevisionModalVisible(false);
        setSelectedFileForRevision(null);
        setRevisionReason('');
        await loadFiles();
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
      message.error(
        error?.response?.data?.message || 'Failed to request file revision'
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
        message.success('Sent submission to customer');
        await loadFiles();
        await loadTask();
      }
    } catch (error) {
      console.error('Error delivering submission:', error);
      message.error(
        error?.response?.data?.message ||
          'Failed to send submission to customer'
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
        message.success('Approved submission successfully');
        // Reload cả task assignment và submissions để cập nhật status
        await Promise.all([loadTask(), loadFiles()]);
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      message.error(
        error?.response?.data?.message || 'Failed to approve submission'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmission = async () => {
    if (!submissionRejectReason || submissionRejectReason.trim().length === 0) {
      message.warning('Please enter a rejection reason');
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
        message.success('Rejected submission');
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
        error?.response?.data?.message || 'Failed to reject submission'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewRevisionRequest = async () => {
    if (!selectedRevisionRequest) return;

    if (reviewRevisionAction === 'reject' && !reviewRevisionNote.trim()) {
      message.warning('Please enter a rejection reason');
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
            ? 'Approved revision request'
            : 'Rejected revision request'
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
        error?.response?.data?.message || 'Failed to review revision request'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveIssue = async () => {
    if (!contractId || !assignmentId) {
      message.warning('Missing contract or assignment info');
      return;
    }
    try {
      setActionLoading(true);
      const response = await resolveIssue(contractId, assignmentId);
      if (response?.status === 'success') {
        message.success('Allowed specialist to continue the task');
        await loadTask();
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
      message.error(
        error?.response?.data?.message || 'Failed to resolve issue'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTaskByManager = async () => {
    if (!contractId || !assignmentId) {
      message.warning('Missing contract or assignment info');
      return;
    }
    try {
      setActionLoading(true);
      const response = await cancelTaskByManager(contractId, assignmentId);
      if (response?.status === 'success') {
        message.success(
          'Task cancelled successfully. Redirecting to create a new task...'
        );
        // Navigate to workspace with data pre-filled from old task
        navigate(
          `/manager/milestone-assignments/${contractId}/new?milestoneId=${task.milestoneId}&taskType=${task.taskType}&excludeSpecialistId=${task.specialistId}`
        );
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      message.error(error?.response?.data?.message || 'Failed to cancel task');
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
    if (!milestone?.plannedDueDate) return null;
    const d = dayjs(milestone.plannedDueDate);
    return d.isValid() ? d : null;
  };

  const getActualDeadlineDayjs = milestone => {
    if (!milestone?.targetDeadline) return null;
    const d = dayjs(milestone.targetDeadline);
    return d.isValid() ? d : null;
  };

  const getEstimatedDeadlineDayjs = (milestone, _contractMilestones = []) => {
    if (!milestone?.estimatedDeadline) return null;
    const d = dayjs(milestone.estimatedDeadline);
    return d.isValid() ? d : null;
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
                      ).map((inst, idx) => {
                        const isMain = inst.isMain === true;
                        const requestType =
                          request?.requestType || task?.request?.requestType;
                        const isArrangement =
                          requestType === 'arrangement' ||
                          requestType === 'arrangement_with_recording';
                        return (
                          <Tag
                            key={idx}
                            color={isMain && isArrangement ? 'gold' : 'purple'}
                            icon={
                              isMain && isArrangement ? <StarFilled /> : null
                            }
                          >
                            {inst.instrumentName || inst.name || inst}
                            {isMain && isArrangement && ' (Main)'}
                          </Tag>
                        );
                      })}
                    </Space>
                  </Descriptions.Item>
                )}

                {/* Hiển thị main instrument name cho arrangement requests */}
                {(request?.requestType === 'arrangement' ||
                  request?.requestType === 'arrangement_with_recording' ||
                  task?.request?.requestType === 'arrangement' ||
                  task?.request?.requestType ===
                    'arrangement_with_recording') && (
                  <>
                    {((request?.genres && request.genres.length > 0) ||
                      (task?.request?.genres &&
                        Array.isArray(task.request.genres) &&
                        task.request.genres.length > 0)) && (
                      <Descriptions.Item label="Genres" span={2}>
                        <Space wrap>
                          {(request?.genres || task?.request?.genres || []).map(
                            (genre, idx) => (
                              <Tag key={idx} color="purple">
                                {getGenreLabel(genre)}
                              </Tag>
                            )
                          )}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {(request?.purpose || task?.request?.purpose) && (
                      <Descriptions.Item label="Purpose" span={2}>
                        {getPurposeLabel(
                          request?.purpose || task?.request?.purpose
                        )}
                      </Descriptions.Item>
                    )}
                    {(request?.requestType === 'arrangement_with_recording' ||
                      task?.request?.requestType ===
                        'arrangement_with_recording') &&
                      ((request?.preferredSpecialists &&
                        request.preferredSpecialists.length > 0) ||
                        (task?.request?.preferredSpecialists &&
                          task.request.preferredSpecialists.length > 0)) && (
                        <Descriptions.Item label="Preferred Vocalists" span={2}>
                          <Space wrap>
                            {(
                              request?.preferredSpecialists ||
                              task?.request?.preferredSpecialists ||
                              []
                            ).map((specialist, idx) => (
                              <Tag key={idx} color="pink">
                                {specialist.name ||
                                  `Vocalist ${specialist.specialistId}`}
                              </Tag>
                            ))}
                          </Space>
                        </Descriptions.Item>
                      )}
                  </>
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
              <Space>
                <Text>{task.milestone?.name || task.milestoneId || 'N/A'}</Text>
                {task.milestone?.milestoneType && (
                  <Tag color="blue">
                    {task.milestone.milestoneType === 'transcription'
                      ? 'Transcription'
                      : task.milestone.milestoneType === 'arrangement'
                        ? 'Arrangement'
                        : task.milestone.milestoneType === 'recording'
                          ? task.taskType === 'recording_supervision'
                            ? 'Recording Supervision'
                            : 'Recording'
                          : task.milestone.milestoneType}
                  </Tag>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Date">
              {task.assignedDate
                ? dayjs(task.assignedDate).format('HH:mm DD/MM/YYYY')
                : 'N/A'}
            </Descriptions.Item>
            {task.milestone && (
              <>
                <Descriptions.Item label="First Submission">
                  {task.milestone.firstSubmissionAt
                    ? dayjs(task.milestone.firstSubmissionAt).format(
                        'HH:mm DD/MM/YYYY'
                      )
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Work Completed">
                  {task.milestone.finalCompletedAt
                    ? dayjs(task.milestone.finalCompletedAt).format(
                        'HH:mm DD/MM/YYYY'
                      )
                    : 'Chưa hoàn thành'}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Completed">
                  {task.milestone.actualEndAt
                    ? dayjs(task.milestone.actualEndAt).format(
                        'HH:mm DD/MM/YYYY'
                      )
                    : '—'}
                </Descriptions.Item>
                {/* Hiển thị arrangement submission files cho recording milestone */}
                {task.milestone.milestoneType === 'recording' &&
                  task.milestone.sourceArrangementSubmission && (
                    <Descriptions.Item label="Arrangement Final Files" span={2}>
                      <div
                        style={{
                          padding: 12,
                          background: '#f5f5f5',
                          borderRadius: 4,
                        }}
                      >
                        <Space
                          direction="vertical"
                          size="small"
                          style={{ width: '100%' }}
                        >
                          <Text strong>Arrangement Final Files:</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {
                              task.milestone.sourceArrangementSubmission
                                .submissionName
                            }
                            (v
                            {task.milestone.sourceArrangementSubmission.version}
                            )
                          </Text>
                          {task.milestone.sourceArrangementSubmission.files &&
                            task.milestone.sourceArrangementSubmission.files
                              .length > 0 && (
                              <Space
                                direction="vertical"
                                size="small"
                                style={{ width: '100%' }}
                              >
                                {task.milestone.sourceArrangementSubmission.files.map(
                                  (file, idx) => (
                                    <Button
                                      key={idx}
                                      type="link"
                                      size="small"
                                      icon={<DownloadOutlined />}
                                      onClick={() =>
                                        downloadFileHelper(
                                          file.fileId,
                                          file.fileName
                                        )
                                      }
                                      style={{ padding: 0, height: 'auto' }}
                                    >
                                      {file.fileName}
                                      {file.fileSize && (
                                        <Text
                                          type="secondary"
                                          style={{
                                            marginLeft: 8,
                                            fontSize: '11px',
                                          }}
                                        >
                                          (
                                          {(
                                            file.fileSize /
                                            1024 /
                                            1024
                                          ).toFixed(2)}{' '}
                                          MB)
                                        </Text>
                                      )}
                                    </Button>
                                  )
                                )}
                              </Space>
                            )}
                        </Space>
                      </div>
                    </Descriptions.Item>
                  )}
              </>
            )}
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

                // SLA status đã được BE tính sẵn (firstSubmissionLate/overdueNow)
                const hasFirstSubmission = !!task.milestone?.firstSubmissionAt;
                const hasPendingReview = submissions.some(
                  s => s.status?.toLowerCase() === 'pending_review'
                );
                const isFirstSubmissionLate =
                  task.milestone?.firstSubmissionLate === true;
                const isFirstSubmissionOnTime =
                  hasFirstSubmission &&
                  task.milestone?.firstSubmissionLate === false;

                const overdueNow = task.milestone?.overdueNow;
                const shouldHideDeadlineWarning =
                  hasFirstSubmission || hasPendingReview;
                const isOverdue =
                  !shouldHideDeadlineWarning &&
                  overdueNow === true &&
                  task.status !== 'completed';
                const isNearDeadline =
                  !shouldHideDeadlineWarning &&
                  overdueNow === false &&
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
                    {/* Target/SLA Deadline */}
                    {actualDeadline && (
                      <div>
                        <Space>
                          <Text strong>Target Deadline:</Text>
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
                            {task.milestone?.milestoneSlaDays && (
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                (+{task.milestone.milestoneSlaDays} ngày SLA)
                              </Text>
                            )}
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
                          {isFirstSubmissionLate && (
                            <Tag color="red">Nộp trễ (bản đầu)</Tag>
                          )}
                          {isFirstSubmissionOnTime && (
                            <Tag color="green">Nộp đúng hạn (bản đầu)</Tag>
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

        {/* Studio Booking Information (cho recording_supervision) */}
        {task?.taskType === 'recording_supervision' &&
          task?.studioBookingId && (
            <Card title="Studio Booking Information" size="small" bordered>
              {loadingStudioBooking ? (
                <Spin />
              ) : studioBooking ? (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Booking ID">
                    <Space>
                      <Text
                        copyable
                        type="secondary"
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      >
                        {studioBooking.bookingId}
                      </Text>
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() =>
                          navigate(
                            `/manager/studio-bookings/${studioBooking.bookingId}`
                          )
                        }
                      >
                        Xem chi tiết
                      </Button>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Studio">
                    <Text>{studioBooking.studioName || 'N/A'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày">
                    {studioBooking.bookingDate
                      ? dayjs(studioBooking.bookingDate).format('DD/MM/YYYY')
                      : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian">
                    {studioBooking.startTime && studioBooking.endTime
                      ? `${studioBooking.startTime} - ${studioBooking.endTime}`
                      : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag
                      color={
                        studioBooking.status === 'CONFIRMED'
                          ? 'success'
                          : studioBooking.status === 'IN_PROGRESS'
                            ? 'processing'
                            : studioBooking.status === 'PENDING'
                              ? 'processing'
                              : studioBooking.status === 'COMPLETED'
                                ? 'success'
                                : studioBooking.status === 'CANCELLED'
                                  ? 'error'
                                  : 'default'
                      }
                    >
                      {studioBooking.status === 'CONFIRMED'
                        ? 'Đã xác nhận'
                        : studioBooking.status === 'IN_PROGRESS'
                          ? 'Đang thực hiện'
                          : studioBooking.status === 'PENDING'
                            ? 'Đang chờ'
                            : studioBooking.status === 'COMPLETED'
                              ? 'Hoàn thành'
                              : studioBooking.status === 'CANCELLED'
                                ? 'Đã hủy'
                                : studioBooking.status || 'N/A'}
                    </Tag>
                  </Descriptions.Item>
                  {studioBooking.sessionType && (
                    <Descriptions.Item label="Session Type">
                      <Tag color="blue">{studioBooking.sessionType}</Tag>
                    </Descriptions.Item>
                  )}
                  {() => {
                    const internalArtists =
                      studioBooking?.participants?.filter(
                        p => p.performerSource === 'INTERNAL_ARTIST'
                      ) || [];
                    return (
                      internalArtists.length > 0 && (
                        <Descriptions.Item label="Artists" span={2}>
                          {loadingArtists ? (
                            <Spin />
                          ) : (
                            <Space
                              direction="vertical"
                              size="small"
                              style={{ width: '100%' }}
                            >
                              {internalArtists.map((participant, idx) => {
                                const specialistInfo =
                                  artistsInfo[participant.specialistId];
                                return (
                                  <Card
                                    key={idx}
                                    size="small"
                                    style={{ marginBottom: 8 }}
                                  >
                                    <Space
                                      direction="vertical"
                                      size="small"
                                      style={{ width: '100%' }}
                                    >
                                      <Space>
                                        {specialistInfo?.avatarUrl && (
                                          <img
                                            src={specialistInfo.avatarUrl}
                                            alt={
                                              specialistInfo.fullName ||
                                              'Artist'
                                            }
                                            style={{
                                              width: 40,
                                              height: 40,
                                              borderRadius: '50%',
                                              objectFit: 'cover',
                                            }}
                                          />
                                        )}
                                        <Space direction="vertical" size={0}>
                                          <Space>
                                            <Text strong>
                                              {specialistInfo?.fullName ||
                                                'N/A'}
                                            </Text>
                                            {participant.isPrimary && (
                                              <Tag color="gold">Primary</Tag>
                                            )}
                                          </Space>
                                          {specialistInfo?.email && (
                                            <Text
                                              type="secondary"
                                              style={{ fontSize: '12px' }}
                                            >
                                              {specialistInfo.email}
                                            </Text>
                                          )}
                                        </Space>
                                      </Space>
                                      <Space>
                                        <Text strong>Specialist ID:</Text>
                                        <Text
                                          copyable={{
                                            text: participant.specialistId,
                                          }}
                                          style={{
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                          }}
                                        >
                                          {participant.specialistId?.substring(
                                            0,
                                            8
                                          )}
                                          ...
                                        </Text>
                                      </Space>
                                      <Space>
                                        <Text strong>Role:</Text>
                                        <Tag
                                          color={
                                            participant.roleType === 'VOCAL'
                                              ? 'orange'
                                              : 'blue'
                                          }
                                        >
                                          {participant.roleType === 'VOCAL'
                                            ? 'Vocal'
                                            : participant.roleType ===
                                                'INSTRUMENT'
                                              ? 'Instrument'
                                              : participant.roleType || 'N/A'}
                                        </Tag>
                                      </Space>
                                      {specialistInfo?.primaryTag && (
                                        <Space>
                                          <Text strong>Primary Tag:</Text>
                                          <Tag>{specialistInfo.primaryTag}</Tag>
                                        </Space>
                                      )}
                                      {specialistInfo?.experienceYears && (
                                        <Space>
                                          <Text strong>Experience:</Text>
                                          <Text>
                                            {specialistInfo.experienceYears} năm
                                          </Text>
                                        </Space>
                                      )}
                                      {specialistInfo?.genres &&
                                        specialistInfo.genres.length > 0 && (
                                          <Space wrap>
                                            <Text strong>Genres:</Text>
                                            {specialistInfo.genres.map(
                                              (genre, gIdx) => (
                                                <Tag key={gIdx} size="small">
                                                  {genre}
                                                </Tag>
                                              )
                                            )}
                                          </Space>
                                        )}
                                    </Space>
                                  </Card>
                                );
                              })}
                            </Space>
                          )}
                        </Descriptions.Item>
                      )
                    );
                  }}
                  {studioBooking.notes && (
                    <Descriptions.Item label="Notes" span={2}>
                      <Text>{studioBooking.notes}</Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <Empty description="Không tìm thấy thông tin booking" />
              )}
            </Card>
          )}

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
                          {revision.revisionDueAt && (
                            <Tag
                              color={
                                dayjs(revision.revisionDueAt).isBefore(dayjs())
                                  ? 'red'
                                  : 'blue'
                              }
                            >
                              Deadline:{' '}
                              {dayjs(revision.revisionDueAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                              {revision.revisionDeadlineDays && (
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 11, marginLeft: 4 }}
                                >
                                  (+{revision.revisionDeadlineDays} ngày SLA)
                                </Text>
                              )}
                            </Tag>
                          )}
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
                        {revision.originalSubmissionId && (
                          <Descriptions.Item label="Original Submission">
                            <Text>
                              Version{' '}
                              {submissions.find(
                                s =>
                                  s.submissionId ===
                                  revision.originalSubmissionId
                              )?.version || 'N/A'}
                            </Text>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                display: 'block',
                                marginTop: 4,
                              }}
                            >
                              (Submission bị request revision)
                            </Text>
                          </Descriptions.Item>
                        )}
                        {revision.revisedSubmissionId && (
                          <Descriptions.Item label="Revised Submission">
                            <Text>
                              Version{' '}
                              {submissions.find(
                                s =>
                                  s.submissionId ===
                                  revision.revisedSubmissionId
                              )?.version || 'N/A'}
                            </Text>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                display: 'block',
                                marginTop: 4,
                              }}
                            >
                              (Submission sau khi chỉnh sửa)
                            </Text>
                          </Descriptions.Item>
                        )}
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
                        {revision.revisionDueAt && (
                          <Descriptions.Item label="Revision Deadline">
                            <Space>
                              <Text strong>
                                {dayjs(revision.revisionDueAt).format(
                                  'DD/MM/YYYY HH:mm'
                                )}
                                {revision.revisionDeadlineDays && (
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11, marginLeft: 4 }}
                                  >
                                    (+{revision.revisionDeadlineDays} ngày SLA)
                                  </Text>
                                )}
                              </Text>
                              {dayjs(revision.revisionDueAt).isBefore(
                                dayjs()
                              ) && <Tag color="red">Quá hạn</Tag>}
                              {!dayjs(revision.revisionDueAt).isBefore(
                                dayjs()
                              ) && (
                                <Tag color="blue">
                                  Còn{' '}
                                  {dayjs(revision.revisionDueAt).diff(
                                    dayjs(),
                                    'day'
                                  )}{' '}
                                  ngày
                                </Tag>
                              )}
                            </Space>
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
                          title={<Text strong>{file.fileName}</Text>}
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
                                    title={<Text strong>{file.fileName}</Text>}
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
