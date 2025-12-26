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
  { label: 'All', value: '' },
  { label: 'Tentative', value: 'TENTATIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const BOOKING_CONTEXT = [
  { label: 'All', value: '' },
  { label: 'Contract Recording', value: 'CONTRACT_RECORDING' },
  { label: 'Pre-Contract Hold', value: 'PRE_CONTRACT_HOLD' },
  { label: 'Standalone Booking', value: 'STANDALONE_BOOKING' },
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
  const [contextFilter, setContextFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, contextFilter, searchText]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyStudioBookings();

      if (response?.status === 'success' && response?.data) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      message.error(error?.message || 'Error loading bookings list');
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

    // Filter by context
    if (contextFilter) {
      filtered = filtered.filter(booking => booking.context === contextFilter);
    }

    setFilteredBookings(filtered);
  };

  const handleRefresh = () => {
    loadBookings();
  };

  const handleCopyBookingId = bookingId => {
    navigator.clipboard.writeText(bookingId);
    message.success('Booking ID copied');
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
      title: 'Date',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      width: 120,
      sorter: (a, b) => {
        if (!a.bookingDate && !b.bookingDate) return 0;
        if (!a.bookingDate) return 1;
        if (!b.bookingDate) return -1;
        return dayjs(a.bookingDate).valueOf() - dayjs(b.bookingDate).valueOf();
      },
      defaultSortOrder: 'descend',
      render: date => (date ? dayjs(date).format('DD/MM/YYYY') : 'N/A'),
    },
    {
      title: 'Time',
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
      title: 'Context',
      dataIndex: 'context',
      key: 'context',
      width: 150,
      render: context => {
        const contextColors = {
          CONTRACT_RECORDING: 'blue',
          PRE_CONTRACT_HOLD: 'orange',
        };
        const contextLabels = {
          CONTRACT_RECORDING: 'Contract Recording',
          PRE_CONTRACT_HOLD: 'Pre-Contract',
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
      render: sessionType => <Tag color="purple">{sessionType || 'N/A'}</Tag>,
    },
    {
      title: 'My Role',
      key: 'role',
      width: 120,
      render: (_, record) => {
        // Get from participants with performerSource = INTERNAL_ARTIST
        const internalArtists =
          record?.participants?.filter(
            p => p.performerSource === 'INTERNAL_ARTIST'
          ) || [];
        if (internalArtists.length > 0) {
          const myParticipant = internalArtists[0];
          return myParticipant?.roleType ? (
            <Tag>{myParticipant.roleType}</Tag>
          ) : (
            'N/A'
          );
        }

        // Fallback: get from participants (for flow 3)
        if (record.participants && record.participants.length > 0) {
          // Find participant with isPrimary = true or get first participant
          const myParticipant =
            record.participants.find(p => p.isPrimary) ||
            record.participants[0];
          return myParticipant?.roleType ? (
            <Tag>{myParticipant.roleType}</Tag>
          ) : (
            'N/A'
          );
        }

        return 'N/A';
      },
    },
    {
      title: 'Participants',
      key: 'participantsCount',
      width: 120,
      render: (_, record) => {
        // Only count participants (artists have been merged into participants)
        const count = record.participants?.length || 0;
        return count > 0 ? `${count} people` : 'N/A';
      },
    },
    {
      title: 'Equipment',
      key: 'equipmentCount',
      width: 120,
      render: (_, record) => {
        const count = record.requiredEquipment?.length || 0;
        return count > 0 ? `${count} equipment` : 'N/A';
      },
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 130,
      render: cost =>
        cost != null ? `${cost.toLocaleString('vi-VN')} ₫` : 'N/A',
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
          Details
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
            List of studio bookings you are booked into
          </Text>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Filters */}
          <Space wrap>
            <Input
              placeholder="Search (Booking ID, Contract ID, Milestone ID)"
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
            <Select
              placeholder="Context"
              value={contextFilter}
              onChange={setContextFilter}
              style={{ width: 180 }}
              allowClear
            >
              {BOOKING_CONTEXT.map(context => (
                <Option key={context.value} value={context.value}>
                  {context.label}
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
              showTotal: total => `Total ${total} bookings`,
            }}
            scroll={{ x: 1200 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default MyStudioBookings;
