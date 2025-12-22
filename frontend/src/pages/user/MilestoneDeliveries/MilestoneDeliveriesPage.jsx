import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Empty,
  List,
  Modal,
  Input,
  Popconfirm,
  Alert,
  Descriptions,
  Divider,
  Collapse,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  ReloadOutlined,
  DollarOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getDeliveredSubmissionsByMilestone,
  customerReviewSubmission,
} from '../../../services/fileSubmissionService';
import { getStudioBookings } from '../../../services/studioBookingService';
import { getServiceRequestById } from '../../../services/serviceRequestService';
import { getContractRevisionStats } from '../../../services/revisionRequestService';
import axiosInstance from '../../../utils/axiosInstance';
import Header from '../../../components/common/Header/Header';
import ChatPopup from '../../../components/chat/ChatPopup/ChatPopup';
import styles from './MilestoneDeliveriesPage.module.css';
import { useDocumentTitle } from '../../../hooks';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SUBMISSION_STATUS_COLORS = {
  delivered: 'green',
  revision_requested: 'orange',
  customer_accepted: 'success',
  customer_rejected: 'error',
};

const SUBMISSION_STATUS_LABELS = {
  delivered: 'Đã gửi',
  revision_requested: 'Yêu cầu chỉnh sửa',
  customer_accepted: 'Đã chấp nhận',
  customer_rejected: 'Đã từ chối - Yêu cầu chỉnh sửa',
};

// Contract Status
const CONTRACT_STATUS_COLORS = {
  draft: 'default',
  sent: 'geekblue',
  approved: 'green',
  signed: 'orange',
  active_pending_assignment: 'gold',
  active: 'green',
  completed: 'success',
  rejected_by_customer: 'red',
  need_revision: 'orange',
  canceled_by_customer: 'default',
  canceled_by_manager: 'volcano',
  expired: 'volcano',
};

const CONTRACT_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  signed: 'Signed - Pending deposit payment',
  active_pending_assignment: 'Deposit paid - Pending assignment',
  active: 'Active',
  completed: 'Completed',
  rejected_by_customer: 'Rejected by customer',
  need_revision: 'Needs revision',
  canceled_by_customer: 'Canceled by customer',
  canceled_by_manager: 'Canceled by manager',
  expired: 'Expired',
};

