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
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getDeliveredSubmissionsByMilestone,
  customerReviewSubmission,
} from '../../../services/fileSubmissionService';
import axiosInstance from '../../../utils/axiosInstance';
import Header from '../../../components/common/Header/Header';
import styles from './MilestoneDeliveriesPage.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SUBMISSION_STATUS_COLORS = {
  delivered: 'green',
  revision_requested: 'orange',
};

const SUBMISSION_STATUS_LABELS = {
  delivered: 'Đã gửi',
  revision_requested: 'Yêu cầu chỉnh sửa',
};

const MilestoneDeliveriesPage = () => {
  const { contractId, milestoneId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState(null);
  const [milestoneInfo, setMilestoneInfo] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewAction, setReviewAction] = useState(''); // 'accept' or 'request_revision'
  const [revisionTitle, setRevisionTitle] = useState('');
  const [revisionDescription, setRevisionDescription] = useState('');
  const [revisionRequests, setRevisionRequests] = useState([]); // Track revision requests để check xem đã request chưa
  
  const milestoneName = milestoneInfo?.name || location.state?.milestoneName || 'Milestone';

  useEffect(() => {
    if (contractId && milestoneId) {
      loadDeliveries();
    }
  }, [contractId, milestoneId]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await getDeliveredSubmissionsByMilestone(
        milestoneId,
        contractId
      );

      if (response?.status === 'success' && response?.data) {
        const data = response.data;
        console.log(data.request);
        setContractInfo(data.contract);
        setMilestoneInfo(data.milestone);
        setRequestInfo(data.request); // Request info đã được load từ backend
        
        // Revision requests đã được load từ backend trong response
        const allRevisionRequests = Array.isArray(data.revisionRequests) ? data.revisionRequests : [];
        setRevisionRequests(allRevisionRequests);
        
        // Không filter submissions - hiển thị tất cả submissions đã delivered
        // Logic ẩn nút sẽ được xử lý trong phần render, không ẩn submission
        const allSubmissions = Array.isArray(data.submissions) ? data.submissions : [];
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
        error?.response?.data?.message ||
          'Lỗi khi tải danh sách deliveries'
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
      } else {
        // Nếu status không phải success, hiển thị lỗi
        message.error(
          response?.message || 'Lỗi khi review submission'
        );
      }
    } catch (error) {
      console.error('Error reviewing submission:', error);
      message.error(
        error?.response?.data?.message || error?.message || 'Lỗi khi review submission'
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
          <Card title="Thông tin Contract & Milestone" style={{ marginBottom: 24 }}>
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
                <Tag
                  color={
                    milestoneInfo.workStatus === 'WAITING_CUSTOMER'
                      ? 'warning'
                      : milestoneInfo.workStatus === 'COMPLETED'
                        ? 'success'
                        : milestoneInfo.workStatus === 'IN_PROGRESS'
                          ? 'processing'
                          : 'default'
                  }
                >
                  {milestoneInfo.workStatus === 'WAITING_CUSTOMER'
                    ? 'Chờ khách hàng phản hồi'
                    : milestoneInfo.workStatus === 'COMPLETED'
                      ? 'Hoàn thành'
                      : milestoneInfo.workStatus === 'IN_PROGRESS'
                        ? 'Đang thực hiện'
                        : milestoneInfo.workStatus || 'N/A'}
                </Tag>
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
              {contractInfo.freeRevisionsIncluded != null && (() => {
                const totalRevisions = revisionRequests.length;
                // Đếm tất cả revision free KHÔNG bị REJECTED hoặc CANCELED
                // (kể cả đang pending, in_revision, waiting_customer_confirm, completed)
                // CHỈ loại trừ REJECTED và CANCELED (vì revision bị reject/cancel không được tính là đã sử dụng lượt free)
                const freeRevisionsUsed = Math.min(
                  revisionRequests.filter(rr => 
                    rr.isFreeRevision === true && 
                    rr.status?.toUpperCase() !== 'REJECTED' &&
                    rr.status?.toUpperCase() !== 'CANCELED'
                  ).length,
                  contractInfo.freeRevisionsIncluded
                );
                const paidRevisionsUsed = totalRevisions - freeRevisionsUsed;
                
                return (
                  <>
                    <Descriptions.Item label="Free Revisions Included">
                      <Text strong>{contractInfo.freeRevisionsIncluded}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Revisions Used">
                      <Text strong>
                        {totalRevisions} / {contractInfo.freeRevisionsIncluded} (Free)
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        Đã dùng {freeRevisionsUsed} lần revision free, {paidRevisionsUsed} lần revision có phí
                      </Text>
                    </Descriptions.Item>
                  </>
                );
              })()}
            </Descriptions>
          </Card>
        )}

        {/* Request Info */}
        {requestInfo && (
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
          >
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Request ID">
                <Text strong>{requestInfo.requestId || 'N/A'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Service Type">
                <Tag color="purple">
                  {requestInfo.serviceType?.toUpperCase() || 'N/A'}
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
              {requestInfo.durationSeconds && (
                <Descriptions.Item label="Duration">
                  <Text>
                    {Math.floor(requestInfo.durationSeconds / 60)} phút{' '}
                    {requestInfo.durationSeconds % 60} giây
                  </Text>
                </Descriptions.Item>
              )}
              {requestInfo.tempo && (
                <Descriptions.Item label="Tempo">
                  <Text>{requestInfo.tempo}%</Text>
                </Descriptions.Item>
              )}
              {requestInfo.timeSignature && (
                <Descriptions.Item label="Time Signature">
                  <Text>{requestInfo.timeSignature}</Text>
                </Descriptions.Item>
              )}
              {requestInfo.specialNotes && (
                <Descriptions.Item label="Special Notes" span={2}>
                  <Text>{requestInfo.specialNotes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            
            {/* Customer Uploaded Files */}
            {requestInfo.files && Array.isArray(requestInfo.files) && requestInfo.files.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Divider orientation="left">Files đã upload</Divider>
                <List
                  size="small"
                  dataSource={requestInfo.files}
                  renderItem={(file) => {
                    // Handle both object format (from project-service) and string format
                    const fileName = file.fileName || file.name || 'File';
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
                              if (fileId && typeof fileId === 'string') {
                                window.open(`/api/v1/projects/files/preview/${fileId}`, '_blank');
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
                              if (fileId && typeof fileId === 'string') {
                                handleDownloadFile(fileId, fileName);
                              } else if (file.url) {
                                const link = document.createElement('a');
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
                          avatar={<FileOutlined style={{ fontSize: 20 }} />}
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
              <Space direction="vertical" style={{ width: '100%' }} size="large">
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
                        {submission.status?.toLowerCase() === 'delivered' && (() => {
                          // Check xem submission này có đang trong quá trình revision không
                          // Logic:
                          // 1. Nếu submission là originalSubmissionId của revision request đang pending → ẩn nút (đã request revision)
                          // 2. Nếu submission là originalSubmissionId của revision request đã completed → ẩn nút (đã có submission mới)
                          // 3. Nếu submission là revisedSubmissionId của revision request WAITING_CUSTOMER_CONFIRM → hiển thị nút (submission mới sau revision, cần review)
                          // 4. Nếu submission không có trong revision request nào → hiển thị nút (submission bình thường)
                          
                          const submissionId = submission.submissionId;
                          
                          // Check xem có revision request nào đang pending cho cùng milestone không
                          // (kể cả khi chưa có revisedSubmissionId)
                          const hasPendingRevisionForMilestone = revisionRequests.some(rr => {
                            const status = rr.status?.toUpperCase();
                            return (
                              (status === 'PENDING_MANAGER_REVIEW' ||
                               status === 'IN_REVISION' ||
                               status === 'WAITING_MANAGER_REVIEW' ||
                               status === 'APPROVED_PENDING_DELIVERY') &&
                              rr.milestoneId === milestoneInfo?.milestoneId
                            );
                          });
                          
                          // Tìm TẤT CẢ revision requests liên quan đến submission này
                          const relatedRevisions = revisionRequests.filter(
                            rr => rr.originalSubmissionId === submissionId || rr.revisedSubmissionId === submissionId
                          );
                          
                          if (relatedRevisions.length > 0) {
                            // ƯU TIÊN: Check rejected revisions TRƯỚC - nếu submission này là originalSubmissionId của revision bị reject
                            // → Hiển thị lại nút Accept và Request Revision (vì manager đã reject, customer có thể accept hoặc request lại)
                            // NHƯNG chỉ hiển thị nếu KHÔNG có revision nào mới hơn đang pending hoặc completed từ submission này
                            const rejectedRevision = relatedRevisions.find(rr => {
                              const status = rr.status?.toUpperCase();
                              return status === 'REJECTED' && rr.originalSubmissionId === submissionId;
                            });
                            
                            if (rejectedRevision) {
                              // Check xem có revision nào mới hơn (pending hoặc completed) từ submission này không
                              // Nếu có → không hiển thị nút (vì đã có revision mới hơn)
                              const hasNewerRevision = relatedRevisions.some(rr => {
                                const rrStatus = rr.status?.toUpperCase();
                                // Revision mới hơn = revision có revisionRound lớn hơn hoặc createdAfter sau rejectedRevision
                                // Và status là pending hoặc completed
                                const isNewer = (rr.revisionRound || 0) > (rejectedRevision.revisionRound || 0) ||
                                                (rr.requestedAt && rejectedRevision.requestedAt && 
                                                 new Date(rr.requestedAt) > new Date(rejectedRevision.requestedAt));
                                const isActive = (
                                  rrStatus === 'PENDING_MANAGER_REVIEW' ||
                                  rrStatus === 'IN_REVISION' ||
                                  rrStatus === 'WAITING_MANAGER_REVIEW' ||
                                  rrStatus === 'APPROVED_PENDING_DELIVERY' ||
                                  rrStatus === 'WAITING_CUSTOMER_CONFIRM' ||
                                  rrStatus === 'COMPLETED'
                                );
                                return isNewer && isActive && rr.originalSubmissionId === submissionId;
                              });
                              
                              // Nếu không có revision mới hơn → hiển thị nút
                              if (!hasNewerRevision) {
                                // Check xem còn lượt free revision không
                                // Đếm tất cả revision free KHÔNG bị REJECTED hoặc CANCELED
                                // (kể cả đang pending, in_revision, waiting_customer_confirm, completed)
                                const freeRevisionsUsed = revisionRequests.filter(rr => 
                                  rr.isFreeRevision === true && 
                                  rr.status?.toUpperCase() !== 'REJECTED' &&
                                  rr.status?.toUpperCase() !== 'CANCELED'
                                ).length;
                                const hasFreeRevisionsLeft = contractInfo?.freeRevisionsIncluded != null && 
                                                             freeRevisionsUsed < contractInfo.freeRevisionsIncluded;
                                
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
                                      title={!hasFreeRevisionsLeft ? "Xác nhận yêu cầu revision có phí" : "Xác nhận yêu cầu revision"}
                                      description={
                                        !hasFreeRevisionsLeft 
                                          ? `Bạn đã dùng hết ${contractInfo?.freeRevisionsIncluded || 0} lượt revision miễn phí. Revision này sẽ tính phí ${contractInfo?.additionalRevisionFeeVnd?.toLocaleString() || 0} VND.`
                                          : `Bạn còn ${(contractInfo?.freeRevisionsIncluded || 0) - freeRevisionsUsed} lượt revision miễn phí.`
                                      }
                                      onConfirm={() => {
                                        if (!hasFreeRevisionsLeft) {
                                          // Paid revision → navigate to payment page
                                          navigate(`/contracts/${contractId}/pay-revision-fee`, {
                                            state: {
                                              contractId: contractId,
                                              milestoneId: milestoneInfo?.milestoneId,
                                              submissionId: submission.submissionId,
                                              taskAssignmentId: submission.assignmentId,
                                              feeAmount: contractInfo?.additionalRevisionFeeVnd,
                                              revisionRound: (revisionRequests.length || 0) + 1,
                                            }
                                          });
                                        } else {
                                          // Free revision → open modal
                                          handleOpenReviewModal(submission, 'request_revision');
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
                                          <Tag color="orange" style={{ marginLeft: 4 }}>
                                            (Có phí)
                                          </Tag>
                                        )}
                                      </Button>
                                    </Popconfirm>
                                  </Space>
                                );
                              }
                            }
                            
                            // Check revision request đang pending
                            const pendingRevision = relatedRevisions.find(rr => {
                              const status = rr.status?.toUpperCase();
                              return (
                                status === 'PENDING_MANAGER_REVIEW' ||
                                status === 'IN_REVISION' ||
                                status === 'WAITING_MANAGER_REVIEW' ||
                                status === 'APPROVED_PENDING_DELIVERY'
                              );
                            });
                            
                            // Nếu có revision request đang pending
                            if (pendingRevision) {
                              const isOriginal = pendingRevision.originalSubmissionId === submissionId;
                              const isRevised = pendingRevision.revisedSubmissionId === submissionId;
                              
                              // Nếu submission là originalSubmissionId và revision request đang pending → ẩn nút
                              if (isOriginal) {
                                return (
                                  <Tag color="orange">
                                    Đã yêu cầu chỉnh sửa - Đang chờ xử lý
                                  </Tag>
                                );
                              }
                              
                              // Nếu submission là revisedSubmissionId và revision request đang pending → không hiển thị nút (chưa deliver)
                              if (isRevised) {
                                return (
                                  <Tag color="blue">
                                    Đang chờ xử lý
                                  </Tag>
                                );
                              }
                            }
                            
                            // Check completed revisions
                            const completedRevision = relatedRevisions.find(rr => {
                              const status = rr.status?.toUpperCase();
                              return status === 'COMPLETED' || status === 'WAITING_CUSTOMER_CONFIRM';
                            });
                            
                            if (completedRevision) {
                              const status = completedRevision.status?.toUpperCase();
                              const isOriginal = completedRevision.originalSubmissionId === submissionId;
                              const isRevised = completedRevision.revisedSubmissionId === submissionId;
                              
                              // Nếu submission là originalSubmissionId và revision request đã completed → ẩn nút
                              if (isOriginal) {
                                return (
                                  <Tag color="default">
                                    Đã được chỉnh sửa - Xem submission mới
                                  </Tag>
                                );
                              }
                              
                              // Nếu submission là revisedSubmissionId và revision request đang WAITING_CUSTOMER_CONFIRM → hiển thị nút
                              if (isRevised && status === 'WAITING_CUSTOMER_CONFIRM') {
                                // Check xem còn lượt free revision không
                                // Đếm tất cả revision free KHÔNG bị REJECTED hoặc CANCELED
                                // (kể cả đang pending, in_revision, waiting_customer_confirm, completed)
                                const freeRevisionsUsed = revisionRequests.filter(rr => 
                                  rr.isFreeRevision === true && 
                                  rr.status?.toUpperCase() !== 'REJECTED' &&
                                  rr.status?.toUpperCase() !== 'CANCELED'
                                ).length;
                                const hasFreeRevisionsLeft = contractInfo?.freeRevisionsIncluded != null && 
                                                             freeRevisionsUsed < contractInfo.freeRevisionsIncluded;
                                
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
                                      title={!hasFreeRevisionsLeft ? "Xác nhận yêu cầu revision có phí" : "Xác nhận yêu cầu revision"}
                                      description={
                                        !hasFreeRevisionsLeft 
                                          ? `Bạn đã dùng hết ${contractInfo?.freeRevisionsIncluded || 0} lượt revision miễn phí. Revision này sẽ tính phí ${contractInfo?.additionalRevisionFeeVnd?.toLocaleString() || 0} VND.`
                                          : `Bạn còn ${(contractInfo?.freeRevisionsIncluded || 0) - freeRevisionsUsed} lượt revision miễn phí.`
                                      }
                                      onConfirm={() => {
                                        if (!hasFreeRevisionsLeft) {
                                          // Paid revision → navigate to payment page
                                          navigate(`/contracts/${contractId}/pay-revision-fee`, {
                                            state: {
                                              contractId: contractId,
                                              milestoneId: milestoneInfo?.milestoneId,
                                              submissionId: submission.submissionId,
                                              taskAssignmentId: submission.assignmentId,
                                              feeAmount: contractInfo?.additionalRevisionFeeVnd,
                                              revisionRound: (revisionRequests.length || 0) + 1,
                                            }
                                          });
                                        } else {
                                          // Free revision → open modal
                                          handleOpenReviewModal(submission, 'request_revision');
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
                                          <Tag color="orange" style={{ marginLeft: 4 }}>
                                            (Có phí)
                                          </Tag>
                                        )}
                                      </Button>
                                    </Popconfirm>
                                  </Space>
                                );
                              }
                              
                              // Nếu submission là revisedSubmissionId và revision request đã COMPLETED
                              // NHƯNG nếu có revision request khác đang pending mà submission này là originalSubmissionId → hiển thị "Đã được chỉnh sửa - Xem submission mới"
                              if (isRevised && status === 'COMPLETED') {
                                // Check xem có revision request nào khác đang pending mà submission này là originalSubmissionId không
                                // (tức là submission này đã được chỉnh sửa thành submission mới)
                                const hasPendingRevisionWhereThisIsOriginal = relatedRevisions.some(rr => {
                                  const rrStatus = rr.status?.toUpperCase();
                                  return (
                                    rr.revisionRequestId !== completedRevision.revisionRequestId && // Không phải revision đã completed
                                    (rrStatus === 'PENDING_MANAGER_REVIEW' ||
                                     rrStatus === 'IN_REVISION' ||
                                     rrStatus === 'WAITING_MANAGER_REVIEW' ||
                                     rrStatus === 'APPROVED_PENDING_DELIVERY') &&
                                    rr.originalSubmissionId === submissionId // Submission này là originalSubmissionId của revision đang pending
                                  );
                                });
                                
                                if (hasPendingRevisionWhereThisIsOriginal) {
                                  return (
                                    <Tag color="default">
                                      Đã được chỉnh sửa - Xem submission mới
                                    </Tag>
                                  );
                                }
                                
                                return (
                                  <Tag color="success">
                                    Đã chấp nhận
                                  </Tag>
                                );
                              }
                            }
                          }
                          
                          // Nếu không có revision request nào cho submission này → hiển thị nút
                          // Check xem còn lượt free revision không
                          // Chỉ đếm revision free đã COMPLETED (vì chỉ revision đã hoàn thành mới được tính là đã sử dụng lượt free)
                          const freeRevisionsUsed = revisionRequests.filter(rr => 
                            rr.isFreeRevision === true && 
                            rr.status?.toUpperCase() === 'COMPLETED'
                          ).length;
                          const hasFreeRevisionsLeft = contractInfo?.freeRevisionsIncluded != null && 
                                                       freeRevisionsUsed < contractInfo.freeRevisionsIncluded;
                          
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
                                title={!hasFreeRevisionsLeft ? "Xác nhận yêu cầu revision có phí" : "Xác nhận yêu cầu revision"}
                                description={
                                  !hasFreeRevisionsLeft 
                                    ? `Bạn đã dùng hết ${contractInfo?.freeRevisionsIncluded || 0} lượt revision miễn phí. Revision này sẽ tính phí ${contractInfo?.additionalRevisionFeeVnd?.toLocaleString() || 0} VND.`
                                    : `Bạn còn ${(contractInfo?.freeRevisionsIncluded || 0) - freeRevisionsUsed} lượt revision miễn phí.`
                                }
                                onConfirm={() => {
                                  if (!hasFreeRevisionsLeft) {
                                    // Paid revision → navigate to payment page
                                    navigate(`/contracts/${contractId}/pay-revision-fee`, {
                                      state: {
                                        contractId: contractId,
                                        milestoneId: milestoneInfo?.milestoneId,
                                        submissionId: submission.submissionId,
                                        taskAssignmentId: submission.assignmentId,
                                        feeAmount: contractInfo?.additionalRevisionFeeVnd,
                                        revisionRound: (revisionRequests.length || 0) + 1,
                                      }
                                    });
                                  } else {
                                    // Free revision → open modal
                                    handleOpenReviewModal(submission, 'request_revision');
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
                                    <Tag color="orange" style={{ marginLeft: 4 }}>
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
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Loại: {file.contentType} • Dung lượng:{' '}
                                    {file.fileSize
                                      ? (file.fileSize / 1024 / 1024).toFixed(2) +
                                        ' MB'
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
                      const relatedRevisions = revisionRequests.filter(rr => 
                        rr.originalSubmissionId === submissionId || 
                        rr.revisedSubmissionId === submissionId
                      );
                      
                      if (relatedRevisions.length === 0) return null;
                      
                      // Tách thành 2 nhóm: original (chỉ hiển thị tên) và revised (hiển thị chi tiết)
                      const originalRevisions = relatedRevisions.filter(rr => rr.originalSubmissionId === submissionId);
                      const revisedRevisions = relatedRevisions.filter(rr => rr.revisedSubmissionId === submissionId);
                      
                      return (
                        <div style={{ marginTop: 16 }}>
                          <Divider orientation="left">
                            <Text strong>Revision Requests liên quan</Text>
                          </Divider>
                          
                          {/* Hiển thị revision requests cho originalSubmissionId - chỉ tên thôi */}
                          {originalRevisions.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <Space direction="vertical" style={{ width: '100%' }} size="small">
                                {originalRevisions.map(revision => (
                                  <div key={revision.revisionRequestId} style={{ padding: '8px 0' }}>
                                    <Space>
                                      <Tag color="red">Revision Round #{revision.revisionRound}</Tag>
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
                                      <Tag color="green">Submission này là bản đã chỉnh sửa</Tag>
                                      {revision.isFreeRevision && (
                                        <Tag color="green">Free Revision</Tag>
                                      )}
                                      {!revision.isFreeRevision && (
                                        <Tag color="orange">Paid Revision</Tag>
                                      )}
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {revision.title}
                                      </Text>
                                    </Space>
                                  }
                                >
                                  <Descriptions bordered column={1} size="small">
                                    <Descriptions.Item label="Description">
                                      <Text>{revision.description}</Text>
                                    </Descriptions.Item>
                                    {revision.revisionDueAt && (
                                      <Descriptions.Item label="Revision Deadline">
                                        <Space>
                                          <Text strong>
                                            {dayjs(revision.revisionDueAt).format('DD/MM/YYYY HH:mm')}
                                            {revision.revisionDeadlineDays && (
                                              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                                (+{revision.revisionDeadlineDays} ngày SLA)
                                              </Text>
                                            )}
                                          </Text>
                                          {dayjs(revision.revisionDueAt).isBefore(dayjs()) && (
                                            <Tag color="red">Quá hạn</Tag>
                                          )}
                                          {!dayjs(revision.revisionDueAt).isBefore(dayjs()) && (
                                            <Tag color="blue">
                                              Còn {dayjs(revision.revisionDueAt).diff(dayjs(), 'day')} ngày
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
        {revisionRequests.length > 0 && (() => {
          // Lấy tất cả submission IDs đã được hiển thị
          const displayedSubmissionIds = new Set(submissions.map(s => s.submissionId));
          
          // Tìm các revision requests không liên quan đến submission nào đã hiển thị
          // (orphan revisions hoặc revisions chưa có originalSubmissionId/revisedSubmissionId)
          const orphanRevisions = revisionRequests.filter(rr => {
            // Nếu không có originalSubmissionId và revisedSubmissionId → orphan
            if (!rr.originalSubmissionId && !rr.revisedSubmissionId) {
              return true;
            }
            // Nếu có originalSubmissionId hoặc revisedSubmissionId nhưng không match với submission nào
            const hasOriginalMatch = rr.originalSubmissionId && displayedSubmissionIds.has(rr.originalSubmissionId);
            const hasRevisedMatch = rr.revisedSubmissionId && displayedSubmissionIds.has(rr.revisedSubmissionId);
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
                  const hasOriginalMatch = revision.originalSubmissionId && displayedSubmissionIds.has(revision.originalSubmissionId);
                  const hasRevisedMatch = revision.revisedSubmissionId && displayedSubmissionIds.has(revision.revisedSubmissionId);

                  return (
                    <Collapse.Panel
                      key={revision.revisionRequestId}
                      header={
                        <Space>
                          <Text strong>
                            Revision Round #{revision.revisionRound}
                          </Text>
                          {isOrphan && (
                            <Tag color="warning">Chưa liên kết với submission</Tag>
                          )}
                          {revision.isFreeRevision && (
                            <Tag color="green">Free Revision</Tag>
                          )}
                          {!revision.isFreeRevision && (
                            <Tag color="orange">Paid Revision</Tag>
                          )}
                          {revision.revisionDueAt && (
                            <Tag color={dayjs(revision.revisionDueAt).isBefore(dayjs()) ? 'red' : 'blue'}>
                              Deadline: {dayjs(revision.revisionDueAt).format('DD/MM/YYYY HH:mm')}
                              {revision.revisionDeadlineDays && (
                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
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
                                <Tag color="blue">Version {
                                  submissions.find(s => s.submissionId === revision.originalSubmissionId)?.version || 'N/A'
                                }</Tag>
                              ) : (
                                <>
                                  Submission ID: {revision.originalSubmissionId.substring(0, 8)}...
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                    (Submission này không có trong danh sách hiện tại)
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
                                <Tag color="green">Version {
                                  submissions.find(s => s.submissionId === revision.revisedSubmissionId)?.version || 'N/A'
                                }</Tag>
                              ) : (
                                <>
                                  Submission ID: {revision.revisedSubmissionId.substring(0, 8)}...
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                    (Submission này không có trong danh sách hiện tại)
                                  </Text>
                                </>
                              )}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {!revision.originalSubmissionId && !revision.revisedSubmissionId && (
                          <Descriptions.Item label="Lưu ý">
                            <Tag color="warning">
                              Revision request này chưa liên kết với submission nào
                            </Tag>
                          </Descriptions.Item>
                        )}
                        {revision.requestedAt && (
                          <Descriptions.Item label="Requested At">
                            {dayjs(revision.requestedAt).format('DD/MM/YYYY HH:mm')}
                          </Descriptions.Item>
                        )}
                        {revision.managerReviewedAt && (
                          <Descriptions.Item label="Manager Reviewed At">
                            {dayjs(revision.managerReviewedAt).format('DD/MM/YYYY HH:mm')}
                          </Descriptions.Item>
                        )}
                        {revision.managerNote && (
                          <Descriptions.Item label="Manager Note">
                            <Text>{revision.managerNote}</Text>
                          </Descriptions.Item>
                        )}
                        {revision.specialistSubmittedAt && (
                          <Descriptions.Item label="Specialist Submitted At">
                            {dayjs(revision.specialistSubmittedAt).format('DD/MM/YYYY HH:mm')}
                          </Descriptions.Item>
                        )}
                        {revision.customerConfirmedAt && (
                          <Descriptions.Item label="Customer Confirmed At">
                            {dayjs(revision.customerConfirmedAt).format('DD/MM/YYYY HH:mm')}
                          </Descriptions.Item>
                        )}
                        {revision.revisionDueAt && (
                          <Descriptions.Item label="Revision Deadline">
                            <Space>
                              <Text strong>
                                {dayjs(revision.revisionDueAt).format('DD/MM/YYYY HH:mm')}
                                {revision.revisionDeadlineDays && (
                                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                    (+{revision.revisionDeadlineDays} ngày SLA)
                                  </Text>
                                )}
                              </Text>
                              {dayjs(revision.revisionDueAt).isBefore(dayjs()) && (
                                <Tag color="red">Quá hạn</Tag>
                              )}
                              {!dayjs(revision.revisionDueAt).isBefore(dayjs()) && (
                                <Tag color="blue">
                                  Còn {dayjs(revision.revisionDueAt).diff(dayjs(), 'day')} ngày
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
    </div>
  );
};

export default MilestoneDeliveriesPage;

