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
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getStudioBookings } from '../../../services/studioBookingService';
import { useNavigate } from 'react-router-dom';
import styles from './StudioBookingsManagement.module.css';

const { Title } = Typography;
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

    // Filter by search text (bookingId, contractId, milestoneId, studioName)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.bookingId?.toLowerCase().includes(searchLower) ||
        booking.contractId?.toLowerCase().includes(searchLower) ||
        booking.milestoneId?.toLowerCase().includes(searchLower) ||
        booking.studioName?.toLowerCase().includes(searchLower)
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

  const columns = [
    {
      title: 'Booking ID',
      dataIndex: 'bookingId',
      key: 'bookingId',
      width: 200,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {text?.substring(0, 8)}...
        </span>
      ),
    },
    {
      title: 'Studio',
      dataIndex: 'studioName',
      key: 'studioName',
      width: 150,
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
      title: 'Duration',
      dataIndex: 'durationHours',
      key: 'durationHours',
      width: 100,
      render: (hours) => hours ? `${hours}h` : 'N/A',
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
      title: 'Contract',
      dataIndex: 'contractId',
      key: 'contractId',
      width: 150,
      render: (contractId) => contractId ? (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewContract(contractId)}
        >
          {contractId.substring(0, 8)}...
        </Button>
      ) : 'N/A',
    },
    {
      title: 'Milestone',
      key: 'milestone',
      width: 150,
      render: (_, record) => record.milestoneId ? (
        <Button
          type="link"
          size="small"
          onClick={() => handleViewMilestone(record.contractId, record.milestoneId)}
        >
          {record.milestoneId.substring(0, 8)}...
        </Button>
      ) : 'N/A',
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (cost) => cost ? `${cost.toLocaleString()} VND` : '0 VND',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/A',
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
              placeholder="Tìm kiếm (Booking ID, Contract ID, Milestone ID, Studio)"
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