// Booking Status
const BOOKING_STATUS_COLORS = {
  TENTATIVE: 'default',
  PENDING: 'processing',
  CONFIRMED: 'success',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const BOOKING_STATUS_LABELS = {
  TENTATIVE: 'Tentative',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Installment Status
const INSTALLMENT_STATUS_COLORS = {
  PENDING: 'default',
  DUE: 'orange',
  PAID: 'success',
  OVERDUE: 'error',
};

const INSTALLMENT_STATUS_LABELS = {
  PENDING: 'Pending',
  DUE: 'Due',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
};

const MilestoneDeliveriesPage = () => {
  useDocumentTitle('Milestone Deliveries');
  const { contractId, milestoneId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);
  const [requestInfoLoading, setRequestInfoLoading] = useState(false);
  const [studioBooking, setStudioBooking] = useState(null);
  const [studioBookingLoading, setStudioBookingLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewAction, setReviewAction] = useState(''); // 'accept' or 'request_revision'
  const [revisionTitle, setRevisionTitle] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionRequests, setRevisionRequests] = useState([]); // Track revision requests để check xem đã request chưa
  const [revisionStats, setRevisionStats] = useState(null); // Thống kê free/paid revisions của contract

  const milestoneName =
    milestoneInfo?.name || location.state?.milestoneName || 'Milestone';

  useEffect(() => {
    if (contractId && milestoneId) {
      loadDeliveries();
    }
  }, [contractId, milestoneId]);

  const loadRequestInfo = async requestId => {
    if (!requestId) return;

    try {
      setRequestInfoLoading(true);
      const response = await getServiceRequestById(requestId);

      if (response?.status === 'success' && response?.data) {
        setRequestInfo(response.data);
      } else {
        setRequestInfo(null);
      }
    } catch (error) {
      console.error('Error loading request info:', error);
      // Không hiển thị error message vì đây là lazy load, không ảnh hưởng đến chức năng chính
      setRequestInfo(null);
    } finally {
      setRequestInfoLoading(false);
    }
  };

  const loadRevisionStats = async contractId => {
    try {
      const response = await getContractRevisionStats(contractId);
      if (response?.status === 'success' && response?.data) {
        setRevisionStats(response.data);
      } else {
        setRevisionStats(null);
      }
    } catch (error) {
      console.error('Error loading revision stats:', error);
      // Không hiển thị error message vì đây là lazy load, không ảnh hưởng đến chức năng chính
      setRevisionStats(null);
    }
  };

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await getDeliveredSubmissionsByMilestone(
        milestoneId,
        contractId
      );

      if (response?.status === 'success' && response?.data) {
        const data = response.data;
        setContractInfo(data.contract);
        setMilestoneInfo(data.milestone);

        // Lazy load request info nếu có requestId
        if (data.contract?.requestId) {
          loadRequestInfo(data.contract.requestId);
        } else {
          setRequestInfo(null);
        }

        // Load studio booking cho recording milestone (nếu có)
        if (data.milestone?.milestoneType === 'recording') {
          try {
            setStudioBookingLoading(true);
            const bookingResp = await getStudioBookings(
              data.contract?.contractId || contractId,
              data.milestone.milestoneId,
              null
            );
            if (
              bookingResp?.status === 'success' &&
              Array.isArray(bookingResp.data) &&
              bookingResp.data.length > 0
            ) {
              setStudioBooking(bookingResp.data[0]);
            } else {
              setStudioBooking(null);
            }
          } catch (e) {
            console.error('Error loading studio booking for deliveries:', e);
            setStudioBooking(null);
          } finally {
            setStudioBookingLoading(false);
          }
        } else {
          setStudioBooking(null);
        }

        // Load revision stats của contract (để tính free/paid revisions chính xác)
        loadRevisionStats(contractId);

        // Revision requests đã được load từ backend trong response
        const allRevisionRequests = Array.isArray(data.revisionRequests)
          ? data.revisionRequests
          : [];
        setRevisionRequests(allRevisionRequests);

        // Không filter submissions - hiển thị tất cả submissions đã delivered
        // Logic ẩn nút sẽ được xử lý trong phần render, không ẩn submission
        const allSubmissions = Array.isArray(data.submissions)
          ? data.submissions
          : [];
        setSubmissions(allSubmissions);
      } else {
        setContractInfo(null);
        setMilestoneInfo(null);
        setRequestInfo(null);
        setStudioBooking(null);
        setSubmissions([]);
        setRevisionRequests([]);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi tải danh sách deliveries'
      );
      setContractInfo(null);
      setMilestoneInfo(null);
      setRequestInfo(null);
      setStudioBooking(null);
      setSubmissions([]);
      setRevisionRequests([]);
    } finally {
      setLoading(false);
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
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('Error downloading file');
    }
  };

  const handlePreviewFile = async file => {
    try {
      // Fetch file với authentication header
      const url = `/api/v1/projects/files/preview/${file.fileId}`;
      const response = await axiosInstance.get(url, {
        responseType: 'blob',
      });

      // Tạo blob URL từ response
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream',
      });
      const blobUrl = window.URL.createObjectURL(blob);

      // Mở file trong tab mới
      const previewWindow = window.open(blobUrl, '_blank');

      // Cleanup blob URL sau khi window đóng (optional)
      if (previewWindow) {
        previewWindow.addEventListener('beforeunload', () => {
          window.URL.revokeObjectURL(blobUrl);
        });
      } else {
        // Nếu popup bị block, cleanup ngay
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi xem file');
    }
  };

  const handleOpenReviewModal = (submission, action) => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setRevisionTitle('');
    setRevisionDescription('');
    setReviewModalVisible(true);
  };

  const handleReviewSubmission = async () => {
    if (!selectedSubmission) return;

    if (reviewAction === 'request_revision') {
      if (!revisionTitle.trim()) {
        message.warning('Vui lòng nhập tiêu đề yêu cầu chỉnh sửa');
        return;
      }
      if (!revisionDescription.trim()) {
        message.warning('Vui lòng nhập mô tả chi tiết yêu cầu chỉnh sửa');
        return;
      }
    }

    try {
      setActionLoading(true);
      const response = await customerReviewSubmission(
        selectedSubmission.submissionId,
        reviewAction,
        reviewAction === 'request_revision' ? revisionTitle : '',
        reviewAction === 'request_revision' ? revisionDescription : ''
      );

      // Response từ service đã là ApiResponse object (response.data từ axios)
      if (response?.status === 'success') {
        message.success(
          reviewAction === 'accept'
            ? 'Đã chấp nhận submission'
            : 'Đã yêu cầu chỉnh sửa submission'
        );
        setReviewModalVisible(false);
        setSelectedSubmission(null);
        setRevisionTitle('');
        setRevisionDescription('');
        await loadDeliveries();
        // Reload revision stats để cập nhật số lượng free/paid revisions sau khi review
        if (contractId) {
          await loadRevisionStats(contractId);
        }
      } else {
        // Nếu status không phải success, hiển thị lỗi
        message.error(response?.message || 'Lỗi khi review submission');
      }
    } catch (error) {
      console.error('Error reviewing submission:', error);
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          'Lỗi khi review submission'
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/contracts/${contractId}`)}
              style={{ marginBottom: 16 }}
            >
              Back to Contract
            </Button>
            <Button
              type="primary"
              onClick={() => navigate(`/contracts/${contractId}`)}
              style={{ marginBottom: 16 }}
            >
              View Contract Detail
            </Button>
          </Space>
          <Title level={3} style={{ margin: 0 }}>
            Deliveries for {milestoneName}
          </Title>
        </div>

        {/* Contract & Milestone Info */}
        {contractInfo && milestoneInfo && (
          <Card
            title="Contract & Milestone Information"
            style={{ marginBottom: 24 }}
          >
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Contract Number">
                <Text strong>{contractInfo.contractNumber || contractId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contract Type">
                <Tag color="blue">
                  {contractInfo.contractType?.toUpperCase() || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Name">
                <Text strong>{milestoneInfo.name || 'N/A'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Type">
                <Tag color="purple">
                  {milestoneInfo.milestoneType === 'transcription'
                    ? 'Transcription'
                    : milestoneInfo.milestoneType === 'arrangement'
                      ? 'Arrangement'
                      : milestoneInfo.milestoneType === 'recording'
                        ? 'Recording'
                        : milestoneInfo.milestoneType?.toUpperCase() || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Milestone Status">
                <Space>
                  <Tag
                    color={
                      milestoneInfo.workStatus === 'WAITING_CUSTOMER'
                        ? 'warning'
                        : milestoneInfo.workStatus === 'READY_FOR_PAYMENT'
                          ? 'gold'
                          : milestoneInfo.workStatus === 'COMPLETED'
                            ? 'success'
                            : milestoneInfo.workStatus === 'IN_PROGRESS'
                              ? 'processing'
                              : milestoneInfo.workStatus ===
                                  'WAITING_ASSIGNMENT'
                                ? 'orange'
                                : milestoneInfo.workStatus ===
                                    'WAITING_SPECIALIST_ACCEPT'
                                  ? 'gold'
                                  : milestoneInfo.workStatus ===
                                      'TASK_ACCEPTED_WAITING_ACTIVATION'
                                    ? 'lime'
                                    : milestoneInfo.workStatus ===
                                        'READY_TO_START'
                                      ? 'cyan'
                                      : 'default'
                    }
                  >
                    {milestoneInfo.workStatus === 'WAITING_CUSTOMER'
                      ? 'Waiting customer response'
                      : milestoneInfo.workStatus === 'READY_FOR_PAYMENT'
                        ? 'Ready to pay'
                        : milestoneInfo.workStatus === 'COMPLETED'
                          ? 'Completed'
                          : milestoneInfo.workStatus === 'IN_PROGRESS'
                            ? 'In progress'
                            : milestoneInfo.workStatus === 'WAITING_ASSIGNMENT'
                              ? 'Waiting assign task'
                              : milestoneInfo.workStatus ===
                                  'WAITING_SPECIALIST_ACCEPT'
                                ? 'Waiting specialist accept'
                                : milestoneInfo.workStatus ===
                                    'TASK_ACCEPTED_WAITING_ACTIVATION'
                                  ? 'Accepted, waiting activate'
                                  : milestoneInfo.workStatus ===
                                      'READY_TO_START'
                                    ? 'Ready to start'
                                    : milestoneInfo.workStatus || 'N/A'}
                  </Tag>
                  {/* Chỉ hiển thị nút "Thanh toán" khi milestone READY_FOR_PAYMENT/COMPLETED VÀ installment chưa PAID */}
                  {(milestoneInfo.workStatus === 'READY_FOR_PAYMENT' ||
                    milestoneInfo.workStatus === 'COMPLETED') &&
                    milestoneInfo.installmentStatus !== 'PAID' && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<DollarOutlined />}
                        onClick={() =>
                          navigate(`/contracts/${contractId}/pay-milestone`, {
                            state: {
                              milestoneId: milestoneInfo.milestoneId,
                              contractId: contractId,
                            },
                          })
                        }
                      >
                        Pay
                      </Button>
                    )}
                  {/* Hiển thị tag "Đã thanh toán" nếu installment đã PAID */}
                  {milestoneInfo.installmentStatus && (
                    <Tag
                      color={
                        INSTALLMENT_STATUS_COLORS[
                          milestoneInfo.installmentStatus
                        ] || 'default'
                      }
                    >
                      {INSTALLMENT_STATUS_LABELS[
                        milestoneInfo.installmentStatus
                      ] || milestoneInfo.installmentStatus}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              {milestoneInfo.description && (
                <Descriptions.Item label="Description" span={2}>
                  <Text>{milestoneInfo.description}</Text>
                </Descriptions.Item>
              )}
              {/* Timeline Information */}
              <Descriptions.Item label="Timeline" span={2}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {/* Planned Dates */}
                  <div>
                    <Text strong type="secondary" style={{ fontSize: 12 }}>
                      Planned Date:
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      {milestoneInfo.targetDeadline ? (
                        <Text>
                          Completed:{' '}
                          {dayjs(milestoneInfo.targetDeadline).format(
                            'DD/MM/YYYY'
                          )}
                        </Text>
                      ) : (
                        <Text type="secondary" italic>
                          No planned date
                        </Text>
                      )}
                    </div>
                    {/* SLA status (backend-computed): first submission on-time/late */}
                    <div style={{ marginTop: 8 }}>
                      {milestoneInfo.firstSubmissionAt &&
                        milestoneInfo.firstSubmissionLate != null && (
                          <Tag
                            color={
                              milestoneInfo.firstSubmissionLate
                                ? 'red'
                                : 'green'
                            }
                          >
                            {milestoneInfo.firstSubmissionLate
                              ? 'Late submission (first version)'
                              : 'On time submission (first version)'}
                          </Tag>
                        )}
                      {!milestoneInfo.firstSubmissionAt &&
                        milestoneInfo.overdueNow === true && (
                          <Tag color="red">Overdue (not submitted)</Tag>
                        )}
                    </div>
                  </div>
                  {/* Actual Dates */}
                  {(milestoneInfo.actualStartAt ||
                    milestoneInfo.firstSubmissionAt ||
                    milestoneInfo.finalCompletedAt ||
                    milestoneInfo.actualEndAt) && (
                    <div>
                      <Text strong style={{ fontSize: 12 }}>
                        Actual Time:
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        {milestoneInfo.actualStartAt && (
                          <div>
                            <Text>
                              Start:{' '}
                              {dayjs(milestoneInfo.actualStartAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Text>
                          </div>
                        )}
                        {milestoneInfo.firstSubmissionAt && (
                          <div>
                            <Text>
                              First submission:{' '}
                              {dayjs(milestoneInfo.firstSubmissionAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Text>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                display: 'block',
                                marginTop: 2,
                              }}
                            >
                              (First time specialist assigned work)
                            </Text>
                          </div>
                        )}
                        {milestoneInfo.finalCompletedAt && (
                          <div>
                            <Text>
                              Work Completed:{' '}
                              {dayjs(milestoneInfo.finalCompletedAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Text>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                display: 'block',
                                marginTop: 2,
                              }}
                            >
                              (Customer accepted work)
                            </Text>
                          </div>
                        )}
                        {milestoneInfo.actualEndAt && (
                          <div>
                            <Text>
                              Payment Completed:{' '}
                              {dayjs(milestoneInfo.actualEndAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Text>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 11,
                                display: 'block',
                                marginTop: 2,
                              }}
                            >
                              (Milestone paid)
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Total Submissions">
                <Text strong>{submissions.length}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total Files">
                <Text strong>
                  {submissions.reduce(
                    (total, sub) => total + (sub.files?.length || 0),
                    0
                  )}
                </Text>
              </Descriptions.Item>
              {contractInfo.freeRevisionsIncluded != null && revisionStats && (
                <>
                  <Descriptions.Item label="Free Revisions Included">
                    <Text strong>{revisionStats.freeRevisionsIncluded}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Revisions Used">
                    <Text strong>
                      {revisionStats.totalRevisionsUsed} /{' '}
                      {revisionStats.freeRevisionsIncluded} (Free)
                    </Text>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        display: 'block',
                        marginTop: 4,
                      }}
                    >
                      Used {revisionStats.freeRevisionsUsed} times for free
                      revision, {revisionStats.paidRevisionsUsed} times for paid
                      revision
                    </Text>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        )}

        {/* Request Info */}
        {contractInfo?.requestId && (
          <Card
            title="Request Information"
            extra={
              <Button
                type="link"
                onClick={() => navigate(`/contracts/${contractId}`)}
              >
                View Contract Detail
              </Button>
            }
            style={{ marginBottom: 24 }}
            loading={requestInfoLoading}
          >
            {requestInfo ? (
              <>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Request ID">
                    <Text strong>{requestInfo.requestId || 'N/A'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Service Type">
                    <Tag color="purple">
                      {(
                        requestInfo.requestType || requestInfo.serviceType
                      )?.toUpperCase() || 'N/A'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Title" span={2}>
                    <Text strong>{requestInfo.title || 'N/A'}</Text>
                  </Descriptions.Item>
                  {requestInfo.description && (
                    <Descriptions.Item label="Description" span={2}>
                      <Text>{requestInfo.description}</Text>
                    </Descriptions.Item>
                  )}
                  {(requestInfo.durationMinutes ||
                    requestInfo.durationSeconds) && (
                    <Descriptions.Item label="Duration">
                      <Text>
                        {requestInfo.durationMinutes
                          ? `${Math.floor(requestInfo.durationMinutes)} phút ${Math.round((requestInfo.durationMinutes % 1) * 60)} giây`
                          : `${Math.floor((requestInfo.durationSeconds || 0) / 60)} phút ${(requestInfo.durationSeconds || 0) % 60} giây`}
                      </Text>
                    </Descriptions.Item>
                  )}
                  {(requestInfo.tempoPercentage || requestInfo.tempo) && (
                    <Descriptions.Item label="Tempo">
                      <Text>
                        {requestInfo.tempoPercentage || requestInfo.tempo}%
                      </Text>
                    </Descriptions.Item>
                  )}
                  {requestInfo.instruments &&
                    Array.isArray(requestInfo.instruments) &&
                    requestInfo.instruments.length > 0 && (
                      <Descriptions.Item label="Instruments" span={2}>
                        <Space wrap>
                          {requestInfo.instruments.map((instrument, index) => {
                            const isMain = instrument.isMain === true;
                            const isArrangement =
                              requestInfo.requestType === 'arrangement' ||
                              requestInfo.requestType ===
                                'arrangement_with_recording';
                            return (
                              <Tag
                                key={index}
                                color={
                                  isMain && isArrangement ? 'gold' : 'blue'
                                }
                                icon={
                                  isMain && isArrangement ? (
                                    <StarFilled />
                                  ) : null
                                }
                              >
                                {instrument.instrumentName ||
                                  instrument.name ||
                                  instrument}
                                {isMain && isArrangement && ' (Main)'}
                              </Tag>
                            );
                          })}
                        </Space>
                      </Descriptions.Item>
                    )}
                </Descriptions>

                {/* Customer Uploaded Files - Filter out contract PDF */}
                {requestInfo.files &&
                  Array.isArray(requestInfo.files) &&
                  requestInfo.files.length > 0 &&
                  (() => {
                    // Filter out contract PDF files, only show customer uploaded files
                    const customerFiles = requestInfo.files.filter(
                      file =>
                        file.fileSource !== 'contract_pdf' &&
                        file.contentType !== 'contract_pdf'
                    );

                    if (customerFiles.length === 0) return null;

                    return (
                      <div style={{ marginTop: 16 }}>
                        <Divider orientation="left">Uploaded Files</Divider>
                        <List
                          size="small"
                          dataSource={customerFiles}
                          renderItem={file => {
                            // Handle both object format (from project-service) and string format
                            const fileName =
                              file.fileName || file.name || 'File';
                            const fileId = file.fileId || file;
                            const fileSize = file.fileSize;
                            const mimeType = file.mimeType;

                            return (
                              <List.Item
                                actions={[
                                  <Button
                                    key="preview"
                                    type="link"
                                    icon={<EyeOutlined />}
                                    size="small"
                                    onClick={async () => {
                                      try {
                                        if (
                                          fileId &&
                                          typeof fileId === 'string'
                                        ) {
                                          // Fetch file với authentication header
                                          const url = `/api/v1/projects/files/preview/${fileId}`;
                                          const response =
                                            await axiosInstance.get(url, {
                                              responseType: 'blob',
                                            });

                                          // Tạo blob URL từ response
                                          const blob = new Blob(
                                            [response.data],
                                            {
                                              type:
                                                response.headers[
                                                  'content-type'
                                                ] || 'application/octet-stream',
                                            }
                                          );
                                          const blobUrl =
                                            window.URL.createObjectURL(blob);

                                          // Mở file trong tab mới
                                          const previewWindow = window.open(
                                            blobUrl,
                                            '_blank'
                                          );

                                          // Cleanup blob URL sau khi window đóng
                                          if (previewWindow) {
                                            previewWindow.addEventListener(
                                              'beforeunload',
                                              () => {
                                                window.URL.revokeObjectURL(
                                                  blobUrl
                                                );
                                              }
                                            );
                                          } else {
                                            setTimeout(
                                              () =>
                                                window.URL.revokeObjectURL(
                                                  blobUrl
                                                ),
                                              100
                                            );
                                          }
                                        } else if (file.url) {
                                          window.open(file.url, '_blank');
                                        }
                                      } catch (error) {
                                        console.error(
                                          'Error previewing file:',
                                          error
                                        );
                                        message.error(
                                          error?.response?.data?.message ||
                                            'Error previewing file'
                                        );
                                      }
                                    }}
                                  >
                                    Preview
                                  </Button>,
                                  <Button
                                    key="download"
                                    type="link"
                                    icon={<DownloadOutlined />}
                                    size="small"
                                    onClick={() => {
                                      if (
                                        fileId &&
                                        typeof fileId === 'string'
                                      ) {
                                        handleDownloadFile(fileId, fileName);
                                      } else if (file.url) {
                                        const link =
                                          document.createElement('a');
                                        link.href = file.url;
                                        link.download = fileName;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }
                                    }}
                                  >
                                    Download
                                  </Button>,
                                ]}
                              >
                                <List.Item.Meta
                                  avatar={
                                    <FileOutlined style={{ fontSize: 20 }} />
                                  }
                                  title={fileName}
                                  description={
                                    fileSize
                                      ? `${(fileSize / 1024 / 1024).toFixed(2)} MB`
                                      : mimeType || ''
                                  }
                                />
                              </List.Item>
                            );
                          }}
                        />
                      </div>
                    );
                  })()}
              </>
            ) : (
              <Empty description="Cannot load request information" />
            )}
          </Card>
        )}

        {/* Studio Booking Info - Cho recording milestone */}
        {milestoneInfo?.milestoneType === 'recording' && (
          <Card
            title="Studio Booking Information"
            style={{ marginBottom: 24 }}
            loading={studioBookingLoading}
          >
            {studioBooking ? (
              <Descriptions bordered column={2} size="small">
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
                <Descriptions.Item label="Date">
                  {studioBooking.bookingDate
                    ? dayjs(studioBooking.bookingDate).format('DD/MM/YYYY')
                    : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Time">
                  {studioBooking.startTime && studioBooking.endTime
                    ? `${studioBooking.startTime} - ${studioBooking.endTime}`
                    : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag
                    color={
                      BOOKING_STATUS_COLORS[studioBooking.status] || 'default'
                    }
                  >
                    {BOOKING_STATUS_LABELS[studioBooking.status] ||
                      studioBooking.status ||
                      'N/A'}
                  </Tag>
                </Descriptions.Item>
                {studioBooking.sessionType && (
                  <Descriptions.Item label="Session Type">
                    <Tag color="blue">{studioBooking.sessionType}</Tag>
                  </Descriptions.Item>
                )}
                {/* Participants summary */}
                {studioBooking.participants &&
                  studioBooking.participants.length > 0 && (
                    <Descriptions.Item label="Participants" span={2}>
                      <Space
                        direction="vertical"
                        size={2}
                        style={{ width: '100%' }}
                      >
                        {studioBooking.participants.map((p, idx) => {
                          const roleLabel =
                            p.roleType === 'VOCAL'
                              ? 'Vocal'
                              : p.roleType === 'INSTRUMENT'
                                ? 'Instrument'
                                : p.roleType || 'Participant';

                          // Xác định performer label với tên
                          let performerLabel = '';
                          if (p.performerSource === 'CUSTOMER_SELF') {
                            const customerName = p.name || p.customerName;
                            performerLabel = customerName
                              ? `Customer (self) (${customerName})`
                              : 'Customer (self)';
                          } else if (p.performerSource === 'INTERNAL_ARTIST') {
                            performerLabel =
                              p.specialistName || 'Internal artist';
                          } else if (p.performerSource === 'EXTERNAL_GUEST') {
                            const guestName = p.name;
                            performerLabel = guestName
                              ? `External guest (${guestName})`
                              : 'External guest';
                          } else {
                            performerLabel = p.performerSource || 'Unknown';
                          }

                          const skillLabel = p.skillName
                            ? ` (${p.skillName})`
                            : '';
                          return (
                            <Text key={idx} style={{ fontSize: 12 }}>
                              • {roleLabel} – {performerLabel}
                              {skillLabel}
                            </Text>
                          );
                        })}
                      </Space>
                    </Descriptions.Item>
                  )}
                {/* Equipment summary */}
                {studioBooking.requiredEquipment &&
                  studioBooking.requiredEquipment.length > 0 && (
                    <Descriptions.Item label="Equipment" span={2}>
                      <Space
                        direction="vertical"
                        size={2}
                        style={{ width: '100%' }}
                      >
                        {studioBooking.requiredEquipment.map((eq, idx) => (
                          <Text key={idx} style={{ fontSize: 12 }}>
                            • {eq.equipmentName} × {eq.quantity}
                          </Text>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  )}
              </Descriptions>
            ) : (
              <Text type="secondary">
                No studio booking information available
              </Text>
            )}
          </Card>
        )}

        <Card
          title="Delivered Submissions"
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={loadDeliveries}
              loading={loading}
              size="small"
            >
              Reload
            </Button>
          }
        >
          <Spin spinning={loading}>
            {submissions.length === 0 ? (
              <Empty description="No submissions delivered for this milestone" />
            ) : (
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="large"
              >
                {submissions.map(submission => (
                  <Card
                    key={submission.submissionId}
                    size="small"
                    title={
                      <Space>
                        <Text strong>{submission.submissionName}</Text>
                        <Tag
                          color={
                            SUBMISSION_STATUS_COLORS[
                              submission.status?.toLowerCase()
                            ] || 'default'
                          }
                        >
                          {SUBMISSION_STATUS_LABELS[
                            submission.status?.toLowerCase()
                          ] || submission.status}
                        </Tag>
                      </Space>
                    }
                    extra={
                      <Space>
                        {submission.deliveredAt && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Delivered:{' '}
                            {dayjs(submission.deliveredAt).format(
                              'DD/MM/YYYY HH:mm'
                            )}
                          </Text>
                        )}
                        {(submission.status?.toLowerCase() === 'delivered' ||
                          submission.status?.toLowerCase() ===
                            'customer_accepted' ||
                          submission.status?.toLowerCase() ===
                            'customer_rejected') &&
                          (() => {
                            const submissionId = submission.submissionId;
                            const submissionStatus =
                              submission.status?.toLowerCase();

                            // ƯU TIÊN 1: Nếu submission đã được customer accept → không hiển thị gì ở extra
                            // (status tag đã được hiển thị ở title rồi)
                            if (submissionStatus === 'customer_accepted') {
                              return null;
                            }

                            // ƯU TIÊN 2: Nếu submission đã bị customer reject → không hiển thị gì ở extra
                            // (status tag đã được hiển thị ở title rồi)
                            if (submissionStatus === 'customer_rejected') {
                              return null;
                            }

                            // Tìm TẤT CẢ revision requests liên quan đến submission này
                            // (chỉ cần tính khi submission status là 'delivered')
                            const relatedRevisions = revisionRequests.filter(
                              rr =>
                                rr.originalSubmissionId === submissionId ||
                                rr.revisedSubmissionId === submissionId
                            );

                            // ƯU TIÊN 3: Check xem submission này có đang trong quá trình revision không
                            // Logic đơn giản:
                            // - Nếu submission là originalSubmissionId của revision request đang pending → hiển thị tag "Đã yêu cầu chỉnh sửa - Đang chờ xử lý"
                            // - Nếu không có pending revision → hiển thị nút Accept và Request Revision
                            // Note: Nếu submission là originalSubmissionId và revision request đã completed → submission đã được set thành customer_rejected → đã return ở trên

                            // Nếu có revision requests liên quan, check pending revisions
                            if (relatedRevisions.length > 0) {
                              // Check revision request đang pending
                              const pendingRevision = relatedRevisions.find(
                                rr => {
                                  const status = rr.status?.toUpperCase();
                                  return (
                                    status === 'PENDING_MANAGER_REVIEW' ||
                                    status === 'IN_REVISION' ||
                                    status === 'WAITING_MANAGER_REVIEW' ||
                                    status === 'APPROVED_PENDING_DELIVERY'
                                  );
                                }
                              );

                              // Nếu có revision request đang pending
                              if (pendingRevision) {
                                const isOriginal =
                                  pendingRevision.originalSubmissionId ===
                                  submissionId;

                                // Nếu submission là originalSubmissionId và revision request đang pending → ẩn nút
                                if (isOriginal) {
                                  return (
                                    <Tag color="orange">
                                      Request revision - Pending review
                                    </Tag>
                                  );
                                }
                              }
                            }

                            // Nếu không có revision request nào cho submission này → hiển thị nút
                            // Check xem còn lượt free revision không (dùng revisionStats từ API)
                            const hasFreeRevisionsLeft =
                              revisionStats &&
                              revisionStats.freeRevisionsIncluded != null &&
                              revisionStats.freeRevisionsRemaining != null &&
                              revisionStats.freeRevisionsRemaining > 0;

                            return (
                              <Space>
                                <Button
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                  size="small"
                                  onClick={() =>
                                    handleOpenReviewModal(submission, 'accept')
                                  }
                                >
                                  Accept
                                </Button>
                                <Popconfirm
                                  title={
                                    !hasFreeRevisionsLeft
                                      ? 'Confirm request revision with fee'
                                      : 'Confirm request revision'
                                  }
                                  description={
                                    !hasFreeRevisionsLeft
                                      ? `You have used all ${revisionStats?.freeRevisionsIncluded || contractInfo?.freeRevisionsIncluded || 0} free revisions. This revision will cost ${contractInfo?.additionalRevisionFeeVnd?.toLocaleString() || 0} VND.`
                                      : `You have ${revisionStats?.freeRevisionsRemaining || 0} free revisions remaining.`
                                  }
                                  onConfirm={() => {
                                    if (!hasFreeRevisionsLeft) {
                                      // Paid revision → navigate to payment page
                                      navigate(
                                        `/contracts/${contractId}/pay-revision-fee`,
                                        {
                                          state: {
                                            contractId: contractId,
                                            milestoneId:
                                              milestoneInfo?.milestoneId,
                                            submissionId:
                                              submission.submissionId,
                                            taskAssignmentId:
                                              submission.assignmentId,
                                            feeAmount:
                                              contractInfo?.additionalRevisionFeeVnd,
                                            revisionRound:
                                              (revisionRequests.length || 0) +
                                              1,
                                          },
                                        }
                                      );
                                    } else {
                                      // Free revision → open modal
                                      handleOpenReviewModal(
                                        submission,
                                        'request_revision'
                                      );
                                    }
                                  }}
                                  okText="Confirm"
                                  cancelText="Cancel"
                                >
                                  <Button
                                    icon={<CloseCircleOutlined />}
                                    size="small"
                                    danger={!hasFreeRevisionsLeft}
                                  >
                                    Request revision
                                    {!hasFreeRevisionsLeft && (
                                      <Tag
                                        color="orange"
                                        style={{ marginLeft: 4 }}
                                      >
                                        (With fee)
                                      </Tag>
                                    )}
                                  </Button>
                                </Popconfirm>
                              </Space>
                            );
                          })()}
                      </Space>
                    }
                  >
                    {submission.files && submission.files.length > 0 ? (
                      <List
                        dataSource={submission.files}
                        renderItem={file => (
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
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<FileOutlined style={{ fontSize: 24 }} />}
                              title={<Text strong>{file.fileName}</Text>}
                              description={
                                <Space direction="vertical" size={0}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    Type: {file.contentType} • Size:{' '}
                                    {file.fileSize
                                      ? (file.fileSize / 1024 / 1024).toFixed(
                                          2
                                        ) + ' MB'
                                      : 'N/A'}
                                  </Text>
                                </Space>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        description="No files in this submission"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}

                    {/* Revision Requests liên quan đến submission này */}
                    {(() => {
                      const submissionId = submission.submissionId;
                      // Hiển thị revision requests nếu submission này liên quan:
                      // - Nếu submission là originalSubmissionId (submission bị request revision)
                      // - Nếu submission là revisedSubmissionId (submission sau khi chỉnh sửa)
                      const relatedRevisions = revisionRequests.filter(
                        rr =>
                          rr.originalSubmissionId === submissionId ||
                          rr.revisedSubmissionId === submissionId
                      );

                      if (relatedRevisions.length === 0) return null;

                      // Tách thành 2 nhóm: original (chỉ hiển thị tên) và revised (hiển thị chi tiết)
                      const originalRevisions = relatedRevisions.filter(
                        rr => rr.originalSubmissionId === submissionId
                      );
                      const revisedRevisions = relatedRevisions.filter(
                        rr => rr.revisedSubmissionId === submissionId
                      );

                      return (
                        <div style={{ marginTop: 16 }}>
                          <Divider orientation="left">
                            <Text strong>Related Revision Requests</Text>
                          </Divider>

                          {/* Hiển thị revision requests cho originalSubmissionId - chỉ tên thôi */}
                          {originalRevisions.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <Space
                                direction="vertical"
                                style={{ width: '100%' }}
                                size="small"
                              >
                                {originalRevisions.map(revision => (
                                  <div
                                    key={revision.revisionRequestId}
                                    style={{ padding: '8px 0' }}
                                  >
                                    <Space>
                                      <Tag color="red">
                                        Revision Round #{revision.revisionRound}
                                      </Tag>
                                      <Text strong>{revision.title}</Text>
                                    </Space>
                                  </div>
                                ))}
                              </Space>
                            </div>
                          )}

                          {/* Hiển thị revision requests cho revisedSubmissionId - có chi tiết */}
                          {revisedRevisions.length > 0 && (
                            <Collapse size="small">
                              {revisedRevisions.map(revision => (
                                <Collapse.Panel
                                  key={revision.revisionRequestId}
                                  header={
                                    <Space>
                                      <Text strong>
                                        Revision Round #{revision.revisionRound}
                                      </Text>
                                      <Tag color="green">
                                        This submission is the revised version
                                      </Tag>
                                      {revision.isFreeRevision && (
                                        <Tag color="green">Free Revision</Tag>
                                      )}
                                      {!revision.isFreeRevision && (
                                        <Tag color="orange">Paid Revision</Tag>
                                      )}
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 12 }}
                                      >
                                        {revision.title}
                                      </Text>
                                    </Space>
                                  }
                                >
                                  <Descriptions
                                    bordered
                                    column={1}
                                    size="small"
                                  >
                                    <Descriptions.Item label="Description">
                                      <Text>{revision.description}</Text>
                                    </Descriptions.Item>
                                    {revision.revisionDueAt && (
                                      <Descriptions.Item label="Revision Deadline">
                                        <Space>
                                          <Text strong>
                                            {dayjs(
                                              revision.revisionDueAt
                                            ).format('DD/MM/YYYY HH:mm')}
                                            {revision.revisionDeadlineDays && (
                                              <Text
                                                type="secondary"
                                                style={{
                                                  fontSize: 11,
                                                  marginLeft: 4,
                                                }}
                                              >
                                                (+
                                                {
                                                  revision.revisionDeadlineDays
                                                }{' '}
                                                days SLA)
                                              </Text>
                                            )}
                                          </Text>
                                          {dayjs(
                                            revision.revisionDueAt
                                          ).isBefore(dayjs()) && (
                                            <Tag color="red">Overdue</Tag>
                                          )}
                                          {!dayjs(
                                            revision.revisionDueAt
                                          ).isBefore(dayjs()) && (
                                            <Tag color="blue">
                                              Remaining{' '}
                                              {dayjs(
                                                revision.revisionDueAt
                                              ).diff(dayjs(), 'day')}{' '}
                                              days
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
                                  </Descriptions>
                                </Collapse.Panel>
                              ))}
                            </Collapse>
                          )}
                        </div>
                      );
                    })()}
                  </Card>
                ))}
              </Space>
            )}
          </Spin>
        </Card>

        {/* Revision Requests Tổng hợp - Hiển thị tất cả revision requests */}
        {revisionRequests.length > 0 &&
          (() => {
            // Lấy tất cả submission IDs đã được hiển thị
            const displayedSubmissionIds = new Set(
              submissions.map(s => s.submissionId)
            );

            // Tìm các revision requests không liên quan đến submission nào đã hiển thị
            // (orphan revisions hoặc revisions chưa có originalSubmissionId/revisedSubmissionId)
            const orphanRevisions = revisionRequests.filter(rr => {
              // Nếu không có originalSubmissionId và revisedSubmissionId → orphan
              if (!rr.originalSubmissionId && !rr.revisedSubmissionId) {
                return true;
              }
              // Nếu có originalSubmissionId hoặc revisedSubmissionId nhưng không match với submission nào
              const hasOriginalMatch =
                rr.originalSubmissionId &&
                displayedSubmissionIds.has(rr.originalSubmissionId);
              const hasRevisedMatch =
                rr.revisedSubmissionId &&
                displayedSubmissionIds.has(rr.revisedSubmissionId);
              return !hasOriginalMatch && !hasRevisedMatch;
            });

            // Hiển thị section này để customer có thể xem tổng quan tất cả revision requests
            // Bao gồm cả những revision requests chưa liên kết với submission (orphan)

            return (
              <Card
                title={
                  <Space>
                    <Text strong>Summary of Revision Requests</Text>
                    <Tag color="orange">{revisionRequests.length}</Tag>
                  </Space>
                }
                style={{ marginTop: 24 }}
              >
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
                      pending_manager_review: 'Waiting Manager review',
                      in_revision: 'In revision',
                      waiting_manager_review: 'Waiting Manager review',
                      approved_pending_delivery: 'Approved, waiting delivery',
                      waiting_customer_confirm: 'Waiting Customer confirm',
                      completed: 'Completed',
                      rejected: 'Rejected',
                      canceled: 'Canceled',
                    };

                    const isOrphan = orphanRevisions.includes(revision);
                    const hasOriginalMatch =
                      revision.originalSubmissionId &&
                      displayedSubmissionIds.has(revision.originalSubmissionId);
                    const hasRevisedMatch =
                      revision.revisedSubmissionId &&
                      displayedSubmissionIds.has(revision.revisedSubmissionId);

                    return (
                      <Collapse.Panel
                        key={revision.revisionRequestId}
                        header={
                          <Space>
                            <Text strong>
                              Revision Round #{revision.revisionRound}
                            </Text>
                            {isOrphan && (
                              <Tag color="warning">
                                Not linked to any submission
                              </Tag>
                            )}
                            {revision.isFreeRevision && (
                              <Tag color="green">Free Revision</Tag>
                            )}
                            {!revision.isFreeRevision && (
                              <Tag color="orange">Paid Revision</Tag>
                            )}
                            {revision.revisionDueAt && (
                              <Tag
                                color={
                                  dayjs(revision.revisionDueAt).isBefore(
                                    dayjs()
                                  )
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
                          <Descriptions.Item label="Revision Round">
                            #{revision.revisionRound}
                          </Descriptions.Item>
                          <Descriptions.Item label="Free Revision">
                            {revision.isFreeRevision ? (
                              <Tag color="green">Yes</Tag>
                            ) : (
                              <Tag color="orange">No (With fee)</Tag>
                            )}
                          </Descriptions.Item>
                          {revision.originalSubmissionId && (
                            <Descriptions.Item label="Original Submission">
                              <Text>
                                {hasOriginalMatch ? (
                                  <Tag color="blue">
                                    Version{' '}
                                    {submissions.find(
                                      s =>
                                        s.submissionId ===
                                        revision.originalSubmissionId
                                    )?.version || 'N/A'}
                                  </Tag>
                                ) : (
                                  <>
                                    Submission ID:{' '}
                                    {revision.originalSubmissionId.substring(
                                      0,
                                      8
                                    )}
                                    ...
                                    <Text
                                      type="secondary"
                                      style={{
                                        fontSize: 11,
                                        display: 'block',
                                        marginTop: 4,
                                      }}
                                    >
                                      (This submission is not in the current
                                      list)
                                    </Text>
                                  </>
                                )}
                              </Text>
                            </Descriptions.Item>
                          )}
                          {revision.revisedSubmissionId && (
                            <Descriptions.Item label="Revised Submission">
                              <Text>
                                {hasRevisedMatch ? (
                                  <Tag color="green">
                                    Version{' '}
                                    {submissions.find(
                                      s =>
                                        s.submissionId ===
                                        revision.revisedSubmissionId
                                    )?.version || 'N/A'}
                                  </Tag>
                                ) : (
                                  <>
                                    Submission ID:{' '}
                                    {revision.revisedSubmissionId.substring(
                                      0,
                                      8
                                    )}
                                    ...
                                    <Text
                                      type="secondary"
                                      style={{
                                        fontSize: 11,
                                        display: 'block',
                                        marginTop: 4,
                                      }}
                                    >
                                      (This submission is not in the current
                                      list)
                                    </Text>
                                  </>
                                )}
                              </Text>
                            </Descriptions.Item>
                          )}
                          {!revision.originalSubmissionId &&
                            !revision.revisedSubmissionId && (
                              <Descriptions.Item label="Note">
                                <Tag color="warning">
                                  This revision request is not linked to any
                                  submission
                                </Tag>
                              </Descriptions.Item>
                            )}
                          {revision.requestedAt && (
                            <Descriptions.Item label="Requested At">
                              {dayjs(revision.requestedAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Descriptions.Item>
                          )}
                          {revision.managerReviewedAt && (
                            <Descriptions.Item label="Manager Reviewed At">
                              {dayjs(revision.managerReviewedAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Descriptions.Item>
                          )}
                          {revision.managerNote && (
                            <Descriptions.Item label="Manager Note">
                              <Text>{revision.managerNote}</Text>
                            </Descriptions.Item>
                          )}
                          {revision.specialistSubmittedAt && (
                            <Descriptions.Item label="Specialist Submitted At">
                              {dayjs(revision.specialistSubmittedAt).format(
                                'DD/MM/YYYY HH:mm'
                              )}
                            </Descriptions.Item>
                          )}
                          {revision.customerConfirmedAt && (
                            <Descriptions.Item label="Customer Confirmed At">
                              {dayjs(revision.customerConfirmedAt).format(
                                'DD/MM/YYYY HH:mm'
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
                                      (+{revision.revisionDeadlineDays} days
                                      SLA)
                                    </Text>
                                  )}
                                </Text>
                                {dayjs(revision.revisionDueAt).isBefore(
                                  dayjs()
                                ) && <Tag color="red">Overdue</Tag>}
                                {!dayjs(revision.revisionDueAt).isBefore(
                                  dayjs()
                                ) && (
                                  <Tag color="blue">
                                    Remaining{' '}
                                    {dayjs(revision.revisionDueAt).diff(
                                      dayjs(),
                                      'day'
                                    )}{' '}
                                    days
                                  </Tag>
                                )}
                              </Space>
                            </Descriptions.Item>
                          )}
                        </Descriptions>
                      </Collapse.Panel>
                    );
                  })}
                </Collapse>
              </Card>
            );
          })()}
      </div>

      {/* Review Modal */}
      <Modal
        title={
          reviewAction === 'accept'
            ? 'Xác nhận chấp nhận submission'
            : 'Yêu cầu chỉnh sửa submission'
        }
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          setSelectedSubmission(null);
          setRevisionTitle('');
          setRevisionDescription('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setReviewModalVisible(false);
              setSelectedSubmission(null);
              setRevisionTitle('');
              setRevisionDescription('');
            }}
          >
            Cancel
          </Button>,
          <Popconfirm
            key="confirm"
            title="Confirm?"
            description={
              reviewAction === 'accept'
                ? 'Are you sure you want to accept this submission?'
                : 'Are you sure you want to request a revision for this submission?'
            }
            onConfirm={handleReviewSubmission}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Button
              type="primary"
              loading={actionLoading}
              danger={reviewAction === 'request_revision'}
            >
              {reviewAction === 'accept' ? 'Accept' : 'Request revision'}
            </Button>
          </Popconfirm>,
        ]}
        width={600}
      >
        {reviewAction === 'request_revision' && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message="Request revision"
              description="Please enter the title and detailed description of the request revision. Manager will review and send to specialist to perform."
              type="warning"
              showIcon
            />
            <div>
              <Text strong>Request revision title:</Text>
              <Input
                value={revisionTitle}
                onChange={e => setRevisionTitle(e.target.value)}
                placeholder="Enter a short title (e.g., Need to adjust tempo, Need to add intro...)"
                style={{ marginTop: 8 }}
                maxLength={255}
                showCount
              />
            </div>
            <div>
              <Text strong>Detailed description:</Text>
              <TextArea
                rows={6}
                value={revisionDescription}
                onChange={e => setRevisionDescription(e.target.value)}
                placeholder="Enter detailed description of the request revision..."
                style={{ marginTop: 8 }}
                maxLength={2000}
                showCount
              />
            </div>
          </Space>
        )}
        {reviewAction === 'accept' && (
          <Alert
            message="Accept submission"
            description="You are accepting this submission. The submission will be marked as accepted."
            type="success"
            showIcon
          />
        )}
      </Modal>

      {/* Chat Popup - Chat về milestone này với contextType = MILESTONE */}
      {contractInfo?.contractId && milestoneId && (
        <ChatPopup
          contractId={contractInfo.contractId}
          roomType="CONTRACT_CHAT"
          contextType="MILESTONE"
          contextId={milestoneId}
        />
      )}
    </div>
  );
};

export default MilestoneDeliveriesPage;
