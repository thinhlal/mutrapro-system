import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Typography,
  Spin,
  message,
  Descriptions,
  Modal,
  Input,
  Alert,
  Collapse,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getMyRevisionRequests,
  reviewRevisionRequest,
} from '../../../services/revisionRequestService';
import styles from './AdminRevisionRequestsManagement.module.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const REVISION_STATUS_COLORS = {
  pending_manager_review: 'orange',
  in_revision: 'processing',
  waiting_manager_review: 'blue',
  approved_pending_delivery: 'cyan',
  waiting_customer_confirm: 'purple',
  completed: 'success',
  rejected: 'error',
  canceled: 'default',
};

const REVISION_STATUS_LABELS = {
  pending_manager_review: 'Chờ Manager duyệt',
  in_revision: 'Đang chỉnh sửa',
  waiting_manager_review: 'Chờ Manager review',
  approved_pending_delivery: 'Đã duyệt, chờ deliver',
  waiting_customer_confirm: 'Chờ Customer xác nhận',
  completed: 'Hoàn thành',
  rejected: 'Từ chối',
  canceled: 'Đã hủy',
};

const AdminRevisionRequestsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRevisionRequest, setSelectedRevisionRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState(''); // 'approve' or 'reject'
  const [managerNote, setManagerNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRevisionRequests();
  }, [statusFilter]);

  const loadRevisionRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyRevisionRequests(statusFilter);
      if (response?.status === 'success' && response?.data) {
        setRevisionRequests(Array.isArray(response.data) ? response.data : []);
      } else {
        setRevisionRequests([]);
      }
    } catch (error) {
      console.error('Error loading revision requests:', error);
      message.error(
        error?.response?.data?.message ||
          'Lỗi khi tải danh sách revision requests'
      );
      setRevisionRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (revision, action) => {
    setSelectedRevisionRequest(revision);
    setReviewAction(action);
    setManagerNote('');
    setReviewModalVisible(true);
  };

  const handleReviewRevisionRequest = async () => {
    if (!selectedRevisionRequest) return;

    try {
      setActionLoading(true);
      const response = await reviewRevisionRequest(
        selectedRevisionRequest.revisionRequestId,
        reviewAction,
        managerNote
      );

      if (response?.status === 'success') {
        message.success(
          reviewAction === 'approve'
            ? 'Đã duyệt revision request'
            : 'Đã từ chối revision request'
        );
        setReviewModalVisible(false);
        setSelectedRevisionRequest(null);
        setManagerNote('');
        await loadRevisionRequests();
      } else {
        message.error(response?.message || 'Lỗi khi review revision request');
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

  const formatDateTime = dateString => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const columns = [
    {
      title: 'Revision Round',
      dataIndex: 'revisionRound',
      key: 'revisionRound',
      width: 100,
      render: round => <Text strong>#{round}</Text>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: title => <Text strong>{title || 'N/A'}</Text>,
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (_, record) => (
        <Tag color={record.isFreeRevision ? 'blue' : 'orange'}>
          {record.isFreeRevision ? 'Free' : 'Paid'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: status => {
        const statusLower = status?.toLowerCase();
        return (
          <Tag color={REVISION_STATUS_COLORS[statusLower] || 'default'}>
            {REVISION_STATUS_LABELS[statusLower] || status}
          </Tag>
        );
      },
    },
    {
      title: 'Contract',
      key: 'contract',
      width: 200,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/admin/contracts/${record.contractId}`)}
        >
          {record.contractId?.substring(0, 8)}...
        </Button>
      ),
    },
    {
      title: 'Task Assignment',
      key: 'assignment',
      width: 200,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() =>
            navigate(
              `/admin/tasks/${record.contractId}/${record.taskAssignmentId}`
            )
          }
        >
          {record.taskAssignmentId?.substring(0, 8)}...
        </Button>
      ),
    },
    {
      title: 'Requested At',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      width: 150,
      render: date => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const status = record.status?.toLowerCase();
        if (status === 'pending_manager_review') {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleOpenReviewModal(record, 'approve')}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleOpenReviewModal(record, 'reject')}
              >
                Reject
              </Button>
            </Space>
          );
        }
        if (status === 'waiting_manager_review') {
          return (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(
                  `/admin/tasks/${record.contractId}/${record.taskAssignmentId}`
                )
              }
            >
              Review Submission
            </Button>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
  ];

  return (
    <div className={styles.container}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Title level={3} style={{ margin: 0 }}>
              Managing Revision Requests
            </Title>
            <Space>
              <Select
                placeholder="Lọc theo status"
                allowClear
                style={{ width: 200 }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="PENDING_MANAGER_REVIEW">
                  Chờ Manager duyệt
                </Option>
                <Option value="IN_REVISION">Đang chỉnh sửa</Option>
                <Option value="WAITING_MANAGER_REVIEW">
                  Chờ Manager review
                </Option>
                <Option value="APPROVED_PENDING_DELIVERY">
                  Đã duyệt, chờ deliver
                </Option>
                <Option value="WAITING_CUSTOMER_CONFIRM">
                  Chờ Customer xác nhận
                </Option>
                <Option value="COMPLETED">Hoàn thành</Option>
                <Option value="REJECTED">Từ chối</Option>
                <Option value="CANCELED">Đã hủy</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadRevisionRequests}
                loading={loading}
              >
                Làm mới
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={revisionRequests}
            rowKey="revisionRequestId"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: total => `Tổng: ${total} revision requests`,
            }}
            expandable={{
              expandedRowRender: record => (
                <div style={{ padding: '16px' }}>
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Revision Type">
                      <Space>
                        <Tag
                          color={record.isFreeRevision ? 'blue' : 'orange'}
                          style={{ fontSize: 13 }}
                        >
                          {record.isFreeRevision
                            ? 'Free Revision (Miễn phí)'
                            : 'Paid Revision (Có phí)'}
                        </Tag>
                        {!record.isFreeRevision && record.paidWalletTxId && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            TX: {record.paidWalletTxId.substring(0, 8)}...
                          </Text>
                        )}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                      <Paragraph>{record.description || 'N/A'}</Paragraph>
                    </Descriptions.Item>
                    {record.originalSubmissionId && (
                      <Descriptions.Item label="Original Submission">
                        <Text>
                          Submission ID:{' '}
                          {record.originalSubmissionId.substring(0, 8)}...
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
                    {record.revisedSubmissionId && (
                      <Descriptions.Item label="Revised Submission">
                        <Text>
                          Submission ID:{' '}
                          {record.revisedSubmissionId.substring(0, 8)}...
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
                    <Descriptions.Item label="Requested At">
                      {formatDateTime(record.requestedAt)}
                    </Descriptions.Item>
                    {record.managerNote && (
                      <Descriptions.Item label="Manager Note">
                        <Alert
                          message="Ghi chú từ Manager"
                          description={record.managerNote}
                          type="info"
                          showIcon
                        />
                      </Descriptions.Item>
                    )}
                    {record.specialistSubmittedAt && (
                      <Descriptions.Item label="Specialist Submitted At">
                        {formatDateTime(record.specialistSubmittedAt)}
                      </Descriptions.Item>
                    )}
                    {record.managerReviewedAt && (
                      <Descriptions.Item label="Manager Reviewed At">
                        {formatDateTime(record.managerReviewedAt)}
                      </Descriptions.Item>
                    )}
                    {record.revisionDueAt && (
                      <Descriptions.Item label="Revision Deadline">
                        <Space>
                          <Text strong>
                            {formatDateTime(record.revisionDueAt)}
                            {record.revisionDeadlineDays && (
                              <Text
                                type="secondary"
                                style={{ fontSize: 11, marginLeft: 4 }}
                              >
                                (+{record.revisionDeadlineDays} ngày SLA)
                              </Text>
                            )}
                          </Text>
                          {dayjs(record.revisionDueAt).isBefore(dayjs()) && (
                            <Tag color="red">Quá hạn</Tag>
                          )}
                          {!dayjs(record.revisionDueAt).isBefore(dayjs()) && (
                            <Tag color="blue">
                              Còn{' '}
                              {dayjs(record.revisionDueAt).diff(dayjs(), 'day')}{' '}
                              ngày
                            </Tag>
                          )}
                        </Space>
                      </Descriptions.Item>
                    )}
                    {record.deliveredAt && (
                      <Descriptions.Item label="Delivered At">
                        {formatDateTime(record.deliveredAt)}
                      </Descriptions.Item>
                    )}
                    {record.customerConfirmedAt && (
                      <Descriptions.Item label="Customer Confirmed At">
                        {formatDateTime(record.customerConfirmedAt)}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </div>
              ),
            }}
          />
        </Space>
      </Card>

      {/* Review Revision Request Modal */}
      <Modal
        title={
          reviewAction === 'approve'
            ? 'Duyệt Revision Request'
            : 'Từ chối Revision Request'
        }
        open={reviewModalVisible}
        onOk={handleReviewRevisionRequest}
        onCancel={() => {
          setReviewModalVisible(false);
          setSelectedRevisionRequest(null);
          setManagerNote('');
        }}
        confirmLoading={actionLoading}
        okText={reviewAction === 'approve' ? 'Duyệt' : 'Từ chối'}
        okButtonProps={{
          danger: reviewAction === 'reject',
        }}
      >
        {selectedRevisionRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message={`Revision Round #${selectedRevisionRequest.revisionRound}`}
              description={selectedRevisionRequest.title}
              type="info"
              showIcon
            />
            <Paragraph>{selectedRevisionRequest.description}</Paragraph>
            {reviewAction === 'reject' && (
              <div>
                <Text strong>Lý do từ chối (tùy chọn):</Text>
                <TextArea
                  rows={4}
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder="Nhập lý do từ chối revision request này..."
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
            {reviewAction === 'approve' && (
              <div>
                <Text strong>Ghi chú (tùy chọn):</Text>
                <TextArea
                  rows={4}
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder="Nhập ghi chú cho specialist..."
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default AdminRevisionRequestsManagement;
