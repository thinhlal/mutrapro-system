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
  Checkbox,
  Collapse,
  Divider,
} from 'antd';
import {
  LeftOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  EditOutlined,
  InboxOutlined,
  DownloadOutlined,
  DeleteOutlined,
  StarFilled,
} from '@ant-design/icons';
import FileList from '../../../components/common/FileList/FileList';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getMyTaskAssignmentById,
  acceptTaskAssignment,
  reportIssue,
  startTaskAssignment,
} from '../../../services/taskAssignmentService';
import {
  uploadTaskFile,
  getFilesByAssignmentId,
  softDeleteFile,
  getFilesByRequestId,
} from '../../../services/fileService';
import { submitFilesForReview } from '../../../services/taskAssignmentService';
import { getSubmissionsByAssignmentId } from '../../../services/fileSubmissionService';
import { getRevisionRequestsByAssignment } from '../../../services/revisionRequestService';
import { getStudioBookingById } from '../../../services/studioBookingService';
import { getSpecialistById } from '../../../services/specialistService';
import { downloadFileHelper } from '../../../utils/filePreviewHelper';
import styles from './SpecialistTaskDetailPage.module.css';

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
    ready_for_review: { color: 'orange', text: 'Ready for Review' },
    revision_requested: { color: 'warning', text: 'Revision Requested' },
    in_revision: { color: 'processing', text: 'In Revision' },
    delivery_pending: { color: 'cyan', text: 'Delivery Pending' },
    waiting_customer_review: {
      color: 'purple',
      text: 'Waiting Customer Review',
    },
    completed: { color: 'green', text: 'Completed' },
    cancelled: { color: 'default', text: 'Cancelled' },
  };
  const item = map[status.toLowerCase()] || { color: 'default', text: status };
  return <Tag color={item.color}>{item.text}</Tag>;
}

function getFileStatusTag(status) {
  if (!status) return <Tag color="default">Unknown</Tag>;
  const statusUpper = status.toUpperCase();
  const map = {
    UPLOADED: { color: 'blue', text: 'Draft' },
    PENDING_REVIEW: { color: 'blue', text: 'Pending Review' },
    APPROVED: { color: 'green', text: 'Approved' },
    REJECTED: { color: 'red', text: 'Rejected' },
    REVISION_REQUESTED: { color: 'orange', text: 'Revision Requested' },
  };
  const item = map[statusUpper] || { color: 'default', text: status };
  return <Tag color={item.color}>{item.text}</Tag>;
}

const SUBMISSION_STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  delivered: 'Delivered',
  customer_accepted: 'Customer Accepted',
  customer_rejected: 'Customer Rejected',
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

function getTaskTypeLabel(taskType) {
  if (!taskType) return 'N/A';
  const normalizedType = taskType.toLowerCase();
  const labels = {
    transcription: 'Transcription',
    arrangement: 'Arrangement',
    arrangement_with_recording: 'Arrangement with Recording',
    recording: 'Recording',
    recording_supervision: 'Recording Supervision',
  };
  return labels[normalizedType] || taskType;
}

function getServiceTypeLabel(serviceType) {
  if (!serviceType) return 'N/A';
  const normalizedType = serviceType.toLowerCase();
  const labels = {
    transcription: 'Transcription',
    arrangement: 'Arrangement',
    arrangement_with_recording: 'Arrangement with Recording',
    recording: 'Recording',
  };
  return labels[normalizedType] || serviceType;
}

function getPurposeLabel(purpose) {
  if (!purpose) return 'N/A';
  const normalizedPurpose = purpose.toLowerCase();
  const labels = {
    karaoke_cover: 'Karaoke Cover',
    performance: 'Performance',
    recording: 'Recording',
    education: 'Education',
    commercial: 'Commercial Use',
    personal: 'Personal Use',
    other: 'Other',
  };
  return labels[normalizedPurpose] || purpose;
}

function getActualDeadline(milestone, studioBooking = null) {
  if (!milestone?.targetDeadline) return null;
  const d = new Date(milestone.targetDeadline);
  return Number.isFinite(d.getTime()) ? d : null;
}

function getPlannedDeadline(milestone) {
  if (!milestone) return null;
  if (milestone.plannedDueDate) {
    const due = new Date(milestone.plannedDueDate);
    if (Number.isFinite(due.getTime())) {
      return due;
    }
  }
  return null;
}

