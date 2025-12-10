import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Space,
  Button,
  message,
  Typography,
  Spin,
  Card,
  DatePicker,
  Tooltip,
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getStudioBookings } from '../../../services/studioBookingService';
import { useNavigate } from 'react-router-dom';
import styles from './StudioBookingsManagement.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

const BOOKING_STATUS = [
  { label: 'Tất cả', value: '' },
  { label: 'Tentative', value: 'TENTATIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const statusColor = {
  TENTATIVE: 'default',
  PENDING: 'processing',
  CONFIRMED: 'success',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const StudioBookingsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  
  // Filters
  const [contractIdFilter, setContractIdFilter] = useState('');
  const [milestoneIdFilter, setMilestoneIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, contractIdFilter, milestoneIdFilter, statusFilter, searchText]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await getStudioBookings(
        contractIdFilter || null,
        milestoneIdFilter || null,
        statusFilter || null
      );
      
      if (response?.status === 'success' && response?.data) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      message.error(error?.message || 'Lỗi khi tải danh sách bookings');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by search text (bookingId, contractId, milestoneId)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.bookingId?.toLowerCase().includes(searchLower) ||
        booking.contractId?.toLowerCase().includes(searchLower) ||
        booking.milestoneId?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleRefresh = () => {
    loadBookings();
  };

  const handleViewContract = (contractId) => {
    if (contractId) {
      navigate(`/manager/contracts/${contractId}`);
    }
  };

  const handleViewMilestone = (contractId, milestoneId) => {
    if (contractId && milestoneId) {
      navigate(`/manager/milestone-assignments/${contractId}/milestone/${milestoneId}`);
    }
  };

  const handleCopyBookingId = (bookingId) => {
    navigator.clipboard.writeText(bookingId);
    message.success('Đã copy Booking ID');
  };

  const handleViewBookingDetail = (bookingId) => {
    navigate(`/manager/studio-bookings/${bookingId}`);
  };

  const columns = [
    {
      title: 'Booking ID',
      dataIndex: 'bookingId',
      key: 'bookingId',
      width: 120,
      render: (text) => (
        <Space>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {text?.substring(0, 8)}...
          </span>
          <Tooltip title="Copy Booking ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyBookingId(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      width: 120,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'N/A',
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 150,
      render: (_, record) => (
        <span>
          {record.startTime} - {record.endTime}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={statusColor[status] || 'default'}>
          {status || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Type Booking',
      dataIndex: 'context',
      key: 'context',
      width: 150,
      render: (context) => {
        const contextLabels = {
          CONTRACT_RECORDING: 'Contract Recording',
          STANDALONE_BOOKING: 'Standalone Booking',
          PRE_CONTRACT_HOLD: 'Pre Contract Hold',
        };
        const contextColors = {
          CONTRACT_RECORDING: 'blue',
          STANDALONE_BOOKING: 'green',
          PRE_CONTRACT_HOLD: 'orange',
        };
        return (
          <Tag color={contextColors[context] || 'default'}>
            {contextLabels[context] || context || 'N/A'}
          </Tag>
        );
      },
    },
    {
      title: 'Session Type',
      dataIndex: 'sessionType',
      key: 'sessionType',
      width: 150,
      render: (sessionType) => (
        <Tag color="purple">
          {sessionType || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (cost, record) => {
        // Ẩn Total Cost cho booking CONTRACT_RECORDING (luồng 2) vì không tính total_cost
        if (record.context === 'CONTRACT_RECORDING') {
          return <span style={{ color: '#999' }}>N/A</span>;
        }
        return cost ? `${cost.toLocaleString()} VND` : '0 VND';
      },
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewBookingDetail(record.bookingId)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>Studio Bookings Management</Title>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Filters */}
          <Space wrap>
            <Input
              placeholder="Tìm kiếm (Booking ID, Contract ID, Milestone ID)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              {BOOKING_STATUS.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="Contract ID"
              value={contractIdFilter}
              onChange={(e) => setContractIdFilter(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Input
              placeholder="Milestone ID"
              value={milestoneIdFilter}
              onChange={(e) => setMilestoneIdFilter(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={filteredBookings}
            rowKey="bookingId"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} bookings`,
            }}
            scroll={{ x: 1400 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default StudioBookingsManagement;

