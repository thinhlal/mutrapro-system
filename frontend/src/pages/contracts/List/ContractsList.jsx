import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Button,
  Popconfirm,
  message,
  Tooltip,
  Typography,
  Spin,
  Modal,
  Alert,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  ReloadOutlined,
  StopOutlined,
  SendOutlined,
  CopyOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './ContractsList.module.css';
import {
  getAllContracts,
  cancelContract,
  sendContractToCustomer,
  getContractsByRequestId,
} from '../../../services/contractService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';
import { useDocumentTitle } from '../../../hooks';

// ===== Enums (phù hợp với ContractBuilder) =====
const CONTRACT_TYPES = [
  { label: 'Transcription', value: 'transcription' },
  { label: 'Arrangement', value: 'arrangement' },
  { label: 'Arrangement with Recording', value: 'arrangement_with_recording' },
  { label: 'Recording', value: 'recording' },
  { label: 'Bundle (T+A+R)', value: 'bundle' },
];
const CONTRACT_STATUS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Approved', value: 'approved' },
  { label: 'Signed - Pending Deposit', value: 'signed' },
  { label: 'Active - Deposit Paid', value: 'active' },
  { label: 'Active - Pending Assignment', value: 'active_pending_assignment' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected by Customer', value: 'rejected_by_customer' },
  { label: 'Need Revision', value: 'need_revision' },
  { label: 'Canceled by Customer', value: 'canceled_by_customer' },
  { label: 'Canceled by Manager', value: 'canceled_by_manager' },
  { label: 'Expired', value: 'expired' },
];
const CURRENCIES = [
  { label: 'VND', value: 'VND' },
  { label: 'USD', value: 'USD' },
];

// Helper function để map contract type sang service name
const getServiceName = contractType => {
  if (!contractType) return 'N/A';
  const typeMap = {
    transcription: 'Transcription',
    arrangement: 'Arrangement',
    arrangement_with_recording: 'Arrangement with Recording',
    recording: 'Recording',
    bundle: 'Bundle (T+A+R)',
  };
  const typeLower = contractType.toLowerCase();
  return typeMap[typeLower] || contractType;
};

// helpers
const fmtMoney = (n, cur) =>
  typeof n === 'number'
    ? (cur === 'USD' ? '$' : '') + n.toLocaleString()
    : (n ?? '');

// Helper function để tính deposit amount
const getDepositAmount = contract => {
  if (!contract) return 0;

  // 1. Check depositAmount field trước
  const normalizedDeposit =
    contract.depositAmount !== undefined && contract.depositAmount !== null
      ? Number(contract.depositAmount)
      : null;
  if (
    !Number.isNaN(normalizedDeposit) &&
    normalizedDeposit !== null &&
    normalizedDeposit > 0
  ) {
    return normalizedDeposit;
  }

  // 2. Check từ installments với type DEPOSIT
  const depositInstallment = contract.installments?.find(
    inst => inst.type === 'DEPOSIT'
  );
  if (
    depositInstallment &&
    depositInstallment.amount !== undefined &&
    depositInstallment.amount !== null
  ) {
    const normalizedInstallmentAmount = Number(depositInstallment.amount);
    if (
      !Number.isNaN(normalizedInstallmentAmount) &&
      normalizedInstallmentAmount > 0
    ) {
      return normalizedInstallmentAmount;
    }
  }

  // 3. Tính từ totalPrice * depositPercent / 100
  if (
    contract.totalPrice !== undefined &&
    contract.totalPrice !== null &&
    contract.depositPercent !== undefined &&
    contract.depositPercent !== null
  ) {
    const totalPriceNumber = Number(contract.totalPrice);
    const depositPercentNumber = Number(contract.depositPercent);
    if (
      !Number.isNaN(totalPriceNumber) &&
      !Number.isNaN(depositPercentNumber) &&
      totalPriceNumber > 0 &&
      depositPercentNumber > 0
    ) {
      return (totalPriceNumber * depositPercentNumber) / 100;
    }
  }

  return 0;
};

const statusColor = {
  completed: 'success',
  draft: 'default',
  sent: 'geekblue',
  approved: 'green',
  signed: 'orange',
  active_pending_assignment: 'gold',
  active: 'green',
  rejected_by_customer: 'red',
  need_revision: 'orange',
  canceled_by_customer: 'default',
  canceled_by_manager: 'orange',
  expired: 'volcano',
};

