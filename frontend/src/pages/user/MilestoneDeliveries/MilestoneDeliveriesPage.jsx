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
import FileList from '../../../components/common/FileList/FileList';
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
  const [revisionReason, setRevisionReason] = useState('');

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
        setRequestInfo(data.request);
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      } else {
        setContractInfo(null);
        setMilestoneInfo(null);
        setRequestInfo(null);
        setSubmissions([]);
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
    setRevisionReason('');
    setReviewModalVisible(true);
  };

  const handleReviewSubmission = async () => {
    if (!selectedSubmission) return;

    if (reviewAction === 'request_revision' && !revisionReason.trim()) {
      message.warning('Vui lòng nhập lý do yêu cầu chỉnh sửa');
      return;
    }

    try {
      setActionLoading(true);
      const response = await customerReviewSubmission(
        selectedSubmission.submissionId,
        reviewAction,
        reviewAction === 'request_revision' ? revisionReason : ''
      );

      if (response?.data?.status === 'success') {
        message.success(
          reviewAction === 'accept'
            ? 'Đã chấp nhận submission'
            : 'Đã yêu cầu chỉnh sửa submission'
        );
        setReviewModalVisible(false);
        setSelectedSubmission(null);
        setRevisionReason('');
        await loadDeliveries();
        // Reload contract page if needed
        if (reviewAction === 'request_revision') {
          // Navigate back to contract detail to see updated status
          setTimeout(() => {
            navigate(`/contracts/${contractId}`);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error reviewing submission:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi review submission'
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
                        {submission.status?.toLowerCase() === 'delivered' && (
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
                            <Button
                              icon={<CloseCircleOutlined />}
                              size="small"
                              onClick={() =>
                                handleOpenReviewModal(
                                  submission,
                                  'request_revision'
                                )
                              }
                            >
                              Request Revision
                            </Button>
                          </Space>
                        )}
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
                  </Card>
                ))}
              </Space>
            )}
          </Spin>
        </Card>
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
          setRevisionReason('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setReviewModalVisible(false);
              setSelectedSubmission(null);
              setRevisionReason('');
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
              description="Vui lòng nhập lý do yêu cầu chỉnh sửa. Specialist sẽ nhận được thông báo và thực hiện chỉnh sửa theo yêu cầu của bạn."
              type="warning"
              showIcon
            />
            <div>
              <Text strong>Lý do yêu cầu chỉnh sửa:</Text>
              <TextArea
                rows={4}
                value={revisionReason}
                onChange={e => setRevisionReason(e.target.value)}
                placeholder="Nhập lý do yêu cầu chỉnh sửa..."
                style={{ marginTop: 8 }}
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

