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
import styles from './ContractsManagement.module.css';
import {
  getAllContracts,
  cancelContract,
  sendContractToCustomer,
} from '../../../services/contractService';
import { useNavigate } from 'react-router-dom';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';

// ===== Enums =====
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

const statusColor = {
  draft: 'default',
  sent: 'geekblue',
  approved: 'green',
  signed: 'orange',
  active: 'green',
  rejected_by_customer: 'red',
  need_revision: 'orange',
  canceled_by_customer: 'default',
  canceled_by_manager: 'orange',
  expired: 'volcano',
};

const statusText = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  signed: 'Signed - Pending Deposit',
  active: 'Active - Deposit Paid',
  rejected_by_customer: 'Rejected by Customer',
  need_revision: 'Need Revision',
  canceled_by_customer: 'Canceled by Customer',
  canceled_by_manager: 'Canceled by Manager',
  expired: 'Expired',
};

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function ContractsManagement() {
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
  const [cancelReasonModalVisible, setCancelReasonModalVisible] =
    useState(false);
  const [canceledContract, setCanceledContract] = useState(null);
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
      message.success('Contract sent to customer successfully');
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
      message.error(error.message || 'Error sending contract');
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
      message.error(error.message || 'Error cancelling contract');
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
            {fmtMoney(Number(r.depositAmount || 0), r.currency)}
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
              <span style={{ fontStyle: 'italic', color: '#999' }}>Khi ký</span>
            )}
          </div>
          <div>
            <span className={styles.sub}>Due</span>{' '}
            {r.dueDate ? (
              dayjs(r.dueDate).format('YYYY-MM-DD')
            ) : (
              <span style={{ fontStyle: 'italic', color: '#999' }}>
                +{r.slaDays || 0}d
              </span>
            )}{' '}
            <span className={styles.sub}>({r.slaDays || 0}d)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, r) => {
        const statusLower = r.status?.toLowerCase() || '';
        const isDraft = statusLower === 'draft';
        const isSent = statusLower === 'sent';
        const isNeedRevision = statusLower === 'need_revision';
        const isCanceledByCustomer = statusLower === 'canceled_by_customer';
        const isCanceledByManager = statusLower === 'canceled_by_manager';
        const isCanceled = isCanceledByCustomer || isCanceledByManager;
        const canManagerCancel = isDraft || isSent; // Manager can cancel DRAFT or recall SENT
        const canSend = isDraft; // Manager can send DRAFT contract
        const canRevise = isNeedRevision; // Manager can view reason and create new contract
        const canViewCancelReason = isCanceled && r.cancellationReason; // Manager can view cancellation reason
        const canEdit = isDraft; // Only editable when DRAFT

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Tooltip title="View Details">
              <Button
                icon={<EyeOutlined />}
                onClick={() => navigate(`/manager/contracts/${r.contractId}`)}
                block
              />
            </Tooltip>
            {canSend && (
              <Popconfirm
                title="Send this contract to customer?"
                description="Contract will be sent with 7 days expiry."
                okText="Send"
                cancelText="Cancel"
                onConfirm={() => handleSendContract(r.contractId)}
              >
                <Tooltip title="Send to customer">
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={actionLoading}
                    block
                  >
                    Send
                  </Button>
                </Tooltip>
              </Popconfirm>
            )}
            {canRevise && (
              <Tooltip title="View revision reason">
                <Button
                  type="primary"
                  icon={<InfoCircleOutlined />}
                  onClick={() => {
                    setRevisionContract(r);
                    setRevisionModalVisible(true);
                  }}
                  style={{
                    backgroundColor: '#fa8c16',
                    borderColor: '#fa8c16',
                    width: '100%',
                  }}
                >
                  View Reason
                </Button>
              </Tooltip>
            )}
            {canViewCancelReason && (
              <Tooltip title="View cancellation reason">
                <Button
                  icon={<InfoCircleOutlined />}
                  onClick={() => {
                    setCanceledContract(r);
                    setCancelReasonModalVisible(true);
                  }}
                  style={{
                    color: '#ff4d4f',
                    borderColor: '#ff4d4f',
                    width: '100%',
                  }}
                >
                  Cancel Reason
                </Button>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title="Edit Contract">
                <Button
                  icon={<EditOutlined />}
                  type="primary"
                  ghost
                  onClick={() =>
                    navigate(`/manager/contracts/${r.contractId}/edit`)
                  }
                  block
                />
              </Tooltip>
            )}
            {canManagerCancel && (
              <Tooltip
                title={
                  isDraft ? 'Cancel DRAFT contract' : 'Recall sent contract'
                }
              >
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => {
                    setSelectedContract(r);
                    setCancelModalVisible(true);
                  }}
                  loading={actionLoading}
                  block
                >
                  {isDraft ? 'Cancel' : 'Recall'}
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 24 }}>
          Contracts Management
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
        isManager={true}
        isDraft={selectedContract?.status?.toLowerCase() === 'draft'}
      />

      {/* Revision Request Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#fa8c16' }} />
            <span>Contract Revision Request Reason</span>
          </Space>
        }
        open={revisionModalVisible}
        onCancel={() => {
          setRevisionModalVisible(false);
          setRevisionContract(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setRevisionModalVisible(false);
              setRevisionContract(null);
            }}
          >
            Đóng
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => {
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
            Create New Contract
          </Button>,
        ]}
        width={1000}
      >
        {revisionContract && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="Customer đã yêu cầu chỉnh sửa contract này"
              description="Vui lòng xem lý do bên dưới và tạo contract mới với nội dung đã điều chỉnh."
              type="warning"
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
                    <Tag
                      color={
                        statusColor[canceledContract.status?.toLowerCase()] ||
                        'default'
                      }
                    >
                      {canceledContract.status?.toUpperCase()}
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