const statusText = {
  draft: 'Draft',
  sent: 'Đã gửi',
  approved: 'Đã duyệt',
  signed: 'Đã ký - Chờ thanh toán deposit',
  active_pending_assignment: 'Đã nhận cọc - Chờ gán task',
  active: 'Đã ký - Đã thanh toán deposit',
  completed: 'Hoàn thành - Đã thanh toán hết',
  rejected_by_customer: 'Bị từ chối',
  need_revision: 'Cần chỉnh sửa',
  canceled_by_customer: 'Đã hủy',
  canceled_by_manager: 'Đã thu hồi',
  expired: 'Hết hạn',
};

// Helper functions for status
const getStatusColor = status => {
  const statusLower = status?.toLowerCase() || '';
  return statusColor[statusLower] || 'default';
};

const getStatusText = status => {
  const statusLower = status?.toLowerCase() || '';
  return statusText[statusLower] || status;
};

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function ContractsList() {
  useDocumentTitle('My Contracts');

  const [search, setSearch] = useState('');
  const [type, setType] = useState();
  const [status, setStatus] = useState();
  const [currency, setCurrency] = useState();
  const [dateRange, setDateRange] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [revisionContract, setRevisionContract] = useState(null);
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [checkingActiveContract, setCheckingActiveContract] = useState(false);
  const [cancelReasonModalVisible, setCancelReasonModalVisible] =
    useState(false);
  const [canceledContract, setCanceledContract] = useState(null);
  const auth = useAuth();
  const currentUser = auth?.user;
  const navigate = useNavigate();

  // Fetch contracts từ API
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getAllContracts();
        setContracts(response.data || []);
      } catch (err) {
        console.error('Error fetching contracts:', err);
        setError(err.message || 'Lỗi khi tải danh sách contracts');
        message.error(err.message || 'Lỗi khi tải danh sách contracts');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  // Check xem request đã có contract active khác chưa khi mở revision modal
  useEffect(() => {
    const checkActiveContract = async () => {
      if (!revisionModalVisible || !revisionContract?.requestId) {
        return;
      }

      setCheckingActiveContract(true);
      try {
        const response = await getContractsByRequestId(
          revisionContract.requestId
        );
        if (response?.status === 'success' && Array.isArray(response.data)) {
          // Check xem có contract nào active (không phải need_revision) không
          const hasActive = response.data.some(contract => {
            const status = (contract.status || '').toLowerCase();
            return (
              status !== 'need_revision' &&
              status !== 'canceled_by_customer' &&
              status !== 'canceled_by_manager' &&
              status !== 'rejected_by_customer' &&
              status !== 'expired'
            );
          });
          setHasActiveContract(hasActive);
        } else {
          setHasActiveContract(false);
        }
      } catch (error) {
        console.error('Error checking active contracts:', error);
        setHasActiveContract(false);
      } finally {
        setCheckingActiveContract(false);
      }
    };

    checkActiveContract();
  }, [revisionModalVisible, revisionContract]);

  const data = useMemo(() => {
    return contracts.filter(c => {
      const contractType = c.contractType?.toLowerCase() || '';
      const statusLower = c.status?.toLowerCase() || '';
      const q =
        (c.contractNumber || '').toLowerCase() +
        ' ' +
        (c.nameSnapshot || '').toLowerCase() +
        ' ' +
        getServiceName(c.contractType).toLowerCase();
      const passSearch = q.includes((search || '').toLowerCase().trim());
      const passType = type ? contractType === type.toLowerCase() : true;
      const passStatus = status ? statusLower === status.toLowerCase() : true;
      const passCur = currency ? c.currency === currency : true;
      const passDate =
        dateRange?.length === 2
          ? dayjs(c.createdAt).isBetween(
              dateRange[0],
              dateRange[1],
              'day',
              '[]'
            )
          : true;
      return passSearch && passType && passStatus && passCur && passDate;
    });
  }, [contracts, search, type, status, currency, dateRange]);

  const handleSendContract = async contractId => {
    try {
      setActionLoading(true);
      await sendContractToCustomer(contractId, 7); // 7 days expiry
      message.success('Đã gửi contract cho customer thành công');
      // Reload contracts
      try {
        setLoading(true);
        const response = await getAllContracts();
        setContracts(response.data || []);
      } catch (err) {
        console.error('Error reloading contracts:', err);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi gửi contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelContract = async reason => {
    if (!selectedContract) return;
    try {
      setActionLoading(true);
      await cancelContract(selectedContract.contractId, reason);
      message.success('Contract cancelled successfully');
      setCancelModalVisible(false);
      setSelectedContract(null);
      // Reload contracts
      try {
        setLoading(true);
        const response = await getAllContracts();
        setContracts(response.data || []);
      } catch (err) {
        console.error('Error reloading contracts:', err);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      message.error(error.message || 'Lỗi khi hủy contract');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Contract No',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 190,
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Req: {r.requestId}
          </Text>
        </Space>
      ),
      sorter: (a, b) =>
        (a.contractNumber || '').localeCompare(b.contractNumber || ''),
    },
    {
      title: 'Customer / Service',
      key: 'customer',
      render: (_, r) => (
        <div>
          <Text>{r.nameSnapshot || 'N/A'}</Text>
          <div className={styles.sub}>{getServiceName(r.contractType)}</div>
        </div>
      ),
      width: 200,
    },
    {
      title: 'Type',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 220,
      filters: CONTRACT_TYPES.map(x => ({ text: x.label, value: x.value })),
      onFilter: (val, rec) =>
        (rec.contractType?.toLowerCase() || '') === val.toLowerCase(),
      render: v => <Tag color="processing">{getServiceName(v)}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: v => {
        const statusLower = v?.toLowerCase() || 'draft';
        return (
          <Tag color={statusColor[statusLower] || 'default'}>
            {statusText[statusLower] || statusLower.toUpperCase()}
          </Tag>
        );
      },
      filters: CONTRACT_STATUS.map(x => ({ text: x.label, value: x.value })),
      onFilter: (val, rec) =>
        (rec.status?.toLowerCase() || '') === val.toLowerCase(),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: v => dayjs(v).format('YYYY-MM-DD'),
      sorter: (a, b) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    },
    {
      title: 'Price',
      key: 'price',
      width: 170,
      render: (_, r) => (
        <div>
          <div>
            <Text strong>
              {fmtMoney(Number(r.totalPrice || 0), r.currency)}
            </Text>{' '}
            <Tag>{r.currency}</Tag>
          </div>
          <div className={styles.sub}>
            Deposit {Number(r.depositPercent || 0)}% ={' '}
            {fmtMoney(getDepositAmount(r), r.currency)}
          </div>
        </div>
      ),
      sorter: (a, b) => Number(a.totalPrice || 0) - Number(b.totalPrice || 0),
    },
    {
      title: 'Timeline',
      key: 'timeline',
      width: 200,
      render: (_, r) => (
        <div className={styles.timeline}>
          <div>
            <span className={styles.sub}>Start</span>{' '}
            {r.expectedStartDate ? (
              dayjs(r.expectedStartDate).format('YYYY-MM-DD')
            ) : (
              <span style={{ fontStyle: 'italic', color: '#999' }}>
                Chưa lên lịch (sau khi Start Work)
              </span>
            )}
          </div>
          <div>
            <span className={styles.sub}>Due</span>{' '}
            {(() => {
              // Get due date from last milestone's plannedDueDate (calculated by backend)
              if (r?.milestones && r.milestones.length > 0) {
                const lastMilestone = r.milestones[r.milestones.length - 1];
                if (lastMilestone?.plannedDueDate) {
                  return dayjs(lastMilestone.plannedDueDate).format(
                    'YYYY-MM-DD'
                  );
                }
              }
              // No plannedDueDate yet (not calculated)
              return (
                <span style={{ fontStyle: 'italic', color: '#999' }}>N/A</span>
              );
            })()}{' '}
            <span className={styles.sub}>({r.slaDays || 0}d)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 270,
      render: (_, r) => {
        const statusLower = r.status?.toLowerCase() || '';
        const isDraft = statusLower === 'draft';
        const isSent = statusLower === 'sent';
        const isApproved = statusLower === 'approved';
        const isSigned = statusLower === 'signed';
        const isNeedRevision = statusLower === 'need_revision';
        const isCanceledByCustomer = statusLower === 'canceled_by_customer';
        const isCanceledByManager = statusLower === 'canceled_by_manager';
        const isExpired = statusLower === 'expired';
        const isCanceled = isCanceledByCustomer || isCanceledByManager;
        const isCustomer = currentUser?.role === 'CUSTOMER';
        const isOwner = currentUser && r.userId && r.userId === currentUser.id;
        const canCustomerCancel = isSent && isCustomer && isOwner; // Customer có thể hủy contract SENT của mình
        const canManagerCancel = (isDraft || isSent) && !isCustomer; // Manager có thể hủy DRAFT hoặc thu hồi SENT
        const canSend = isDraft && !isCustomer; // Manager có thể gửi contract DRAFT
        const canRevise = isNeedRevision && !isCustomer; // Manager có thể xem lý do và tạo contract mới
        const canViewCancelReason = isCanceled && r.cancellationReason; // Bất kỳ ai cũng có thể xem lý do hủy
        const canEdit = isDraft && !isCustomer; // Chỉ edit được khi DRAFT, sau khi sent thì không edit được nữa

        return (
          <Space>
            <Tooltip title="View Details">
              <Button
                icon={<EyeOutlined />}
                onClick={() => navigate(`/contracts/${r.contractId}`)}
              />
            </Tooltip>
            {/* Customer actions only */}
            {canCustomerCancel && (
              <Tooltip title="Hủy contract">
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => {
                    setSelectedContract(r);
                    setCancelModalVisible(true);
                  }}
                  loading={actionLoading}
                >
                  Hủy
                </Button>
              </Tooltip>
            )}
            {/* Customer actions only - no manager actions here */}
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 24 }}>
          My Contracts
        </Typography.Title>
      </div>
      {/* Filters */}
      <div className={styles.toolbar}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search contract no / customer / service"
            onSearch={setSearch}
            style={{ width: 320 }}
          />
          <Select
            allowClear
            placeholder="Type"
            options={CONTRACT_TYPES}
            onChange={setType}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder="Status"
            options={CONTRACT_STATUS}
            onChange={setStatus}
            style={{ width: 160 }}
          />
          <Select
            allowClear
            placeholder="Currency"
            options={CURRENCIES}
            onChange={setCurrency}
            style={{ width: 130 }}
          />
          <RangePicker onChange={setDateRange} />
        </Space>
        <Button
          icon={<ReloadOutlined />}
          onClick={async () => {
            setSearch('');
            setType();
            setStatus();
            setCurrency();
            setDateRange([]);
            // Reload data
            try {
              setLoading(true);
              const response = await getAllContracts();
              setContracts(response.data || []);
              message.success('List refreshed successfully');
            } catch (err) {
              message.error('Error refreshing list');
            } finally {
              setLoading(false);
            }
          }}
        >
          Reset
        </Button>
      </div>

      {/* Table */}
      <Spin spinning={loading}>
        {error ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Typography.Text type="danger">{error}</Typography.Text>
            <br />
            <Button
              type="primary"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const response = await getAllContracts();
                  setContracts(response.data || []);
                } catch (err) {
                  setError(err.message || 'Lỗi khi tải danh sách contracts');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ marginTop: '10px' }}
            >
              Thử lại
            </Button>
          </div>
        ) : (
          <Table
            rowKey="contractId"
            columns={columns}
            dataSource={data}
            bordered
            size="middle"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1000 }}
            loading={loading}
          />
        )}
      </Spin>

      {/* Cancel Contract Modal */}
      <CancelContractModal
        visible={cancelModalVisible}
        onCancel={() => {
          setCancelModalVisible(false);
          setSelectedContract(null);
        }}
        onConfirm={handleCancelContract}
        loading={actionLoading}
        isManager={false}
        isDraft={selectedContract?.status?.toLowerCase() === 'draft'}
      />

      {/* Revision Request Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#fa8c16' }} />
            <span>Lý do yêu cầu chỉnh sửa Contract</span>
          </Space>
        }
        open={revisionModalVisible}
        onCancel={() => {
          setRevisionModalVisible(false);
          setRevisionContract(null);
          setHasActiveContract(false);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setRevisionModalVisible(false);
              setRevisionContract(null);
              setHasActiveContract(false);
            }}
          >
            Đóng
          </Button>,
          !hasActiveContract && !checkingActiveContract && (
            <Button
              key="create"
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => {
                // Navigate đến ContractBuilder với requestId và pass contract data qua state
                navigate(
                  `/manager/contract-builder?requestId=${revisionContract.requestId}`,
                  {
                    state: {
                      copyFromContract: {
                        contractId: revisionContract.contractId,
                        contractType: revisionContract.contractType,
                        totalPrice: revisionContract.totalPrice,
                        depositPercent: revisionContract.depositPercent,
                        slaDays: revisionContract.slaDays,
                        freeRevisionsIncluded:
                          revisionContract.freeRevisionsIncluded,
                        revisionDeadlineDays:
                          revisionContract.revisionDeadlineDays,
                        additionalRevisionFeeVnd:
                          revisionContract.additionalRevisionFeeVnd,
                        termsAndConditions: revisionContract.termsAndConditions,
                        specialClauses: revisionContract.specialClauses,
                        notes: revisionContract.notes,
                        cancellationReason: revisionContract.cancellationReason,
                      },
                    },
                  }
                );
              }}
            >
              Tạo Contract Mới
            </Button>
          ),
        ].filter(Boolean)}
        width={700}
      >
        {revisionContract && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {checkingActiveContract && (
              <Alert
                message="Đang kiểm tra..."
                description="Đang kiểm tra xem request đã có contract mới chưa."
                type="info"
                showIcon
              />
            )}
            {hasActiveContract && (
              <Alert
                message="Đã có contract mới"
                description="Request này đã có contract mới được tạo. Bạn không thể tạo contract mới từ modal này nữa."
                type="info"
                showIcon
              />
            )}
            {!hasActiveContract && !checkingActiveContract && (
              <Alert
                message="Customer đã yêu cầu chỉnh sửa contract này"
                description="Vui lòng xem lý do bên dưới và tạo contract mới với nội dung đã điều chỉnh."
                type="warning"
                showIcon
              />
            )}

            <div>
              <Typography.Title level={5}>Thông tin Contract:</Typography.Title>
              <div
                style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <div>
                    <strong>Contract Number:</strong>{' '}
                    {revisionContract.contractNumber}
                  </div>
                  <div>
                    <strong>Customer:</strong> {revisionContract.nameSnapshot}
                  </div>
                  <div>
                    <strong>Service Type:</strong>{' '}
                    {getServiceName(revisionContract.contractType)}
                  </div>
                  <div>
                    <strong>Price:</strong>{' '}
                    {fmtMoney(
                      Number(revisionContract.totalPrice || 0),
                      revisionContract.currency
                    )}{' '}
                    {revisionContract.currency}
                  </div>
                  <div>
                    <strong>SLA:</strong> {revisionContract.slaDays} ngày
                  </div>
                </Space>
              </div>
            </div>

            <div>
              <Typography.Title level={5}>
                Lý do yêu cầu chỉnh sửa:
              </Typography.Title>
              <div
                style={{
                  padding: '16px',
                  background: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  minHeight: '80px',
                }}
              >
                {revisionContract.cancellationReason || 'Không có lý do cụ thể'}
              </div>
            </div>

            <Alert
              message="Hướng dẫn"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                  <li>Đọc kỹ lý do yêu cầu chỉnh sửa từ customer</li>
                  <li>
                    Click "Tạo Contract Mới" để tạo contract với thông tin đã
                    điều chỉnh
                  </li>
                  <li>Sau khi tạo xong, gửi contract mới cho customer</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Space>
        )}
      </Modal>

      {/* Cancellation Reason Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>Lý do hủy Contract</span>
          </Space>
        }
        open={cancelReasonModalVisible}
        onCancel={() => {
          setCancelReasonModalVisible(false);
          setCanceledContract(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setCancelReasonModalVisible(false);
              setCanceledContract(null);
            }}
          >
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {canceledContract && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message={
                canceledContract.status?.toLowerCase() ===
                'canceled_by_customer'
                  ? 'Contract đã bị hủy bởi Customer'
                  : 'Contract đã bị hủy bởi Manager'
              }
              description="Xem lý do hủy bên dưới."
              type="error"
              showIcon
            />

            <div>
              <Typography.Title level={5}>Thông tin Contract:</Typography.Title>
              <div
                style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <div>
                    <strong>Contract Number:</strong>{' '}
                    {canceledContract.contractNumber}
                  </div>
                  <div>
                    <strong>Customer:</strong> {canceledContract.nameSnapshot}
                  </div>
                  <div>
                    <strong>Service Type:</strong>{' '}
                    {getServiceName(canceledContract.contractType)}
                  </div>
                  <div>
                    <strong>Price:</strong>{' '}
                    {fmtMoney(
                      Number(canceledContract.totalPrice || 0),
                      canceledContract.currency
                    )}{' '}
                    {canceledContract.currency}
                  </div>
                  <div>
                    <strong>SLA:</strong> {canceledContract.slaDays} ngày
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <Tag color={getStatusColor(canceledContract.status)}>
                      {getStatusText(canceledContract.status)}
                    </Tag>
                  </div>
                </Space>
              </div>
            </div>

            <div>
              <Typography.Title level={5}>Lý do hủy:</Typography.Title>
              <div
                style={{
                  padding: '16px',
                  background: '#fff1f0',
                  border: '1px solid #ffccc7',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  minHeight: '80px',
                }}
              >
                {canceledContract.cancellationReason || 'Không có lý do cụ thể'}
              </div>
            </div>

            <Alert
              message="Thông tin"
              description={
                canceledContract.status?.toLowerCase() ===
                'canceled_by_customer'
                  ? 'Contract này đã bị customer hủy. Bạn có thể liên hệ với customer để biết thêm chi tiết hoặc tạo contract mới nếu cần.'
                  : 'Contract này đã bị manager hủy. Nếu cần thiết, bạn có thể tạo contract mới cho request này.'
              }
              type="info"
              showIcon
            />
          </Space>
        )}
      </Modal>
    </div>
  );
}
