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
  PENDING_REVIEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
  FAILED: 'Thất bại',
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
  const [amountDifferenceReason, setAmountDifferenceReason] = useState('');
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
        'Không thể tải danh sách ngân hàng. Vui lòng nhập thủ công.'
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
          'Lỗi khi tải danh sách withdrawal requests'
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
        message.success('Đã duyệt withdrawal request');
        setApproveModalVisible(false);
        setSelectedRequest(null);
        setAdminNote('');
        await loadWithdrawalRequests();
      } else {
        message.error(response?.message || 'Lỗi khi duyệt withdrawal request');
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi duyệt withdrawal request'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối');
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
        message.success('Đã từ chối withdrawal request');
        setRejectModalVisible(false);
        setSelectedRequest(null);
        setRejectionReason('');
        setAdminNote('');
        await loadWithdrawalRequests();
      } else {
        message.error(
          response?.message || 'Lỗi khi từ chối withdrawal request'
        );
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi từ chối withdrawal request'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async values => {
    if (!selectedRequest) {
      message.warning('Không tìm thấy withdrawal request');
      return;
    }

    if (!confirmComplete) {
      message.warning('Vui lòng xác nhận đã chuyển khoản thành công');
      return;
    }

    // Check if amount is different and reason is required
    const amountDiff =
      parseFloat(values.paidAmount) - parseFloat(selectedRequest.amount);
    if (Math.abs(amountDiff) > 0.01 && !amountDifferenceReason.trim()) {
      message.warning('Vui lòng nhập lý do lệch số tiền');
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
        },
        proofFile
      );

      if (response?.status === 'success') {
        message.success('Đã hoàn thành withdrawal');
        setCompleteModalVisible(false);
        setSelectedRequest(null);
        completeForm.resetFields();
        setProofFile(null);
        setProofPreview(null);
        setAmountDifferenceReason('');
        setConfirmComplete(false);
        await loadWithdrawalRequests();
      } else {
        message.error(response?.message || 'Lỗi khi hoàn thành withdrawal');
      }
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi hoàn thành withdrawal'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleFail = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      message.warning('Vui lòng nhập lý do thất bại');
      return;
    }

    try {
      setActionLoading(true);
      const response = await failWithdrawal(
        selectedRequest.withdrawalRequestId,
        rejectionReason
      );

      if (response?.status === 'success') {
        message.success('Đã đánh dấu withdrawal thất bại');
        setFailModalVisible(false);
        setSelectedRequest(null);
        setRejectionReason('');
        await loadWithdrawalRequests();
      } else {
        message.error(
          response?.message || 'Lỗi khi đánh dấu withdrawal thất bại'
        );
      }
    } catch (error) {
      console.error('Error failing withdrawal:', error);
      message.error(
        error?.response?.data?.message || 'Lỗi khi đánh dấu withdrawal thất bại'
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
      message.error('Lỗi khi tải proof file');
      setProofImageUrl(null);
    } finally {
      setLoadingProof(false);
    }
  };

  const handleViewProof = async request => {
    if (!request.proofUrl) {
      message.warning('Không có proof file');
      return;
    }

    try {
      const blob = await downloadProofFile(request.withdrawalRequestId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing proof:', error);
      message.error('Lỗi khi xem proof file');
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
      title: 'Request ID',
      dataIndex: 'withdrawalRequestId',
      key: 'withdrawalRequestId',
      width: 150,
      render: id => <Text code>{id?.substring(0, 8)}...</Text>,
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 150,
      render: id => <Text>{id?.substring(0, 8)}...</Text>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: amount => <Text strong>{formatPriceDisplay(amount)}</Text>,
    },
    {
      title: 'Ngân hàng',
      key: 'bank',
      width: 200,
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
      width: 120,
      render: status => (
        <Tag color={WITHDRAWAL_STATUS_COLORS[status]}>
          {WITHDRAWAL_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: date => formatDateTime(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      fixed: 'right',
      render: (_, record) => {
        const status = record.status;
        return (
          <Space>
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
                >
                  Duyệt
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
                >
                  Từ chối
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
                >
                  Hoàn thành
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
                >
                  Thất bại
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
            >
              Chi tiết
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
                <Option value="PENDING_REVIEW">Chờ duyệt</Option>
                <Option value="APPROVED">Đã duyệt</Option>
                <Option value="PROCESSING">Đang xử lý</Option>
                <Option value="COMPLETED">Hoàn thành</Option>
                <Option value="REJECTED">Từ chối</Option>
                <Option value="FAILED">Thất bại</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadWithdrawalRequests}
                loading={loading}
              >
                Làm mới
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
              showTotal: total => `Tổng: ${total} requests`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize });
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Space>
      </Card>

      {/* Approve Modal */}
      <Modal
        title="Duyệt Withdrawal Request"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false);
          setSelectedRequest(null);
          setAdminNote('');
        }}
        confirmLoading={actionLoading}
        okText="Duyệt"
        cancelText="Hủy"
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Số tiền">
                <Text strong>{formatPriceDisplay(selectedRequest.amount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngân hàng">
                {selectedRequest.bankName} - {selectedRequest.accountHolderName}
              </Descriptions.Item>
              <Descriptions.Item label="Số tài khoản">
                {selectedRequest.bankAccountNumber}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>Ghi chú (optional):</Text>
              <TextArea
                rows={3}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Nhập ghi chú nếu có..."
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Từ chối Withdrawal Request"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          setSelectedRequest(null);
          setRejectionReason('');
          setAdminNote('');
        }}
        confirmLoading={actionLoading}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Số tiền">
                <Text strong>{formatPriceDisplay(selectedRequest.amount)}</Text>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>
                Lý do từ chối <Text type="danger">*</Text>:
              </Text>
              <TextArea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                required
              />
            </div>
            <div>
              <Text strong>Ghi chú (optional):</Text>
              <TextArea
                rows={2}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Nhập ghi chú nếu có..."
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Complete Modal */}
      <Modal
        title="Hoàn thành Withdrawal"
        open={completeModalVisible}
        onOk={() => completeForm.submit()}
        onCancel={() => {
          setCompleteModalVisible(false);
          setSelectedRequest(null);
          completeForm.resetFields();
          setProofFile(null);
          setProofPreview(null);
          setAmountDifferenceReason('');
          setConfirmComplete(false);
          setShowFullAccountNumber(false);
        }}
        confirmLoading={actionLoading}
        okText="Hoàn thành"
        cancelText="Hủy"
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
                <Text strong>Thông tin nhận tiền:</Text>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Ngân hàng nhận">
                    <Text strong>{selectedRequest.bankName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Số TK nhận">
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
                        {showFullAccountNumber ? 'Ẩn' : 'Xem đầy đủ'}
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
                            message.success('Đã copy số tài khoản!');
                          } catch (error) {
                            message.error('Lỗi khi copy số tài khoản');
                          }
                        }}
                      >
                        Copy
                      </Button>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Chủ TK">
                    {selectedRequest.accountHolderName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số tiền yêu cầu">
                    <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                      {formatPriceDisplay(selectedRequest.amount)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Space>
            </Card>

            <Form.Item
              label="Số tiền thực tế đã chuyển"
              name="paidAmount"
              rules={[
                { required: true, message: 'Vui lòng nhập số tiền đã chuyển' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const diff = Math.abs(
                      parseFloat(value) - parseFloat(selectedRequest.amount)
                    );
                    if (diff > 0.01) {
                      // If amount is different, require reason
                      if (!amountDifferenceReason.trim()) {
                        return Promise.reject(
                          new Error('Vui lòng nhập lý do lệch số tiền')
                        );
                      }
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                formatter={value =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="Nhập số tiền đã chuyển"
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

            {/* Lý do lệch số tiền (conditional) */}
            {(() => {
              const paidAmount = completeForm.getFieldValue('paidAmount');
              const diff = paidAmount
                ? Math.abs(
                    parseFloat(paidAmount) - parseFloat(selectedRequest.amount)
                  )
                : 0;
              if (diff > 0.01) {
                return (
                  <Form.Item
                    label="Lý do lệch số tiền"
                    required
                    help="Bắt buộc khi số tiền chuyển khác số tiền yêu cầu"
                  >
                    <TextArea
                      rows={3}
                      value={amountDifferenceReason}
                      onChange={e => setAmountDifferenceReason(e.target.value)}
                      placeholder="Ví dụ: Phí chuyển khoản, Chuyển thiếu do hạn mức, Chuyển dư..."
                      required
                    />
                  </Form.Item>
                );
              }
              return null;
            })()}

            <Form.Item
              label="Ngân hàng chuyển (From bank)"
              name="provider"
              tooltip="Ngân hàng/Provider mà bạn dùng để chuyển tiền"
            >
              <Select
                placeholder="Chọn ngân hàng chuyển"
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
              label="Mã giao dịch (Reference / Trace No.)"
              name="bankRef"
              tooltip="Mã hiển thị trong lịch sử chuyển khoản/bank statement"
            >
              <Input placeholder="Nhập mã giao dịch từ ngân hàng" />
            </Form.Item>

            <Form.Item
              label="Transaction Code (optional)"
              name="txnCode"
              tooltip="Mã từ hệ thống trung gian (MoMo/Payment provider) - chỉ dùng nếu có"
            >
              <Input placeholder="Mã từ payment provider (nếu có)" />
            </Form.Item>

            <Form.Item
              label="Proof File (Biên lai/Ảnh chuyển khoản)"
              help="Chấp nhận: .jpg, .png, .pdf (tối đa 10MB). Không upload ảnh có lộ thông tin không cần thiết."
            >
              <Upload
                beforeUpload={file => {
                  // Check file type
                  const isValidType =
                    file.type.startsWith('image/') ||
                    file.type === 'application/pdf';
                  if (!isValidType) {
                    message.error(
                      'Chỉ cho phép upload file ảnh (.jpg, .png) hoặc PDF!'
                    );
                    return Upload.LIST_IGNORE;
                  }
                  // Check size (max 10MB)
                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error('File phải nhỏ hơn 10MB!');
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
                <Button icon={<UploadOutlined />}>Upload ảnh/biên lai</Button>
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
                  Tôi xác nhận đã chuyển khoản thành công. Hành động này không
                  thể sửa.
                </Text>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Fail Modal */}
      <Modal
        title="Đánh dấu Withdrawal Thất bại"
        open={failModalVisible}
        onOk={handleFail}
        onCancel={() => {
          setFailModalVisible(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }}
        confirmLoading={actionLoading}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Số tiền">
                <Text strong>{formatPriceDisplay(selectedRequest.amount)}</Text>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>
                Lý do thất bại <Text type="danger">*</Text>:
              </Text>
              <TextArea
                rows={4}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do thất bại (ví dụ: Chuyển nhầm tài khoản, Lỗi hệ thống ngân hàng...)"
                required
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết Withdrawal Request"
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
            Đóng
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
                <Descriptions.Item label="Số tiền">
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
                <Descriptions.Item label="Ngày tạo">
                  {formatDateTime(selectedRequest.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Ngân hàng nhận" span={2}>
                  <Text strong>{selectedRequest.bankName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số tài khoản nhận" span={2}>
                  <Text code>{selectedRequest.bankAccountNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Chủ tài khoản" span={2}>
                  <Text>{selectedRequest.accountHolderName}</Text>
                </Descriptions.Item>
                {selectedRequest.note && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    <Text type="secondary">{selectedRequest.note}</Text>
                  </Descriptions.Item>
                )}
                {selectedRequest.approvedBy && (
                  <>
                    <Descriptions.Item label="Approved By">
                      <Text>{selectedRequest.approvedBy}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Approved At">
                      {formatDateTime(selectedRequest.approvedAt)}
                    </Descriptions.Item>
                  </>
                )}
                {selectedRequest.rejectedBy && (
                  <>
                    <Descriptions.Item label="Rejected By">
                      <Text>{selectedRequest.rejectedBy}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Rejected At">
                      {formatDateTime(selectedRequest.rejectedAt)}
                    </Descriptions.Item>
                    {selectedRequest.rejectionReason && (
                      <Descriptions.Item label="Lý do từ chối" span={2}>
                        <Text type="danger">
                          {selectedRequest.rejectionReason}
                        </Text>
                      </Descriptions.Item>
                    )}
                  </>
                )}
                {selectedRequest.completedBy && (
                  <>
                    <Descriptions.Item label="Completed By">
                      <Text>{selectedRequest.completedBy}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Completed At">
                      {formatDateTime(selectedRequest.completedAt)}
                    </Descriptions.Item>
                    {selectedRequest.paidAmount && (
                      <Descriptions.Item label="Số tiền đã chuyển">
                        <Text strong style={{ color: '#52c41a' }}>
                          {formatPriceDisplay(selectedRequest.paidAmount)}
                        </Text>
                        {parseFloat(selectedRequest.paidAmount) !==
                          parseFloat(selectedRequest.amount) && (
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            (Yêu cầu:{' '}
                            {formatPriceDisplay(selectedRequest.amount)})
                          </Text>
                        )}
                      </Descriptions.Item>
                    )}
                    {selectedRequest.provider && (
                      <Descriptions.Item label="Kênh chuyển">
                        <Tag color="blue">{selectedRequest.provider}</Tag>
                      </Descriptions.Item>
                    )}
                    {selectedRequest.bankRef && (
                      <Descriptions.Item label="Mã tham chiếu ngân hàng">
                        <Text code copyable>
                          {selectedRequest.bankRef}
                        </Text>
                      </Descriptions.Item>
                    )}
                    {selectedRequest.txnCode && (
                      <Descriptions.Item label="Mã giao dịch">
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
                      <Descriptions.Item label="Lý do thất bại" span={2}>
                        <Text type="danger">
                          {selectedRequest.failureReason}
                        </Text>
                      </Descriptions.Item>
                    )}
                  </>
                )}
                {selectedRequest.adminNote && (
                  <Descriptions.Item label="Ghi chú Admin/Manager" span={2}>
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
                  <Divider orientation="left">Biên lai chuyển khoản</Divider>
                  {loadingProof ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 16 }}>
                        <Text type="secondary">Đang tải proof file...</Text>
                      </div>
                    </div>
                  ) : proofImageUrl ? (
                    <div style={{ textAlign: 'center' }}>
                      <Image
                        src={proofImageUrl}
                        alt="Proof of transfer"
                        style={{ maxWidth: '100%', maxHeight: '500px' }}
                        preview={{
                          mask: 'Xem ảnh',
                        }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleViewProof(selectedRequest)}
                        >
                          Tải xuống
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Text type="secondary">Không thể tải proof file</Text>
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleViewProof(selectedRequest)}
                        >
                          Thử tải xuống
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