// ---------------- Component ----------------
const SpecialistTaskDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId } = useParams(); // taskId thực chất là assignmentId
  // Detect base path from current location (e.g., /transcription, /arrangement, /recording-artist)
  const basePath =
    location.pathname.split('/').slice(0, 2).join('/') || '/transcription';

  const [task, setTask] = useState(null);
  const [request, setRequest] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studioBooking, setStudioBooking] = useState(null);
  const [loadingStudioBooking, setLoadingStudioBooking] = useState(false);
  const [artistsInfo, setArtistsInfo] = useState({}); // Map specialistId -> specialist info
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // File đang được chọn trong form
  const [uploadForm] = Form.useForm();
  const [acceptingTask, setAcceptingTask] = useState(false);
  const [startingTask, setStartingTask] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueForm] = Form.useForm();
  const [selectedFileIds, setSelectedFileIds] = useState(new Set()); // State local để chọn files submit
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionReasonToView, setRejectionReasonToView] = useState('');
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [loadingRevisionRequests, setLoadingRevisionRequests] = useState(false);

  const { actualDeadline, plannedDeadline, estimatedDeadline } = useMemo(() => {
    if (!task?.milestone) {
      return {
        actualDeadline: null,
        plannedDeadline: null,
        estimatedDeadline: null,
      };
    }
    // Pass studioBooking để tính deadline cho recording milestone
    const actual = getActualDeadline(task.milestone, studioBooking);
    const planned = getPlannedDeadline(task.milestone);
    const estimated =
      !actual && !planned && task.milestone?.estimatedDeadline
        ? (() => {
            const d = new Date(task.milestone.estimatedDeadline);
            return Number.isFinite(d.getTime()) ? d : null;
          })()
        : null;
    return {
      actualDeadline: actual,
      plannedDeadline: planned,
      estimatedDeadline: estimated,
    };
  }, [task, studioBooking]);

  const loadTaskFiles = useCallback(async assignmentId => {
    if (!assignmentId) return;

    try {
      const response = await getFilesByAssignmentId(assignmentId);
      if (response?.status === 'success' && Array.isArray(response?.data)) {
        // Map API response to UI format
        // Sort by uploadDate để version đúng thứ tự
        // Backend đã filter deleted files rồi, không cần filter ở đây nữa
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
          submissionId: file.submissionId || null, // Thêm submissionId để phân loại
          rejectionReason: file.rejectionReason || null, // Thêm rejectionReason cho manager note
        }));
        setFiles(mappedFiles);

        // Reset selectedFileIds khi load files mới (chỉ giữ những file vẫn còn trong list)
        setSelectedFileIds(prev => {
          const newSet = new Set();
          mappedFiles.forEach(f => {
            if (prev.has(f.fileId) && f.fileStatus === 'uploaded') {
              newSet.add(f.fileId);
            }
          });
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error loading files:', error);
      // Don't show error - files might not exist yet
    }
  }, []); // No dependencies - assignmentId passed as parameter

  const loadRequestFiles = useCallback(async requestId => {
    if (!requestId) return;
    try {
      const response = await getFilesByRequestId(requestId);
      if (response?.status === 'success' && Array.isArray(response?.data)) {
        // Cập nhật request state với files
        setRequest(prevRequest => {
          if (prevRequest && prevRequest.requestId === requestId) {
            return {
              ...prevRequest,
              files: response.data,
            };
          }
          return prevRequest;
        });
      }
    } catch (error) {
      console.error('Error loading request files:', error);
      // Don't show error - files might not exist yet
    }
  }, []);

  const loadSubmissions = useCallback(async assignmentId => {
    if (!assignmentId) return;
    try {
      setLoadingSubmissions(true);
      const response = await getSubmissionsByAssignmentId(assignmentId);
      if (response?.status === 'success' && Array.isArray(response?.data)) {
        // Sort submissions by version (mới nhất trước)
        const sortedSubmissions = [...response.data].sort((a, b) => {
          const versionA = a.version || 0;
          const versionB = b.version || 0;
          return versionB - versionA; // Mới nhất trước
        });
        setSubmissions(sortedSubmissions);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  const loadRevisionRequests = useCallback(async assignmentId => {
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
  }, []);

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

          // Load thông tin artists nếu có
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
  console.log('request', request);
  
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

        // Tối ưu: Hiển thị UI ngay khi có task data, không đợi các data khác
        // Điều này giúp user thấy trang nhanh hơn, các data khác sẽ load sau
        setLoading(false);

        const contractId =
          taskData.contractId || taskData?.milestone?.contractId;

        // Load các data khác sau (không block UI)
        // Load studio booking nếu là recording_supervision task
        // Tối ưu: Load tất cả data song song để giảm thời gian
        // Lazy load revision requests vì nó chậm nhất (2.25s) - chỉ load khi user click vào tab
        const loadPromises = [
          loadTaskFiles(taskData.assignmentId),
          loadSubmissions(taskData.assignmentId),
          // loadRevisionRequests - lazy load khi cần (khi user click vào tab revision)
        ];

        // Load request files nếu có requestId (chạy song song với các requests khác)
        if (taskData.request?.requestId) {
          loadPromises.push(loadRequestFiles(taskData.request.requestId));
        }

        if (
          taskData.studioBookingId &&
          taskData.taskType === 'recording_supervision'
        ) {
          loadPromises.push(loadStudioBooking(taskData.studioBookingId));
        }

        // Không đợi các promises này, để chúng load sau và cập nhật UI dần
        Promise.all(loadPromises).catch(err => {
          console.error('Error loading additional data:', err);
        });
      } else {
        setError('Task not found');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading task detail:', err);
      setError(err?.message || 'Failed to load task');
      setLoading(false);
    }
  }, [
    taskId,
    // REMOVED: loadContractTasks - không cần thiết
    loadTaskFiles,
    loadSubmissions,
    loadRevisionRequests,
    loadStudioBooking,
    loadRequestFiles,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReload = useCallback(() => {
    loadData(); // loadData đã lo luôn cả files
  }, [loadData]);

  const handleSubmitForReview = useCallback(async () => {
    if (!task) return;

    const status = task.status?.toLowerCase();
    if (
      status !== 'in_progress' &&
      status !== 'revision_requested' &&
      status !== 'in_revision'
    ) {
      return;
    }

    // Lấy danh sách fileIds đã được chọn (chỉ lấy draft files: fileStatus = 'uploaded' và không có submissionId)
    const uploadedFileIds = Array.from(selectedFileIds).filter(fileId => {
      const file = files.find(f => f.fileId === fileId);
      return file && file.fileStatus === 'uploaded' && !file.submissionId;
    });

    if (uploadedFileIds.length === 0) {
      message.warning(
        'Không có file nào được chọn để submit. Vui lòng tick checkbox để chọn ít nhất 1 file.'
      );
      return;
    }

    try {
      setSubmittingForReview(true);
      // Backend tự động tạo submission, add files và submit
      const response = await submitFilesForReview(
        task.assignmentId,
        uploadedFileIds
      );

      if (response?.status === 'success') {
        message.success(
          `Đã submit ${uploadedFileIds.length} file(s) for review thành công`
        );
        setSelectedFileIds(new Set()); // Reset selection
        // Reload cả files và submissions
        await Promise.all([
          loadTaskFiles(task.assignmentId),
          loadSubmissions(task.assignmentId),
        ]);
      } else {
        message.error(response?.message || 'Lỗi khi submit for review');
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      message.error(error?.message || 'Lỗi khi submit for review');
    } finally {
      setSubmittingForReview(false);
    }
  }, [task, selectedFileIds, files, loadTaskFiles, loadSubmissions]);

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

  const handleDownloadFile = useCallback(async file => {
    // downloadFileHelper đã có error handling và success message built-in
    await downloadFileHelper(file.fileId, file.fileName);
  }, []);

  const handleToggleFileSelection = useCallback((fileId, checked) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  }, []);

  const handleDeleteFile = useCallback(fileId => {
    setDeletingFileId(fileId);
    setDeleteModalVisible(true);
  }, []);

  const handleConfirmDeleteFile = useCallback(async () => {
    if (!deletingFileId) return;

    try {
      setDeletingFile(true);
      const response = await softDeleteFile(deletingFileId);

      if (response?.status === 'success') {
        message.success('File đã được xóa thành công');
        // Reload cả files và submissions sau khi delete
        await Promise.all([
          loadTaskFiles(task.assignmentId),
          loadSubmissions(task.assignmentId),
        ]);
        // Bỏ file khỏi list selected nếu đang selected
        setSelectedFileIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(deletingFileId);
          return newSet;
        });
        setDeleteModalVisible(false);
        setDeletingFileId(null);
      } else {
        message.error(response?.message || 'Lỗi khi xóa file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      message.error(error?.message || 'Lỗi khi xóa file');
    } finally {
      setDeletingFile(false);
    }
  }, [deletingFileId, loadTaskFiles, loadSubmissions, task?.assignmentId]);

  const handleCancelDeleteFile = useCallback(() => {
    setDeleteModalVisible(false);
    setDeletingFileId(null);
  }, []);

  // Reset form khi modal mở
  useEffect(() => {
    if (uploadModalVisible) {
      uploadForm.resetFields();
    }
  }, [uploadModalVisible, uploadForm]);

  const handleOpenUploadModal = useCallback(() => {
    setSelectedFile(null);
    setUploadModalVisible(true);
  }, []);

  const handleUploadCancel = useCallback(() => {
    if (uploading) return; // Prevent closing while uploading
    uploadForm.resetFields();
    setSelectedFile(null);
    setUploadModalVisible(false);
    setUploading(false);
  }, [uploadForm, uploading]);

  const handleUploadOk = async () => {
    if (!task?.assignmentId) {
      message.error('Assignment ID not found');
      return;
    }

    if (uploading) {
      return;
    }

    try {
      setUploading(true);

      const values = await uploadForm.validateFields();

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
        'notation'
      );

      if (response?.status === 'success') {
        message.success('File uploaded successfully');
        uploadForm.resetFields();
        setSelectedFile(null);
        setUploadModalVisible(false);
        // Reload cả files và submissions sau khi upload
        await Promise.all([
          loadTaskFiles(task.assignmentId),
          loadSubmissions(task.assignmentId),
        ]);
      } else {
        message.error(response?.message || 'Failed to upload file');
      }
    } catch (error) {
      if (error?.errorFields) return;
      console.error('Error uploading file:', error);
      message.error(error?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Latest version = highest version number from files
  const latestVersion = useMemo(() => {
    if (files.length === 0) return 0;
    return Math.max(...files.map(f => f.version || 0));
  }, [files]);

  // Phân loại files và submissions
  const draftFiles = useMemo(() => {
    // Draft files: fileStatus = 'uploaded' và submissionId = null
    return files.filter(
      file => file.fileStatus === 'uploaded' && !file.submissionId
    );
  }, [files]);

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

  // Helper function để match revision requests với submissions
  const getRevisionRequestsForSubmission = useCallback(
    submissionId => {
      if (!submissionId || !revisionRequests.length) return [];
      return revisionRequests.filter(
        revision =>
          revision.originalSubmissionId === submissionId ||
          revision.revisedSubmissionId === submissionId
      );
    },
    [revisionRequests]
  );

  // Helper function để lấy revision request tạo ra submission này (revised submission)
  const getRevisionRequestForRevisedSubmission = useCallback(
    submissionId => {
      if (!submissionId || !revisionRequests.length) return null;
      return (
        revisionRequests.find(
          revision => revision.revisedSubmissionId === submissionId
        ) || null
      );
    },
    [revisionRequests]
  );

  // Columns cho Draft Files
  const draftFileColumns = useMemo(
    () => [
      {
        title: 'Version',
        key: 'version',
        width: 90,
        render: (_, record) => `v${record.version}`,
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
        key: 'status',
        width: 120,
        render: () => <Tag color="blue">Draft</Tag>,
      },
      {
        title: 'Chọn submit',
        key: 'selectForSubmission',
        width: 120,
        render: (_, record) => (
          <Checkbox
            checked={selectedFileIds.has(record.fileId)}
            onChange={e =>
              handleToggleFileSelection(record.fileId, e.target.checked)
            }
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadFile(record)}
              size="small"
            >
              Download
            </Button>
            {(task.status?.toLowerCase() === 'in_progress' ||
              task.status?.toLowerCase() === 'revision_requested' ||
              task.status?.toLowerCase() === 'in_revision') &&
              task.status?.toLowerCase() !== 'ready_for_review' &&
              task.status?.toLowerCase() !== 'completed' && (
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteFile(record.fileId)}
                  size="small"
                >
                  Delete
                </Button>
              )}
          </Space>
        ),
      },
    ],
    [
      selectedFileIds,
      handleToggleFileSelection,
      handleDownloadFile,
      handleDeleteFile,
      task?.status,
    ]
  );

  // Columns cho Current Submission Files
  const currentSubmissionFileColumns = useMemo(
    () => [
      {
        title: 'Version',
        key: 'version',
        width: 90,
        render: (_, record) => {
          // Tính version dựa trên thứ tự trong tất cả files (sort theo uploadDate)
          const allFilesSorted = [...files].sort((a, b) => {
            const dateA = new Date(a.uploadDate || 0);
            const dateB = new Date(b.uploadDate || 0);
            return dateA - dateB; // Oldest first
          });
          const fileIndex = allFilesSorted.findIndex(
            f => f.fileId === record.fileId
          );
          return fileIndex >= 0 ? `v${fileIndex + 1}` : '-';
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
        title: 'Actions',
        key: 'actions',
        width: 100,
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
    [files, handleDownloadFile]
  );

  // Columns cho History Files
  const historyFileColumns = useMemo(
    () => [
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
        title: 'Submitted at',
        dataIndex: 'uploadDate',
        key: 'uploadDate',
        width: 180,
        render: iso => formatDateTime(iso),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
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
    [handleDownloadFile]
  );

  const fileColumns = useMemo(
    () => [
      {
        title: 'Version',
        key: 'version',
        width: 90,
        render: (_, record) => {
          // Version đã được tính sẵn khi load files (oldest = v1, newest = vN)
          return `v${record.version}`;
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
        render: s => {
          if (s === 'uploaded') {
            return <Tag color="blue">Draft</Tag>;
          }
          return getFileStatusTag(s);
        },
      },
      {
        title: 'Select for submission',
        key: 'selectForSubmission',
        width: 180,
        render: (_, record) => {
          // Chỉ hiện checkbox cho file uploaded
          if (record.fileStatus === 'uploaded') {
            return (
              <Checkbox
                checked={selectedFileIds.has(record.fileId)}
                onChange={e =>
                  handleToggleFileSelection(record.fileId, e.target.checked)
                }
              ></Checkbox>
            );
          }
          return <Text type="secondary">—</Text>;
        },
      },
      {
        title: 'Note',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: text =>
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
          return sortedFiles[0]?.fileId === record.fileId ? (
            <Tag>Latest</Tag>
          ) : null;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 200,
        render: (_, record) => {
          const canDelete =
            record.fileStatus === 'uploaded' &&
            (task.status?.toLowerCase() === 'in_progress' ||
              task.status?.toLowerCase() === 'revision_requested' ||
              task.status?.toLowerCase() === 'in_revision') &&
            task.status?.toLowerCase() !== 'ready_for_review' &&
            task.status?.toLowerCase() !== 'completed';

          return (
            <Space>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadFile(record)}
                size="small"
              >
                Download
              </Button>
              {canDelete && (
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteFile(record.fileId)}
                  size="small"
                >
                  Delete
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    [
      latestVersion,
      handleDownloadFile,
      selectedFileIds,
      handleToggleFileSelection,
      files,
      task?.status,
      handleDeleteFile,
    ]
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
              onClick={() => navigate(`${basePath}/my-tasks`)}
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
            Work on your task assignment
          </Text>
        </div>
        <div className={styles.headerActions}>
          <Button
            type="default"
            icon={<LeftOutlined />}
            onClick={() => navigate(`${basePath}/my-tasks`)}
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
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card title="Task Assignment Details" size="small" bordered>
                <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Assignment ID">
                <Text copyable>{task.assignmentId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Task Type">
                <Tag color="cyan">{getTaskTypeLabel(task.taskType)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Milestone">
                {task.milestone ? (
                  <div>
                    <Space>
                      <Text strong>{task.milestone.name}</Text>
                      {task.milestone.milestoneType && (
                        <Tag color="blue" size="small">
                          {task.milestone.milestoneType === 'transcription'
                            ? 'Transcription'
                            : task.milestone.milestoneType === 'arrangement'
                              ? 'Arrangement'
                              : task.milestone.milestoneType === 'recording'
                                ? 'Recording'
                                : task.milestone.milestoneType}
                        </Tag>
                      )}
                    </Space>
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
                    {/* Hiển thị arrangement submission download link cho recording milestone */}
                    {task.milestone.milestoneType === 'recording' &&
                      task.milestone.sourceArrangementSubmission && (
                        <div
                          style={{
                            marginTop: 12,
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
                              {
                                task.milestone.sourceArrangementSubmission
                                  .version
                              }
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
                                        style={{
                                          padding: 0,
                                          height: 'auto',
                                          maxWidth: '100%',
                                        }}
                                      >
                                        <Text
                                          ellipsis={{
                                            tooltip: file.fileName,
                                          }}
                                          style={{
                                            maxWidth: 260,
                                            display: 'inline-block',
                                            verticalAlign: 'bottom',
                                          }}
                                        >
                                          {file.fileName}
                                        </Text>
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
                      )}
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
              {task.milestone && (
                <>
                  <Descriptions.Item label="First Submission">
                    {task.milestone.firstSubmissionAt
                      ? formatDateTime(task.milestone.firstSubmissionAt)
                      : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Work Completed">
                    {task.milestone.finalCompletedAt
                      ? formatDateTime(task.milestone.finalCompletedAt)
                      : 'Chưa hoàn thành'}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Milestone Deadline">
                {task.milestone ? (
                  <Space direction="vertical" size={4}>
                    <div>
                      <Text strong>Target</Text>
                      <div>
                        {actualDeadline ? (
                          <>
                            {formatDateTime(actualDeadline)}
                            {task.milestone?.milestoneSlaDays && (
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                (+{task.milestone.milestoneSlaDays} ngày SLA)
                              </Text>
                            )}
                          </>
                        ) : (
                          'Chưa có'
                        )}
                      </div>
                      {/* SLA status tags */}
                      <div style={{ marginTop: 4 }}>
                        {(() => {
                          const hasFirstSubmission =
                            !!task.milestone?.firstSubmissionAt;
                          const isFirstSubmissionLate =
                            task.milestone?.firstSubmissionLate === true;
                          const isFirstSubmissionOnTime =
                            hasFirstSubmission &&
                            task.milestone?.firstSubmissionLate === false;
                          const overdueNow = task.milestone?.overdueNow;
                          const isPendingReview =
                            task.status?.toLowerCase() === 'ready_for_review' ||
                            task.status?.toLowerCase() ===
                              'waiting_customer_review';
                          const shouldHideOverdueWarning =
                            hasFirstSubmission || isPendingReview;
                          const isOverdue =
                            !shouldHideOverdueWarning &&
                            overdueNow === true &&
                            task.status?.toLowerCase() !== 'completed';

                          return (
                            <>
                              {isOverdue && <Tag color="red">Quá hạn</Tag>}
                              {isFirstSubmissionLate && (
                                <Tag color="red">Nộp trễ (bản đầu)</Tag>
                              )}
                              {isFirstSubmissionOnTime && (
                                <Tag color="green">Nộp đúng hạn (bản đầu)</Tag>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Chỉ hiển thị Planned khi không có Target */}
                    {!actualDeadline && (
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
                    )}
                    {estimatedDeadline && (
                      <div>
                        <Text strong type="warning">
                          Estimated
                        </Text>
                        <Text type="secondary">
                          {formatDateTime(estimatedDeadline)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          (Estimated when not started)
                        </Text>
                      </div>
                    )}
                  </Space>
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
              </Card>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Studio Booking Information (cho recording_supervision) */}
              {task?.taskType === 'recording_supervision' &&
                task?.studioBookingId && (
                  <Card
                    title="Studio Booking Information"
                    size="small"
                    bordered
                  >
                    {loadingStudioBooking ? (
                      <Spin />
                    ) : studioBooking ? (
                      <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="Booking ID">
                          <Text
                            copyable
                            type="secondary"
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                            }}
                          >
                            {studioBooking.bookingId}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Studio">
                          <Text>{studioBooking.studioName || 'N/A'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày">
                          {studioBooking.bookingDate
                            ? dayjs(studioBooking.bookingDate).format(
                                'DD/MM/YYYY'
                              )
                            : 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Thời gian">
                          {studioBooking.startTime && studioBooking.endTime
                            ? `${studioBooking.startTime} - ${studioBooking.endTime}`
                            : 'N/A'}
                        </Descriptions.Item>
                        {studioBooking.durationHours && (
                          <Descriptions.Item label="Thời lượng">
                            <Text>{studioBooking.durationHours} giờ</Text>
                          </Descriptions.Item>
                        )}
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
                        {(() => {
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
                                              <Space
                                                direction="vertical"
                                                size={0}
                                              >
                                                <Space>
                                                  <Text strong>
                                                    {specialistInfo?.fullName ||
                                                      'N/A'}
                                                  </Text>
                                                  {participant.isPrimary && (
                                                    <Tag color="gold">
                                                      Primary
                                                    </Tag>
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
                                                  participant.roleType ===
                                                  'VOCAL'
                                                    ? 'orange'
                                                    : 'blue'
                                                }
                                              >
                                                {participant.roleType ===
                                                'VOCAL'
                                                  ? 'Vocal'
                                                  : participant.roleType ===
                                                      'INSTRUMENT'
                                                    ? 'Instrument'
                                                    : participant.roleType ||
                                                      'N/A'}
                                              </Tag>
                                            </Space>
                                            {specialistInfo && (
                                              <>
                                                {specialistInfo.experienceYears && (
                                                  <Space>
                                                    <Text strong>
                                                      Experience:
                                                    </Text>
                                                    <Text>
                                                      {
                                                        specialistInfo.experienceYears
                                                      }{' '}
                                                      years
                                                    </Text>
                                                  </Space>
                                                )}
                                                {specialistInfo.genres &&
                                                  specialistInfo.genres.length >
                                                    0 && (
                                                    <Space wrap>
                                                      <Text strong>
                                                        Genres:
                                                      </Text>
                                                      {specialistInfo.genres.map(
                                                        (genre, gIdx) => (
                                                          <Tag
                                                            key={gIdx}
                                                            color="purple"
                                                          >
                                                            {genre}
                                                          </Tag>
                                                        )
                                                      )}
                                                    </Space>
                                                  )}
                                              </>
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
                        })()}
                        {studioBooking.notes && (
                          <Descriptions.Item label="Notes" span={2}>
                            <Text type="secondary">{studioBooking.notes}</Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    ) : (
                      <Text type="secondary">
                        Không thể tải thông tin studio booking
                      </Text>
                    )}
                  </Card>
                )}

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
                        <Tag>{getServiceTypeLabel(request.serviceType)}</Tag>
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
                    {request.serviceType === 'transcription' && request.durationSeconds && (
                      <Descriptions.Item label="Duration">
                        <Text>{formatDuration(request.durationSeconds)}</Text>
                      </Descriptions.Item>
                    )}
                    {request.serviceType === 'transcription' && request.tempo && (
                      <Descriptions.Item label="Tempo">
                        <Text>{request.tempo} BPM</Text>
                      </Descriptions.Item>
                    )}
                    {(request.serviceType === 'arrangement' || request.serviceType === 'arrangement_with_recording') && request.genres && request.genres.length > 0 && (
                      <Descriptions.Item label="Genres" span={2}>
                        <Space wrap>
                          {request.genres.map((genre, idx) => (
                            <Tag key={idx} color="blue">
                              {genre}
                            </Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {(request.serviceType === 'arrangement' || request.serviceType === 'arrangement_with_recording') && request.purpose && (
                      <Descriptions.Item label="Purpose">
                        <Text>{getPurposeLabel(request.purpose)}</Text>
                      </Descriptions.Item>
                    )}
                    {request.instruments && request.instruments.length > 0 && (
                      <Descriptions.Item label="Instruments" span={2}>
                        <Space wrap>
                          {request.instruments.map((inst, idx) => {
                            const isMain = inst.isMain === true;
                            const isArrangement =
                              request.serviceType === 'arrangement' ||
                              request.serviceType ===
                                'arrangement_with_recording';
                            return (
                              <Tag
                                key={idx}
                                color={
                                  isMain && isArrangement ? 'gold' : 'default'
                                }
                                icon={
                                  isMain && isArrangement ? (
                                    <StarFilled />
                                  ) : null
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
                    {request.serviceType === 'arrangement_with_recording' &&
                      request.preferredSpecialists &&
                      request.preferredSpecialists.length > 0 && (
                        <Descriptions.Item label="Preferred Vocalists" span={2}>
                          <Space wrap>
                            {request.preferredSpecialists.map(
                              (specialist, idx) => (
                                <Tag key={idx} color="pink">
                                  {specialist.name ||
                                    `Vocalist ${specialist.specialistId}`}
                                </Tag>
                              )
                            )}
                          </Space>
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

                // Với recording_supervision task, cần có studio booking trước khi start
                const isRecordingSupervision =
                  task.taskType?.toLowerCase() === 'recording_supervision';
                const isRecordingMilestone =
                  task.milestone?.milestoneType?.toLowerCase() === 'recording';
                const hasStudioBooking =
                  task.studioBookingId &&
                  task.studioBookingId.trim().length > 0;
                const needsStudioBooking =
                  isRecordingSupervision &&
                  isRecordingMilestone &&
                  !hasStudioBooking;

                // Kiểm tra booking status nếu đã có booking (chỉ check status, không check thời gian)
                // Lưu ý: Khi revision (in_revision), booking có thể đã COMPLETED nhưng vẫn cho phép làm việc (revision hậu kỳ)
                let canStartWithBooking = true;
                let bookingStatusMessage = '';
                let daysUntilBooking = null;
                let bookingDateFormatted = '';

                if (hasStudioBooking && studioBooking) {
                  // Chỉ validate khi hasStartButton = true (ready_to_start)
                  // Nhưng vẫn hiển thị booking info cho mọi status
                  const bookingStatus = studioBooking.status;

                  // Tính toán booking date và countdown (luôn tính để hiển thị)
                  if (studioBooking.bookingDate) {
                    const bookingDate = dayjs(
                      studioBooking.bookingDate
                    ).startOf('day');
                    const today = dayjs().startOf('day');
                    daysUntilBooking = bookingDate.diff(today, 'day');
                    bookingDateFormatted = `${studioBooking.bookingDate} | ${studioBooking.startTime || 'N/A'} - ${studioBooking.endTime || 'N/A'}`;
                  }

                  // Chỉ validate cho nút "Start Task" khi hasStartButton = true
                  if (hasStartButton) {
                    // Check 1: Booking Status
                    // Cho phép start khi booking status là CONFIRMED, IN_PROGRESS, hoặc COMPLETED
                    if (
                      bookingStatus !== 'CONFIRMED' &&
                      bookingStatus !== 'IN_PROGRESS' &&
                      bookingStatus !== 'COMPLETED'
                    ) {
                      canStartWithBooking = false;
                      bookingStatusMessage = `Studio booking chưa được xác nhận. Trạng thái hiện tại: ${studioBooking.status === 'PENDING' ? 'Đang chờ' : studioBooking.status === 'TENTATIVE' ? 'Tạm thời' : studioBooking.status}. Vui lòng đợi Manager xác nhận booking.`;
                    }

                    // Check 2: Thời gian
                    if (studioBooking.bookingDate && canStartWithBooking) {
                      // Quá sớm: > 7 ngày trước booking date
                      if (daysUntilBooking > 7) {
                        canStartWithBooking = false;
                        bookingStatusMessage = `Chưa thể bắt đầu task. Recording session sẽ diễn ra vào ${bookingDateFormatted}. Bạn có thể bắt đầu task trong vòng 7 ngày trước ngày thu âm (còn ${daysUntilBooking} ngày).`;
                      }
                      // Quá muộn: > 1 ngày sau booking date
                      else if (daysUntilBooking < -1) {
                        canStartWithBooking = false;
                        bookingStatusMessage = `Recording session đã qua ${Math.abs(daysUntilBooking)} ngày (${bookingDateFormatted}). Vui lòng liên hệ Manager nếu cần hỗ trợ.`;
                      }
                    }
                  }
                }
                const cannotStart =
                  needsStudioBooking ||
                  (hasStudioBooking && hasStartButton && !canStartWithBooking);
                // Cho phép submit khi in_progress, revision_requested hoặc in_revision (không cho submit khi ready_for_review hoặc completed)
                // VÀ không có submission nào đang active (pending_review, approved, delivered, customer_accepted)
                const hasActiveSubmission = submissions.some(sub => {
                  const subStatus = sub.status?.toLowerCase();
                  return (
                    subStatus === 'pending_review' ||
                    subStatus === 'approved' ||
                    subStatus === 'delivered' ||
                    subStatus === 'customer_accepted'
                  );
                });
                const hasSubmitButton =
                  !hasActiveSubmission &&
                  (status === 'in_progress' ||
                    status === 'revision_requested' ||
                    status === 'in_revision') &&
                  status !== 'ready_for_review' &&
                  status !== 'completed';
                // Chỉ cho phép báo issue khi task đang in_progress (đang làm việc)
                // Không cho phép khi đã submit (ready_for_review), đã hoàn thành (completed),
                // đang chờ deliver (delivery_pending), hoặc các trạng thái khác
                // Không cho phép khi có submission đang pending_review
                const hasPendingReviewSubmission = submissions.some(
                  sub => sub.status?.toLowerCase() === 'pending_review'
                );
                // Với recording_supervision task, không hiển thị button báo deadline vì đã có booking date cụ thể
                const hasIssueButton =
                  !isRecordingSupervision &&
                  status === 'in_progress' &&
                  !task.hasIssue &&
                  !hasPendingReviewSubmission &&
                  status !== 'ready_for_review' &&
                  status !== 'delivery_pending' &&
                  status !== 'waiting_customer_review' &&
                  status !== 'completed' &&
                  status !== 'cancelled';

                // Check có ít nhất 1 draft file được chọn (fileStatus = 'uploaded' và không có submissionId)
                const draftFileIds = Array.from(selectedFileIds).filter(
                  fileId => {
                    const file = files.find(f => f.fileId === fileId);
                    return (
                      file &&
                      file.fileStatus === 'uploaded' &&
                      !file.submissionId
                    );
                  }
                );
                const hasFilesToSubmit = draftFileIds.length > 0;
                // Hiển thị Quick Actions nếu có issue alert HOẶC có button nào đó HOẶC có studio booking warning
                const hasAnyAction =
                  hasIssueAlert ||
                  hasAcceptButton ||
                  hasStartButton ||
                  awaitingAlert ||
                  hasSubmitButton ||
                  hasIssueButton ||
                  needsStudioBooking;

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

                      {needsStudioBooking && (
                        <Alert
                          message="Chưa có Studio Booking"
                          description="Task recording supervision này cần có studio booking trước khi bắt đầu làm việc. Vui lòng liên hệ Manager để tạo studio booking cho milestone này."
                          type="warning"
                          showIcon
                        />
                      )}

                      {/* Hiển thị booking info nếu có - CHỈ KHI CHƯA START TASK */}
                      {hasStudioBooking &&
                        studioBooking &&
                        bookingDateFormatted &&
                        (status === 'ready_to_start' ||
                          status === 'accepted_waiting') && (
                          <Alert
                            message={`🎙️ Recording Session: ${bookingDateFormatted}`}
                            description={
                              daysUntilBooking !== null && (
                                <span>
                                  {daysUntilBooking > 0 && (
                                    <span>
                                      Còn{' '}
                                      <strong>{daysUntilBooking} ngày</strong>{' '}
                                      đến ngày thu âm.
                                      {daysUntilBooking <= 7 &&
                                        ' Bạn đã có thể bắt đầu task!'}
                                    </span>
                                  )}
                                  {daysUntilBooking === 0 && (
                                    <span>
                                      <strong>Hôm nay là ngày thu âm!</strong>{' '}
                                      Sẵn sàng bắt đầu task.
                                    </span>
                                  )}
                                  {daysUntilBooking < 0 &&
                                    daysUntilBooking >= -1 && (
                                      <span>
                                        Ngày thu âm đã qua{' '}
                                        {Math.abs(daysUntilBooking)} ngày. Vẫn
                                        có thể bắt đầu task.
                                      </span>
                                    )}
                                  {studioBooking.durationHours && (
                                    <span>
                                      {' '}
                                      • Thời lượng:{' '}
                                      {studioBooking.durationHours}h
                                    </span>
                                  )}
                                  {studioBooking.status && (
                                    <span>
                                      {' '}
                                      • Trạng thái: {studioBooking.status}
                                    </span>
                                  )}
                                </span>
                              )
                            }
                            type={
                              canStartWithBooking &&
                              daysUntilBooking !== null &&
                              daysUntilBooking <= 7 &&
                              daysUntilBooking >= -1
                                ? 'success'
                                : 'info'
                            }
                            showIcon
                          />
                        )}

                      {hasStudioBooking &&
                        !canStartWithBooking &&
                        bookingStatusMessage && (
                          <Alert
                            message="Chưa thể bắt đầu task"
                            description={bookingStatusMessage}
                            type="warning"
                            showIcon
                          />
                        )}

                      {(hasAcceptButton ||
                        hasStartButton ||
                        hasSubmitButton ||
                        hasIssueButton) && (
                        <Space direction="vertical" style={{ width: '100%' }}>
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
                                disabled={!hasFilesToSubmit}
                                loading={submittingForReview}
                              >
                                Submit for Review
                              </Button>
                            )}
                            {hasStartButton && !needsStudioBooking && (
                              <Button
                                type="primary"
                                onClick={handleStartTask}
                                disabled={!canStartWithBooking}
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
                          {hasSubmitButton && task?.taskType && (
                            <Alert
                              message="File types allowed for submission"
                              description={(() => {
                                const taskType = task.taskType?.toLowerCase();
                                if (taskType === 'transcription') {
                                  return (
                                    <Text type="secondary">
                                      Notation files only: MusicXML, XML, MIDI,
                                      PDF
                                    </Text>
                                  );
                                } else if (
                                  taskType === 'arrangement' ||
                                  taskType === 'arrangement_with_recording'
                                ) {
                                  return (
                                    <Text type="secondary">
                                      Notation files (MusicXML, XML, MIDI, PDF)
                                      or Audio files (MP3, WAV, FLAC, AAC, OGG,
                                      M4A, WMA)
                                    </Text>
                                  );
                                } else if (
                                  taskType === 'recording_supervision'
                                ) {
                                  return (
                                    <Text type="secondary">
                                      Audio files only: MP3, WAV, FLAC, AAC,
                                      OGG, M4A, WMA
                                    </Text>
                                  );
                                }
                                return null;
                              })()}
                              type="info"
                              showIcon
                              style={{ marginTop: 8 }}
                            />
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

      {/* Khối 1: Draft Files */}
      {(() => {
        // Kiểm tra xem có submission nào đang active (pending_review, approved, delivered, customer_accepted)
        const hasActiveSubmission = submissions.some(sub => {
          const subStatus = sub.status?.toLowerCase();
          return (
            subStatus === 'pending_review' ||
            subStatus === 'approved' ||
            subStatus === 'delivered' ||
            subStatus === 'customer_accepted'
          );
        });

        // Ẩn Draft Files card khi có active submission (giống logic submit button)
        // Chỉ hiển thị khi task status hợp lệ VÀ không có active submission
        const shouldShowDraftFiles =
          (task.status?.toLowerCase() === 'in_progress' ||
            task.status?.toLowerCase() === 'revision_requested' ||
            task.status?.toLowerCase() === 'in_revision') &&
          !hasActiveSubmission;

        if (!shouldShowDraftFiles) return null;

        // Chỉ hiển thị button upload khi:
        // 1. Task status hợp lệ (không phải assigned, accepted_waiting, ready_to_start, delivery_pending, waiting_customer_review, cancelled, ready_for_review, completed)
        // 2. Không có submission nào đang active (đang chờ review hoặc đã được approve/deliver)
        const canUpload =
          task.status?.toLowerCase() !== 'assigned' &&
          task.status?.toLowerCase() !== 'accepted_waiting' &&
          task.status?.toLowerCase() !== 'ready_to_start' &&
          task.status?.toLowerCase() !== 'delivery_pending' &&
          task.status?.toLowerCase() !== 'waiting_customer_review' &&
          task.status?.toLowerCase() !== 'cancelled' &&
          task.status?.toLowerCase() !== 'ready_for_review' &&
          task.status?.toLowerCase() !== 'completed' &&
          !hasActiveSubmission;

        return (
          <Card
            className={styles.section}
            title="Draft Files (chưa submit)"
            extra={
              canUpload ? (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={handleOpenUploadModal}
                >
                  Upload new version
                </Button>
              ) : null
            }
          >
            {draftFiles.length > 0 ? (
              <Table
                rowKey="fileId"
                dataSource={draftFiles.sort((a, b) => {
                  const dateA = new Date(a.uploadDate || 0);
                  const dateB = new Date(b.uploadDate || 0);
                  return dateB - dateA; // Sort by newest first
                })}
                columns={draftFileColumns}
                pagination={false}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có draft files. Upload file để bắt đầu."
              />
            )}
          </Card>
        );
      })()}

      {/* Khối 2: Current Submission */}
      {currentSubmission &&
        (() => {
          const revisedRevision = getRevisionRequestForRevisedSubmission(
            currentSubmission.submissionId
          );
          return (
            <Card
              className={styles.section}
              title={
                <Space>
                  <Text strong>
                    {currentSubmission.status?.toLowerCase() === 'rejected'
                      ? `Submission #${currentSubmission.version} – Revision Requested (Manager yêu cầu chỉnh sửa)`
                      : revisedRevision
                        ? `Current review – Submission #${currentSubmission.version} (Revision Round #${revisedRevision.revisionRound})`
                        : `Current review – Submission #${currentSubmission.version}`}
                  </Text>
                  {revisedRevision && (
                    <Tag color="purple">
                      Revision Round #{revisedRevision.revisionRound}
                    </Tag>
                  )}
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
                currentSubmission.status?.toLowerCase() === 'rejected' &&
                currentSubmission.rejectionReason && (
                  <Button
                    size="small"
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => {
                      setRejectionReasonToView(
                        currentSubmission.rejectionReason
                      );
                      setRejectionModalVisible(true);
                    }}
                  >
                    View reason
                  </Button>
                )
              }
            >
              {currentSubmission.files && currentSubmission.files.length > 0 ? (
                <Table
                  rowKey="fileId"
                  dataSource={currentSubmission.files}
                  columns={currentSubmissionFileColumns}
                  pagination={false}
                />
              ) : (
                <Empty description="Không có files trong submission này" />
              )}
            </Card>
          );
        })()}

      {/* Revision Requests */}
      {revisionRequests.length > 0 && (
        <Card
          className={styles.section}
          title={
            <Space>
              <Text strong>Revision Requests</Text>
              <Tag color="orange">{revisionRequests.length}</Tag>
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadRevisionRequests(task.assignmentId)}
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
                  >
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Title">
                        <Text strong>{revision.title}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Description">
                        <Text>{revision.description}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={statusColors[status] || 'default'}>
                          {statusLabels[status] || status}
                        </Tag>
                      </Descriptions.Item>
                      {revision.originalSubmissionId && (
                        <Descriptions.Item label="Original Submission">
                          <Text>
                            Version{' '}
                            {submissions.find(
                              s =>
                                s.submissionId === revision.originalSubmissionId
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
                                s.submissionId === revision.revisedSubmissionId
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
                          {formatDateTime(revision.requestedAt)}
                        </Descriptions.Item>
                      )}
                      {revision.managerReviewedAt && (
                        <Descriptions.Item label="Manager Reviewed At">
                          {formatDateTime(revision.managerReviewedAt)}
                        </Descriptions.Item>
                      )}
                      {revision.revisionDueAt && (
                        <Descriptions.Item label="Revision Deadline">
                          <Space>
                            <Text strong>
                              {formatDateTime(revision.revisionDueAt)}
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
                          <Text>{revision.managerNote}</Text>
                        </Descriptions.Item>
                      )}
                      {revision.specialistSubmittedAt && (
                        <Descriptions.Item label="Specialist Submitted At">
                          {formatDateTime(revision.specialistSubmittedAt)}
                        </Descriptions.Item>
                      )}
                      {revision.customerConfirmedAt && (
                        <Descriptions.Item label="Customer Confirmed At">
                          {formatDateTime(revision.customerConfirmedAt)}
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

      {/* Khối 3: Previous Submissions (History) */}
      {previousSubmissions.length > 0 && (
        <Card className={styles.section} title="Previous submissions (History)">
          <Collapse>
            {previousSubmissions.map(submission => {
              const submissionStatus = submission.status?.toLowerCase();
              const files = submission.files || [];
              const revisedRevision = getRevisionRequestForRevisedSubmission(
                submission.submissionId
              );

              return (
                <Collapse.Panel
                  key={submission.submissionId}
                  header={
                    <Space>
                      <Text strong>
                        Submission #{submission.version}
                        {revisedRevision &&
                          ` (Revision Round #${revisedRevision.revisionRound})`}
                      </Text>
                      {revisedRevision && (
                        <Tag color="purple">
                          Revision Round #{revisedRevision.revisionRound}
                        </Tag>
                      )}
                      <Tag
                        color={
                          SUBMISSION_STATUS_COLORS[submissionStatus] ||
                          'default'
                        }
                      >
                        {SUBMISSION_STATUS_LABELS[submissionStatus] ||
                          submission.status}
                      </Tag>
                      {submission.submittedAt && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Submitted: {formatDateTime(submission.submittedAt)}
                        </Text>
                      )}
                      {submissionStatus === 'rejected' &&
                        submission.rejectionReason && (
                          <Button
                            size="small"
                            type="link"
                            icon={<ExclamationCircleOutlined />}
                            onClick={e => {
                              e.stopPropagation(); // để không làm toggle panel khi bấm nút
                              setRejectionReasonToView(
                                submission.rejectionReason
                              );
                              setRejectionModalVisible(true);
                            }}
                          >
                            View reason
                          </Button>
                        )}
                    </Space>
                  }
                >
                  {files.length > 0 ? (
                    <Table
                      rowKey="fileId"
                      dataSource={files}
                      columns={historyFileColumns}
                      pagination={false}
                    />
                  ) : (
                    <Empty description="Không có files trong submission này" />
                  )}
                </Collapse.Panel>
              );
            })}
          </Collapse>
        </Card>
      )}

      {/* Notation Editor link - Ẩn cho recording_supervision task */}
      {task?.taskType?.toLowerCase() === 'transcription' && (
        <Card className={styles.section} title="Open in Notation Editor">
          <Space direction="vertical">
            <Text>Use the full transcription editor to work on this task.</Text>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`${basePath}/edit-tool`)}
            >
              Open Editor
            </Button>
          </Space>
        </Card>
      )}

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
            valuePropName="fileList"
            getValueFromEvent={e => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
            rules={[
              { required: true, message: 'Please select a file' },
              {
                validator: (_, value) => {
                  // value là fileList từ Upload component
                  const fileList = value || [];

                  if (fileList.length === 0 || !selectedFile) {
                    return Promise.reject(new Error('Please select a file'));
                  }

                  const fileName = selectedFile.name?.toLowerCase() || '';
                  const taskType = task?.taskType?.toLowerCase();

                  // Define allowed extensions for each task type
                  const notationExts = [
                    '.musicxml',
                    '.xml',
                    '.mid',
                    '.midi',
                    '.pdf',
                  ];
                  const audioExts = [
                    '.mp3',
                    '.wav',
                    '.flac',
                    '.aac',
                    '.ogg',
                    '.m4a',
                    '.wma',
                  ];

                  let allowedExts = [];
                  let allowedTypes = '';

                  if (taskType === 'transcription') {
                    allowedExts = notationExts;
                    allowedTypes = 'notation files (MusicXML, XML, MIDI, PDF)';
                  } else if (
                    taskType === 'arrangement' ||
                    taskType === 'arrangement_with_recording'
                  ) {
                    allowedExts = [...notationExts, ...audioExts];
                    allowedTypes = 'notation or audio files';
                  } else if (
                    taskType === 'recording_session' ||
                    taskType === 'recording_supervision'
                  ) {
                    allowedExts = audioExts;
                    allowedTypes = 'audio files (MP3, WAV, FLAC, etc.)';
                  } else {
                    return Promise.resolve(); // Unknown task type, let backend validate
                  }

                  const hasValidExt = allowedExts.some(ext =>
                    fileName.endsWith(ext)
                  );

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
              beforeUpload={file => {
                // Validate file type ngay khi chọn file
                const fileName = file.name?.toLowerCase() || '';
                const taskType = task?.taskType?.toLowerCase();

                // Define allowed extensions for each task type
                const notationExts = [
                  '.musicxml',
                  '.xml',
                  '.mid',
                  '.midi',
                  '.pdf',
                ];
                const audioExts = [
                  '.mp3',
                  '.wav',
                  '.flac',
                  '.aac',
                  '.ogg',
                  '.m4a',
                  '.wma',
                ];

                let allowedExts = [];
                let allowedTypes = '';

                if (taskType === 'transcription') {
                  allowedExts = notationExts;
                  allowedTypes = 'notation files (MusicXML, XML, MIDI, PDF)';
                } else if (
                  taskType === 'arrangement' ||
                  taskType === 'arrangement_with_recording'
                ) {
                  allowedExts = [...notationExts, ...audioExts];
                  allowedTypes = 'notation or audio files';
                } else if (
                  taskType === 'recording_session' ||
                  taskType === 'recording_supervision'
                ) {
                  allowedExts = audioExts;
                  allowedTypes = 'audio files (MP3, WAV, FLAC, etc.)';
                } else {
                  // Unknown task type, let backend validate
                  return false; // Prevent auto upload
                }

                const hasValidExt = allowedExts.some(ext =>
                  fileName.endsWith(ext)
                );

                if (!hasValidExt) {
                  message.error(
                    `File type not allowed for ${taskType} task. Only ${allowedTypes} are allowed.`
                  );
                  return false; // Reject file - will not be added to fileList
                }

                return false; // Prevent auto upload, we'll handle it manually
              }}
              accept={(() => {
                const taskType = task?.taskType?.toLowerCase();
                if (taskType === 'transcription') {
                  return '.musicxml,.xml,.mid,.midi,.pdf';
                } else if (
                  taskType === 'arrangement' ||
                  taskType === 'arrangement_with_recording'
                ) {
                  return '.musicxml,.xml,.mid,.midi,.pdf,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma';
                } else if (
                  taskType === 'recording_session' ||
                  taskType === 'recording_supervision'
                ) {
                  return '.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma';
                }
                // Default: allow all for unknown task types
                return '.musicxml,.xml,.mid,.midi,.pdf,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma';
              })()}
              onChange={info => {
                // Khi user chọn file, lưu vào state để hiển thị
                const file =
                  info.fileList.length > 0
                    ? info.fileList[0].originFileObj || info.fileList[0]
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
                    {(() => {
                      const taskType = task?.taskType?.toLowerCase();
                      if (taskType === 'transcription') {
                        return 'Only notation files allowed: MusicXML, XML, MIDI, PDF';
                      } else if (
                        taskType === 'recording_session' ||
                        taskType === 'recording_supervision'
                      ) {
                        return 'Only audio files allowed: MP3, WAV, FLAC, etc.';
                      } else if (
                        taskType === 'arrangement' ||
                        taskType === 'arrangement_with_recording'
                      ) {
                        return 'Support: Notation (MusicXML, MIDI, PDF) or Audio files';
                      }
                      return 'Support: Notation (MusicXML, MIDI, PDF) or Audio files';
                    })()}
                  </p>
                </>
              ) : (
                <div style={{ padding: '20px 0' }}>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%', textAlign: 'center' }}
                  >
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
      {/* Modal xác nhận xóa file */}
      <Modal
        open={deleteModalVisible}
        title="Xác nhận xóa file"
        onOk={handleConfirmDeleteFile}
        onCancel={handleCancelDeleteFile}
        okText="Xóa"
        okType="danger"
        cancelText="Hủy"
        confirmLoading={deletingFile}
      >
        <Text>
          Bạn có chắc chắn muốn xóa file này? File sẽ bị xóa và không thể
          submit.
        </Text>
      </Modal>
      {/* Modal xem lý do reject */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Manager&apos;s rejection reason</span>
          </Space>
        }
        open={rejectionModalVisible}
        footer={
          <Button onClick={() => setRejectionModalVisible(false)}>Close</Button>
        }
        onCancel={() => setRejectionModalVisible(false)}
        width={600}
      >
        {rejectionReasonToView ? (
          <Alert
            type="warning"
            showIcon
            message="Submission was rejected"
            description={
              <Text style={{ whiteSpace: 'pre-wrap' }}>
                {rejectionReasonToView}
              </Text>
            }
          />
        ) : (
          <Text type="secondary">No rejection reason available.</Text>
        )}
      </Modal>
    </div>
  );
};

export default SpecialistTaskDetailPage;
