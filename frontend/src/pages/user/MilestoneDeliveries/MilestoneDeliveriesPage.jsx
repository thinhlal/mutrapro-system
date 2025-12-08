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
      message.error('Lỗi khi tải file');
    }
  };

  const handlePreviewFile = async file => {
    try {
      const url = `/api/v1/projects/files/preview/${file.fileId}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('Lỗi khi xem file');
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
              Quay lại Contract
            </Button>
            <Button
              type="primary"
              onClick={() => navigate(`/contracts/${contractId}`)}
              style={{ marginBottom: 16 }}
            >
              Xem Contract Detail
            </Button>
          </Space>
          <Title level={3} style={{ margin: 0 }}>
            Deliveries - {milestoneName}
          </Title>
        </div>

        {/* Contract & Milestone Info */}
        {contractInfo && milestoneInfo && (
          <Card
            title="Thông tin Contract & Milestone"
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
                              : 'default'
                    }
                  >
                    {milestoneInfo.workStatus === 'WAITING_CUSTOMER'
                      ? 'Chờ khách hàng phản hồi'
                      : milestoneInfo.workStatus === 'READY_FOR_PAYMENT'
                        ? 'Sẵn sàng thanh toán'
                        : milestoneInfo.workStatus === 'COMPLETED'
                          ? 'Hoàn thành'
                          : milestoneInfo.workStatus === 'IN_PROGRESS'
                            ? 'Đang thực hiện'
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
                        Thanh toán
                      </Button>
                    )}
                  {/* Hiển thị tag "Đã thanh toán" nếu installment đã PAID */}
                  {milestoneInfo.installmentStatus === 'PAID' && (
                    <Tag color="success">Đã thanh toán</Tag>
                  )}
                </Space>
              </Descriptions.Item>
              {milestoneInfo.description && (
                <Descriptions.Item label="Description" span={2}>
                  <Text>{milestoneInfo.description}</Text>
                </Descriptions.Item>
              )}
              {milestoneInfo.plannedDueDate && (
                <Descriptions.Item label="Planned Due Date">
                  {dayjs(milestoneInfo.plannedDueDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
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
                      Đã dùng {revisionStats.freeRevisionsUsed} lần revision
                      free, {revisionStats.paidRevisionsUsed} lần revision có
                      phí
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
            title="Thông tin Request"
            extra={
              <Button
                type="link"
                onClick={() => navigate(`/contracts/${contractId}`)}
              >
                Xem Contract Detail
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
                        <Divider orientation="left">Files đã upload</Divider>
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
                                    onClick={() => {
                                      if (
                                        fileId &&
                                        typeof fileId === 'string'
                                      ) {
                                        window.open(
                                          `/api/v1/projects/files/preview/${fileId}`,
                                          '_blank'
                                        );
                                      } else if (file.url) {
                                        window.open(file.url, '_blank');
                                      }
                                    }}
                                  >
                                    Xem
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
                                    Tải xuống
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
              <Empty description="Không thể tải thông tin request" />
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
              Làm mới
            </Button>
          }
        >
          <Spin spinning={loading}>
            {submissions.length === 0 ? (
              <Empty description="Chưa có submissions nào được gửi cho milestone này" />
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
                                      Đã yêu cầu chỉnh sửa - Đang chờ xử lý
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
                                      ? 'Xác nhận yêu cầu revision có phí'
                                      : 'Xác nhận yêu cầu revision'
                                  }
                                  description={
                                    !hasFreeRevisionsLeft
                                      ? `Bạn đã dùng hết ${revisionStats?.freeRevisionsIncluded || contractInfo?.freeRevisionsIncluded || 0} lượt revision miễn phí. Revision này sẽ tính phí ${contractInfo?.additionalRevisionFeeVnd?.toLocaleString() || 0} VND.`
                                      : `Bạn còn ${revisionStats?.freeRevisionsRemaining || 0} lượt revision miễn phí.`
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
                                  okText="Xác nhận"
                                  cancelText="Hủy"
                                >
                                  <Button
                                    icon={<CloseCircleOutlined />}
                                    size="small"
                                    danger={!hasFreeRevisionsLeft}
                                  >
                                    Request Revision
                                    {!hasFreeRevisionsLeft && (
                                      <Tag
                                        color="orange"
                                        style={{ marginLeft: 4 }}
                                      >
                                        (Có phí)
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
                                    Loại: {file.contentType} • Dung lượng:{' '}
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
                            <Text strong>Revision Requests liên quan</Text>
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
                                        Submission này là bản đã chỉnh sửa
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
                                                ngày SLA)
                                              </Text>
                                            )}
                                          </Text>
                                          {dayjs(
                                            revision.revisionDueAt
                                          ).isBefore(dayjs()) && (
                                            <Tag color="red">Quá hạn</Tag>
                                          )}
                                          {!dayjs(
                                            revision.revisionDueAt
                                          ).isBefore(dayjs()) && (
                                            <Tag color="blue">
                                              Còn{' '}
                                              {dayjs(
                                                revision.revisionDueAt
                                              ).diff(dayjs(), 'day')}{' '}
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
                    <Text strong>Revision Requests Tổng hợp</Text>
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
                      pending_manager_review: 'Chờ Manager duyệt',
                      in_revision: 'Đang chỉnh sửa',
                      waiting_manager_review: 'Chờ Manager review',
                      approved_pending_delivery: 'Đã duyệt, chờ deliver',
                      waiting_customer_confirm: 'Chờ Customer xác nhận',
                      completed: 'Hoàn thành',
                      rejected: 'Từ chối',
                      canceled: 'Đã hủy',
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
                                Chưa liên kết với submission
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
                              <Tag color="orange">No (Có phí)</Tag>
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
                                      (Submission này không có trong danh sách
                                      hiện tại)
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
                                      (Submission này không có trong danh sách
                                      hiện tại)
                                    </Text>
                                  </>
                                )}
                              </Text>
                            </Descriptions.Item>
                          )}
                          {!revision.originalSubmissionId &&
                            !revision.revisedSubmissionId && (
                              <Descriptions.Item label="Lưu ý">
                                <Tag color="warning">
                                  Revision request này chưa liên kết với
                                  submission nào
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
                                      (+{revision.revisionDeadlineDays} ngày
                                      SLA)
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
            Hủy
          </Button>,
          <Popconfirm
            key="confirm"
            title="Xác nhận?"
            description={
              reviewAction === 'accept'
                ? 'Bạn có chắc chắn muốn chấp nhận submission này?'
                : 'Bạn có chắc chắn muốn yêu cầu chỉnh sửa submission này?'
            }
            onConfirm={handleReviewSubmission}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              loading={actionLoading}
              danger={reviewAction === 'request_revision'}
            >
              {reviewAction === 'accept' ? 'Chấp nhận' : 'Yêu cầu chỉnh sửa'}
            </Button>
          </Popconfirm>,
        ]}
        width={600}
      >
        {reviewAction === 'request_revision' && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message="Yêu cầu chỉnh sửa"
              description="Vui lòng nhập tiêu đề và mô tả chi tiết yêu cầu chỉnh sửa. Manager sẽ xem xét và gửi cho specialist thực hiện."
              type="warning"
              showIcon
            />
            <div>
              <Text strong>Tiêu đề yêu cầu chỉnh sửa:</Text>
              <Input
                value={revisionTitle}
                onChange={e => setRevisionTitle(e.target.value)}
                placeholder="Nhập tiêu đề ngắn gọn (ví dụ: Cần chỉnh sửa tempo, Cần thêm phần intro...)"
                style={{ marginTop: 8 }}
                maxLength={255}
                showCount
              />
            </div>
            <div>
              <Text strong>Mô tả chi tiết:</Text>
              <TextArea
                rows={6}
                value={revisionDescription}
                onChange={e => setRevisionDescription(e.target.value)}
                placeholder="Nhập mô tả chi tiết yêu cầu chỉnh sửa..."
                style={{ marginTop: 8 }}
                maxLength={2000}
                showCount
              />
            </div>
          </Space>
        )}
        {reviewAction === 'accept' && (
          <Alert
            message="Chấp nhận submission"
            description="Bạn đang chấp nhận submission này. Submission sẽ được đánh dấu là đã được chấp nhận."
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
