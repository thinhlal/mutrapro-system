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
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './ContractsList.module.css';
import { getAllContracts, cancelContract } from '../../../services/contractService';
import { useAuth } from '../../../contexts/AuthContext';
import CancelContractModal from '../../../components/modal/CancelContractModal/CancelContractModal';

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
  { label: 'Signed', value: 'signed' },
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
const getServiceName = (contractType) => {
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
  signed: 'green',
  rejected_by_customer: 'red',
  need_revision: 'orange',
  canceled_by_customer: 'default',
  canceled_by_manager: 'orange',
  expired: 'volcano',
};

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function ContractsList() {
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
  const auth = useAuth();
  const currentUser = auth?.user;

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

  const handleCancelContract = async (reason) => {
    if (!selectedContract) return;
    try {
      setActionLoading(true);
      await cancelContract(selectedContract.contractId, reason);
      message.success('Đã hủy contract thành công');
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
      sorter: (a, b) => (a.contractNumber || '').localeCompare(b.contractNumber || ''),
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
      width: 220,
    },
    {
      title: 'Type',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 140,
      filters: CONTRACT_TYPES.map(x => ({ text: x.label, value: x.value })),
      onFilter: (val, rec) => (rec.contractType?.toLowerCase() || '') === val.toLowerCase(),
      render: v => (
        <Tag color="processing">
          {getServiceName(v)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: v => {
        const statusLower = v?.toLowerCase() || 'draft';
        return (
          <Tag color={statusColor[statusLower] || 'default'}>
            {statusLower.toUpperCase()}
          </Tag>
        );
      },
      filters: CONTRACT_STATUS.map(x => ({ text: x.label, value: x.value })),
      onFilter: (val, rec) => (rec.status?.toLowerCase() || '') === val.toLowerCase(),
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
            <Text strong>{fmtMoney(Number(r.totalPrice || 0), r.currency)}</Text>{' '}
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
      width: 220,
      render: (_, r) => (
        <div className={styles.timeline}>
          <div>
            <span className={styles.sub}>Start</span>{' '}
            {dayjs(r.expectedStartDate).format('YYYY-MM-DD')}
          </div>
          <div>
            <span className={styles.sub}>Due</span>{' '}
            {dayjs(r.dueDate).format('YYYY-MM-DD')}{' '}
            <span className={styles.sub}>({r.slaDays || 0}d)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 280,
      render: (_, r) => {
        const isSent = r.status?.toLowerCase() === 'sent';
        const isCustomer = currentUser?.role === 'CUSTOMER';
        const isOwner = currentUser && r.userId && r.userId === currentUser.id;
        const canCancel = isSent && isCustomer && isOwner;

        return (
          <Space>
            <Tooltip title="View">
              <Button icon={<EyeOutlined />} />
            </Tooltip>
            {!isCustomer && (
              <>
                <Tooltip title="Edit">
                  <Button icon={<EditOutlined />} type="primary" ghost />
                </Tooltip>
                <Tooltip title="Export PDF">
                  <Button icon={<FilePdfOutlined />} />
                </Tooltip>
                <Popconfirm
                  title="Delete this contract?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() =>
                    message.success(`Deleted ${r.contractNumber} (UI only)`)
                  }
                >
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            )}
            {canCancel && (
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
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          Contract List
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
              message.success('Đã làm mới danh sách');
            } catch (err) {
              message.error('Lỗi khi làm mới danh sách');
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
      />
    </div>
  );
}
