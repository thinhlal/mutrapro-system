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
  Tooltip,
} from 'antd';
import { EyeOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMyStudioBookings } from '../../../services/studioBookingService';
import { useNavigate } from 'react-router-dom';
import styles from './MyStudioBookings.module.css';

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

const MyStudioBookings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, searchText]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyStudioBookings();

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
      filtered = filtered.filter(
        booking =>
          booking.bookingId?.toLowerCase().includes(searchLower) ||
          booking.contractId?.toLowerCase().includes(searchLower) ||
          booking.milestoneId?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const handleRefresh = () => {
    loadBookings();
  };

  const handleCopyBookingId = bookingId => {
    navigator.clipboard.writeText(bookingId);
    message.success('Đã copy Booking ID');
  };

  const handleViewBookingDetail = bookingId => {
    navigate(`/recording-artist/studio-bookings/${bookingId}`);
  };

  const columns = [
    {
      title: 'Booking ID',
      dataIndex: 'bookingId',
      key: 'bookingId',
      width: 120,
      render: text => (
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
      render: date => (date ? dayjs(date).format('DD/MM/YYYY') : 'N/A'),
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
      title: 'Studio',
      dataIndex: 'studioName',
      key: 'studioName',
      width: 150,
      render: studioName => studioName || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: status => (
        <Tag color={statusColor[status] || 'default'}>{status || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Session Type',
      dataIndex: 'sessionType',
      key: 'sessionType',
      width: 150,
      render: sessionType => <Tag color="purple">{sessionType || 'N/A'}</Tag>,
    },
    {
      title: 'My Role',
      key: 'role',
      width: 120,
      render: (_, record) => {
        // Backend đã filter bookings của artist hiện tại, nên tất cả bookings đều có artist này
        // Hiển thị role của artist đầu tiên (thường là artist hiện tại)
        const myArtist = record.artists?.[0];
        return myArtist?.role ? <Tag>{myArtist.role}</Tag> : 'N/A';
      },
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
          <Title level={3}>My Studio Bookings</Title>
          <Text type="secondary">
            Danh sách các studio bookings mà bạn được book vào
          </Text>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Filters */}
          <Space wrap>
            <Input
              placeholder="Tìm kiếm (Booking ID, Contract ID, Milestone ID)"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
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
              showTotal: total => `Tổng ${total} bookings`,
            }}
            scroll={{ x: 1200 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default MyStudioBookings;
