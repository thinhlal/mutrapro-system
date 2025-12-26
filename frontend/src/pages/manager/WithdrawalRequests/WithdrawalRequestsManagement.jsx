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
  InputNumber,
  Upload,
  Image,
  Form,
  Tooltip,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  CopyOutlined,
  EyeInvisibleOutlined,
  EyeOutlined as EyeOutlinedIcon,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  failWithdrawal,
  downloadProofFile,
} from '../../../services/adminWalletService';
import { formatPrice } from '../../../services/pricingMatrixService';
import { getBankList } from '../../../services/vietqrService';
import styles from './WithdrawalRequestsManagement.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const WITHDRAWAL_STATUS_COLORS = {
  PENDING_REVIEW: 'orange',
  APPROVED: 'blue',
  PROCESSING: 'processing',
  COMPLETED: 'success',
  REJECTED: 'error',
  FAILED: 'error',
};

const WITHDRAWAL_STATUS_LABELS = {
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
};

const WithdrawalRequestsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Modal states
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [failModalVisible, setFailModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Form states
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [completeForm] = Form.useForm();
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [bankList, setBankList] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);

  useEffect(() => {
    loadWithdrawalRequests();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  useEffect(() => {
    if (completeModalVisible) {
      loadBankList();
    }
  }, [completeModalVisible]);

  const loadBankList = async () => {
    setLoadingBanks(true);
    try {
      const banks = await getBankList();
      setBankList(banks);
    } catch (error) {
      console.error('Error loading bank list:', error);
      message.warning(
        'Cannot load bank list. Please enter manually.'
      );
    } finally {
      setLoadingBanks(false);
    }
  };

  // Mask bank account number (show last 4 digits)
  const maskBankAccount = accountNumber => {
    if (!accountNumber) return 'N/A';
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const loadWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const response = await getWithdrawalRequests({
        status: statusFilter,
        page: pagination.current - 1,
        size: pagination.pageSize,
      });
      if (response?.status === 'success' && response?.data) {
        setWithdrawalRequests(response.data.content || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.totalElements || 0,
        }));
      } else {
        setWithdrawalRequests([]);
      }
    } catch (error) {
      console.error('Error loading withdrawal requests:', error);
      message.error(
        error?.response?.data?.message ||
          'Error loading withdrawal requests'
      );
      setWithdrawalRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      const response = await approveWithdrawal(
        selectedRequest.withdrawalRequestId,
        adminNote || null
      );

      if (response?.status === 'success') {
        message.success('Approved withdrawal request');
        setApproveModalVisible(false);
        setSelectedRequest(null);
        setAdminNote('');
        await loadWithdrawalRequests();
      } else {
        message.error(
          response?.message || 'Error approving withdrawal request'
        );
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Error approving withdrawal request'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      message.warning('Please enter the rejection reason');
      return;
    }

    try {
      setActionLoading(true);
      const response = await rejectWithdrawal(
        selectedRequest.withdrawalRequestId,
        rejectionReason,
        adminNote || null
      );

      if (response?.status === 'success') {
        message.success('Rejected withdrawal request');
        setRejectModalVisible(false);
        setSelectedRequest(null);
        setRejectionReason('');
        setAdminNote('');
        await loadWithdrawalRequests();
      } else {
        message.error(
          response?.message || 'Error rejecting withdrawal request'
        );
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Error rejecting withdrawal request'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async values => {
    if (!selectedRequest) {
      message.warning('Withdrawal request not found');
      return;
    }

    if (!confirmComplete) {
      message.warning('Please confirm that the transfer has been completed');
      return;
    }

    try {
      setActionLoading(true);
      const response = await completeWithdrawal(
        selectedRequest.withdrawalRequestId,
        {
          paidAmount: values.paidAmount,
          provider: values.provider,
          bankRef: values.bankRef || values.txnCode, // Use bankRef or txnCode
          txnCode: values.txnCode,
          proofFile: proofFile,
        }
      );

      if (response?.status === 'success') {
        message.success('Completed withdrawal');
        setCompleteModalVisible(false);
        setSelectedRequest(null);
        completeForm.resetFields();
        setProofFile(null);
        setProofPreview(null);
        setConfirmComplete(false);
        await loadWithdrawalRequests();
      } else {
        message.error(response?.message || 'Error completing withdrawal');
      }
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Error completing withdrawal'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleFail = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      message.warning('Please enter the failure reason');
      return;
    }

    try {
      setActionLoading(true);
      const response = await failWithdrawal(
        selectedRequest.withdrawalRequestId,
        rejectionReason
      );

      if (response?.status === 'success') {
        message.success('Marked withdrawal as failed');
        setFailModalVisible(false);
        setSelectedRequest(null);
        setRejectionReason('');
        await loadWithdrawalRequests();
      } else {
        message.error(
          response?.message || 'Error marking withdrawal as failed'
        );
      }
    } catch (error) {
      console.error('Error failing withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Error marking withdrawal as failed'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const loadProofImage = async request => {
    if (!request.proofUrl) {
      setProofImageUrl(null);
      return;
    }

    try {
      setLoadingProof(true);
      const blob = await downloadProofFile(request.withdrawalRequestId);
      const url = window.URL.createObjectURL(blob);
      setProofImageUrl(url);
    } catch (error) {
      console.error('Error loading proof:', error);
      message.error('Error loading proof file');
      setProofImageUrl(null);
    } finally {
      setLoadingProof(false);
    }
  };

  const handleViewProof = async request => {
    if (!request.proofUrl) {
      message.warning('No proof file');
      return;
    }

    try {
      const blob = await downloadProofFile(request.withdrawalRequestId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing proof:', error);
      message.error('Error viewing proof file');
    }
  };

  const formatDateTime = dateString => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const formatPriceDisplay = amount => {
    if (!amount) return 'N/A';
    return formatPrice(amount);
  };

  const columns = [
    {
      title: 'Withdrawal Request ID',
      dataIndex: 'withdrawalRequestId',
      key: 'withdrawalRequestId',
      width: 150,
      ellipsis: true,
      render: id => <Text code>{id?.substring(0, 8)}...</Text>,
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
      render: id => <Text>{id?.substring(0, 8)}...</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: amount => <Text strong>{formatPriceDisplay(amount)}</Text>,
    },
    {
      title: 'Bank',
      key: 'bank',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.bankName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.accountHolderName}
          </Text>
          <Text code style={{ fontSize: 11 }}>
            {record.bankAccountNumber}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: status => (
        <Tag color={WITHDRAWAL_STATUS_COLORS[status]}>
          {WITHDRAWAL_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: date => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        const status = record.status;
        return (
          <Space direction="vertical" size="small">
            {status === 'PENDING_REVIEW' && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    setSelectedRequest(record);
                    setAdminNote('');
                    setApproveModalVisible(true);
                  }}
                  block
                >
                  Approve
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    setSelectedRequest(record);
                    setRejectionReason('');
                    setAdminNote('');
                    setRejectModalVisible(true);
                  }}
                  block
                >
                  Reject
                </Button>
              </>
            )}
            {status === 'APPROVED' && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    setSelectedRequest(record);
                    completeForm.resetFields();
                    setProofFile(null);
                    setProofPreview(null);
                    setCompleteModalVisible(true);
                  }}
                  block
                >
                  Complete
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setSelectedRequest(record);
                    setRejectionReason('');
                    setFailModalVisible(true);
                  }}
                  block
                >
                  Fail
                </Button>
              </>
            )}
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedRequest(record);
                setDetailModalVisible(true);
                if (record.proofUrl) {
                  loadProofImage(record);
                } else {
                  setProofImageUrl(null);
                }
              }}
              block
            >
              Details
            </Button>
          </Space>
        );
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
              Manage Withdrawal Requests
            </Title>
            <Space>
              <Select
                placeholder="Filter by status"
                allowClear
                style={{ width: 200 }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="PENDING_REVIEW">Pending Review</Option>
                <Option value="APPROVED">Approved</Option>
                <Option value="PROCESSING">Processing</Option>
                <Option value="COMPLETED">Completed</Option>
                <Option value="REJECTED">Rejected</Option>
                <Option value="FAILED">Failed</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadWithdrawalRequests}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={withdrawalRequests}
            rowKey="withdrawalRequestId"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: total => `Total: ${total} requests`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize });
              },
            }}
          />
        </Space>
      </Card>

      {/* Approve Modal */}
      <Modal
        title="Approve Withdrawal Request"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false);
          setSelectedRequest(null);
          setAdminNote('');
        }}
        confirmLoading={actionLoading}
        okText="Approve"
        cancelText="Cancel"
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Amount">
                <Text strong>{formatPriceDisplay(selectedRequest.amount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Bank">
                {selectedRequest.bankName} - {selectedRequest.accountHolderName}
              </Descriptions.Item>
              <Descriptions.Item label="Bank Account Number">
                {selectedRequest.bankAccountNumber}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>Ghi chú (optional):</Text>
              <TextArea
                rows={3}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Enter admin note if any..."
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Withdrawal Request"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setSelectedRequest(null);
          setRejectionReason('');
          setAdminNote('');
        }}
        confirmLoading={actionLoading}
        okText="Reject"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Amount">
                <Text strong>{formatPriceDisplay(selectedRequest.amount)}</Text>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>
                Rejection Reason <Text type="danger">*</Text>:
              </Text>
              <TextArea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                required
              />
            </div>
            <div>
              <Text strong>Admin Note (optional):</Text>
              <TextArea
                rows={2}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Enter admin note if any..."
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Complete Modal */}
      <Modal
        title="Complete Withdrawal"
        open={completeModalVisible}
        onOk={() => completeForm.submit()}
        onCancel={() => {
          setCompleteModalVisible(false);
          setSelectedRequest(null);
          completeForm.resetFields();
          setProofFile(null);
          setProofPreview(null);
          setConfirmComplete(false);
          setShowFullAccountNumber(false);
        }}
        confirmLoading={actionLoading}
        okText="Complete"
        cancelText="Cancel"
        width={700}
        okButtonProps={{ disabled: !confirmComplete }}
      >
        {selectedRequest && (
          <Form
            form={completeForm}
            layout="vertical"
            onFinish={handleComplete}
            initialValues={{
              paidAmount: selectedRequest.amount,
            }}
          >
            {/* Thông tin nhận tiền (masked) */}
            <Card
              size="small"
              style={{ marginBottom: 16, background: '#f5f5f5' }}
            >
              <Space
                direction="vertical"
                size="small"
                style={{ width: '100%' }}
              >
                <Text strong>Payment information:</Text>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Bank">
                    <Text strong>{selectedRequest.bankName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Bank Account Number">
                    <Space>
                      <Text code>
                        {showFullAccountNumber
                          ? selectedRequest.bankAccountNumber
                          : maskBankAccount(selectedRequest.bankAccountNumber)}
                      </Text>
                      <Button
                        type="link"
                        size="small"
                        icon={
                          showFullAccountNumber ? (
                            <EyeInvisibleOutlined />
                          ) : (
                            <EyeOutlinedIcon />
                          )
                        }
                        onClick={() =>
                          setShowFullAccountNumber(!showFullAccountNumber)
                        }
                      >
                        {showFullAccountNumber ? 'Hide' : 'View full'}
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              selectedRequest.bankAccountNumber
                            );
                            message.success('Account number copied!');
                          } catch (error) {
                            message.error('Error copying account number');
                          }
                        }}
                      >
                        Copy
                      </Button>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Account Holder Name">
                    {selectedRequest.accountHolderName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Requested amount">
                    <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                      {formatPriceDisplay(selectedRequest.amount)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Space>
            </Card>

            <Form.Item
              label="Actual amount transferred"
              name="paidAmount"
              rules={[
                { required: true, message: 'Please enter the amount transferred' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                formatter={value =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="Enter the amount transferred"
                onChange={value => {
                  const diff = Math.abs(
                    parseFloat(value || 0) - parseFloat(selectedRequest.amount)
                  );
                  if (diff > 0.01) {
                    // Show warning if different
                    completeForm.setFields([
                      {
                        name: 'paidAmount',
                        errors: [],
                      },
                    ]);
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              label="Ngân hàng chuyển (From bank)"
              name="provider"
              tooltip="Bank/Provider used to transfer money"
            >
              <Select
                placeholder="Select bank to transfer"
                allowClear
                showSearch
                loading={loadingBanks}
                filterOption={(input, option) =>
                  (option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase()) ||
                  (option?.value ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={bankList.map(bank => ({
                  value: bank.code || bank.shortName || bank.name,
                  label: bank.shortName || bank.name,
                  code: bank.code,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Transaction Code (Reference / Trace No.)"
              name="bankRef"
              tooltip="Transaction code displayed in bank statement"
            >
              <Input placeholder="Enter transaction code from bank" />
            </Form.Item>

            <Form.Item
              label="Transaction Code (optional)"
              name="txnCode"
              tooltip="Transaction code from intermediary system (MoMo/Payment provider) - only if available"
            >
              <Input placeholder="Enter transaction code from payment provider (if any)" />
            </Form.Item>

            <Form.Item
              label="Proof File (Receipt/Transfer Image)"
              help="Accepts: .jpg, .png, .pdf (maximum 10MB). Do not upload images with unnecessary sensitive information."
            >
              <Upload
                beforeUpload={file => {
                  // Check file type
                  const isValidType =
                    file.type.startsWith('image/') ||
                    file.type === 'application/pdf';
                  if (!isValidType) {
                    message.error(
                      'Only allows image files (.jpg, .png) or PDF!'
                    );
                    return Upload.LIST_IGNORE;
                  }
                  // Check size (max 10MB)
                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error('File must be less than 10MB!');
                    return Upload.LIST_IGNORE;
                  }
                  setProofFile(file);
                  // Preview for images only
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = e => setProofPreview(e.target.result);
                    reader.readAsDataURL(file);
                  } else {
                    setProofPreview(null);
                  }
                  return false; // Prevent auto upload
                }}
                onRemove={() => {
                  setProofFile(null);
                  setProofPreview(null);
                }}
                fileList={
                  proofFile
                    ? [
                        {
                          uid: proofFile.uid || '-1',
                          name: proofFile.name,
                          status: 'done',
                        },
                      ]
                    : []
                }
                maxCount={1}
                accept="image/*,.pdf"
              >
                <Button icon={<UploadOutlined />}>Upload image/receipt</Button>
              </Upload>
              {proofPreview && (
                <div style={{ marginTop: 8 }}>
                  <Image
                    src={proofPreview}
                    alt="Preview"
                    style={{ maxWidth: 200, maxHeight: 200 }}
                    preview
                  />
                </div>
              )}
              {proofFile && proofFile.type === 'application/pdf' && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue">
                    <FileTextOutlined /> {proofFile.name}
                  </Tag>
                </div>
              )}
            </Form.Item>

            {/* Confirmation checkbox */}
            <Form.Item required>
              <Space>
                <input
                  type="checkbox"
                  checked={confirmComplete}
                  onChange={e => setConfirmComplete(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <Text>
                  I confirm that the transfer has been completed. This action
                  cannot be undone.
                </Text>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Fail Modal */}
      <Modal
        title="Mark Withdrawal as Failed"
        open={failModalVisible}
        onOk={handleFail}
        onCancel={() => {
          setFailModalVisible(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }}
        confirmLoading={actionLoading}
        okText="Confirm"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Amount">
                <Text strong>{formatPriceDisplay(selectedRequest.amount)}</Text>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>
                Failure Reason <Text type="danger">*</Text>:
              </Text>
              <TextArea
                rows={4}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter failure reason (e.g. Mistakenly transferred to the wrong account, Bank system error...)"
                required
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Withdrawal Request Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRequest(null);
          if (proofImageUrl) {
            window.URL.revokeObjectURL(proofImageUrl);
            setProofImageUrl(null);
          }
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedRequest(null);
              if (proofImageUrl) {
                window.URL.revokeObjectURL(proofImageUrl);
                setProofImageUrl(null);
              }
            }}
          >
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedRequest && (
          <Spin spinning={loadingProof}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Request ID" span={2}>
                  <Text code copyable>
                    {selectedRequest.withdrawalRequestId}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="User ID">
                  <Text code>{selectedRequest.userId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Wallet ID">
                  <Text code>{selectedRequest.walletId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                  <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                    {formatPriceDisplay(selectedRequest.amount)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Currency">
                  <Tag>{selectedRequest.currency}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={WITHDRAWAL_STATUS_COLORS[selectedRequest.status]}>
                    {WITHDRAWAL_STATUS_LABELS[selectedRequest.status] ||
                      selectedRequest.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {formatDateTime(selectedRequest.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Bank" span={2}>
                  <Text strong>{selectedRequest.bankName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Bank Account Number" span={2}>
                  <Text code>{selectedRequest.bankAccountNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Account Holder Name" span={2}>
                  <Text>{selectedRequest.accountHolderName}</Text>
                </Descriptions.Item>
                {selectedRequest.note && (
                  <Descriptions.Item label="Note" span={2}>
                    <Text type="secondary">{selectedRequest.note}</Text>
                  </Descriptions.Item>
                )}
                {selectedRequest.rejectedBy && (
                  <>
                    <Descriptions.Item label="Rejected At">
                      {formatDateTime(selectedRequest.rejectedAt)}
                    </Descriptions.Item>
                    {selectedRequest.rejectionReason && (
                      <Descriptions.Item label="Rejection Reason" span={2}>
                        <Text type="danger">
                          {selectedRequest.rejectionReason}
                        </Text>
                      </Descriptions.Item>
                    )}
                  </>
                )}
                {selectedRequest.completedBy && (
                  <>
                    <Descriptions.Item label="Completed At">
                      {formatDateTime(selectedRequest.completedAt)}
                    </Descriptions.Item>
                    {selectedRequest.paidAmount && (
                      <Descriptions.Item label="Paid Amount">
                        <Text strong style={{ color: '#52c41a' }}>
                          {formatPriceDisplay(selectedRequest.paidAmount)}
                        </Text>
                        {parseFloat(selectedRequest.paidAmount) !==
                          parseFloat(selectedRequest.amount) && (
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            (Requested amount:{' '}
                            {formatPriceDisplay(selectedRequest.amount)})
                          </Text>
                        )}
                      </Descriptions.Item>
                    )}
                    {selectedRequest.provider && (
                      <Descriptions.Item label="Provider">
                        <Tag color="blue">{selectedRequest.provider}</Tag>
                      </Descriptions.Item>
                    )}
                    {selectedRequest.bankRef && (
                      <Descriptions.Item label="Bank Reference">
                        <Text code copyable>
                          {selectedRequest.bankRef}
                        </Text>
                      </Descriptions.Item>
                    )}
                    {selectedRequest.txnCode && (
                      <Descriptions.Item label="Transaction Code">
                        <Text code copyable>
                          {selectedRequest.txnCode}
                        </Text>
                      </Descriptions.Item>
                    )}
                  </>
                )}
                {selectedRequest.failedBy && (
                  <>
                    <Descriptions.Item label="Failed By">
                      <Text>{selectedRequest.failedBy}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Failed At">
                      {formatDateTime(selectedRequest.failedAt)}
                    </Descriptions.Item>
                    {selectedRequest.failureReason && (
                      <Descriptions.Item label="Failure Reason" span={2}>
                        <Text type="danger">
                          {selectedRequest.failureReason}
                        </Text>
                      </Descriptions.Item>
                    )}
                  </>
                )}
                {selectedRequest.adminNote && (
                  <Descriptions.Item label="Admin/Manager Note" span={2}>
                    <Text type="secondary" style={{ fontStyle: 'italic' }}>
                      {selectedRequest.adminNote}
                    </Text>
                  </Descriptions.Item>
                )}
                {selectedRequest.walletTxId && (
                  <Descriptions.Item label="Transaction ID" span={2}>
                    <Text code copyable>
                      {selectedRequest.walletTxId}
                    </Text>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Proof Image */}
              {selectedRequest.proofUrl && (
                <>
                  <Divider orientation="left">Proof File</Divider>
                  {loadingProof ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Loading proof file...</Text>
                      </div>
                    </div>
                  ) : proofImageUrl ? (
                    <div style={{ textAlign: 'center' }}>
                      <Image
                        src={proofImageUrl}
                        alt="Proof of transfer"
                        style={{ maxWidth: '100%', maxHeight: '500px' }}
                        preview={{
                          mask: 'View image',
                        }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleViewProof(selectedRequest)}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Text type="secondary">Cannot load proof file</Text>
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleViewProof(selectedRequest)}
                        >
                          Try downloading
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Space>
          </Spin>
        )}
      </Modal>
    </div>
  );
};

export default WithdrawalRequestsManagement;
