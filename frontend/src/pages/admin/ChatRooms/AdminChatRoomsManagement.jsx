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
  Popconfirm,
  Descriptions,
  Modal,
  Badge,
} from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  MessageOutlined,
  CopyOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getChatRooms, deactivateRoom, getChatRoomById } from '../../../services/chatService';
import { useNavigate } from 'react-router-dom';
import styles from './AdminChatRoomsManagement.module.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const ROOM_TYPES = [
  { label: 'Tất cả', value: '' },
  { label: 'Request Chat', value: 'REQUEST_CHAT' },
  { label: 'Contract Chat', value: 'CONTRACT_CHAT' },
];

const roomTypeColor = {
  REQUEST_CHAT: 'blue',
  CONTRACT_CHAT: 'green',
};

const AdminChatRoomsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadRooms();
  }, [roomTypeFilter]);

  useEffect(() => {
    applyFilters();
  }, [rooms, searchText]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomType = roomTypeFilter || null;
      const response = await getChatRooms(roomType);

      if (response?.status === 'success' && response?.data) {
        setRooms(response.data);
      } else if (response?.data) {
        // Handle case where response.data is directly the array
        setRooms(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      message.error(error?.message || 'Lỗi khi tải danh sách chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rooms];

    // Filter by search text (roomId, roomName, contextId)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        room =>
          room.roomId?.toLowerCase().includes(searchLower) ||
          room.roomName?.toLowerCase().includes(searchLower) ||
          room.contextId?.toLowerCase().includes(searchLower) ||
          room.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRooms(filtered);
  };

  const handleRefresh = () => {
    loadRooms();
  };

  const handleViewChat = roomId => {
    navigate(`/admin/chat/${roomId}`);
  };

  const handleCopyRoomId = roomId => {
    navigator.clipboard.writeText(roomId);
    message.success('Đã copy Room ID');
  };

  const handleDeactivate = async roomId => {
    try {
      await deactivateRoom(roomId);
      message.success('Đã đóng chat room thành công');
      loadRooms(); // Reload list
      if (detailModalVisible && selectedRoom?.roomId === roomId) {
        setDetailModalVisible(false);
        setSelectedRoom(null);
      }
    } catch (error) {
      console.error('Error deactivating room:', error);
      message.error(error?.message || 'Lỗi khi đóng chat room');
    }
  };

  const handleViewDetail = async roomId => {
    try {
      setDetailLoading(true);
      const response = await getChatRoomById(roomId);
      if (response?.status === 'success' && response?.data) {
        setSelectedRoom(response.data);
        setDetailModalVisible(true);
      } else if (response?.data) {
        setSelectedRoom(response.data);
        setDetailModalVisible(true);
      }
    } catch (error) {
      console.error('Error loading room detail:', error);
      message.error(error?.message || 'Lỗi khi tải chi tiết chat room');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: 'Room ID',
      dataIndex: 'roomId',
      key: 'roomId',
      width: 150,
      render: text => (
        <Space>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {text?.substring(0, 8)}...
          </span>
          <Tooltip title="Copy Room ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyRoomId(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Room Name',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'roomType',
      key: 'roomType',
      width: 120,
      render: type => (
        <Tag color={roomTypeColor[type] || 'default'}>{type || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Context ID',
      dataIndex: 'contextId',
      key: 'contextId',
      width: 150,
      ellipsis: true,
      render: text => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {text || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: isActive => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Closed'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: date => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/A'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Detail">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.roomId)}
            />
          </Tooltip>
          <Tooltip title="Open Chat">
            <Button
              type="default"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => handleViewChat(record.roomId)}
            />
          </Tooltip>
          {record.isActive && (
            <Popconfirm
              title="Đóng chat room?"
              description="Bạn có chắc chắn muốn đóng chat room này?"
              onConfirm={() => handleDeactivate(record.roomId)}
              okText="Đóng"
              cancelText="Hủy"
            >
              <Tooltip title="Deactivate Room">
                <Button
                  danger
                  size="small"
                  icon={<StopOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card
        title={
          <Title level={3} style={{ margin: 0 }}>
            Chat Rooms Management
          </Title>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        {/* Filters */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filter by Type"
            style={{ width: 150 }}
            value={roomTypeFilter}
            onChange={setRoomTypeFilter}
          >
            {ROOM_TYPES.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
          <Search
            placeholder="Search by Room ID, Name, Context..."
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </Space>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredRooms}
          rowKey="roomId"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: total => `Total ${total} rooms`,
          }}
          scroll={{ x: 1500 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chat Room Detail"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRoom(null);
        }}
        footer={[
          <Button
            key="chat"
            type="primary"
            icon={<MessageOutlined />}
            onClick={() => {
              if (selectedRoom?.roomId) {
                setDetailModalVisible(false);
                handleViewChat(selectedRoom.roomId);
              }
            }}
          >
            Open Chat
          </Button>,
          selectedRoom?.isActive && (
            <Popconfirm
              key="deactivate"
              title="Đóng chat room?"
              description="Bạn có chắc chắn muốn đóng chat room này?"
              onConfirm={() => handleDeactivate(selectedRoom.roomId)}
              okText="Đóng"
              cancelText="Hủy"
            >
              <Button danger icon={<StopOutlined />}>
                Deactivate
              </Button>
            </Popconfirm>
          ),
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {detailLoading ? (
          <Spin />
        ) : selectedRoom ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Room ID">
              <Space>
                <Text copyable={{ text: selectedRoom.roomId }}>
                  {selectedRoom.roomId}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Room Name">
              {selectedRoom.roomName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={roomTypeColor[selectedRoom.roomType] || 'default'}>
                {selectedRoom.roomType || 'N/A'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Context ID">
              {selectedRoom.contextId || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedRoom.description || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedRoom.isActive ? 'success' : 'default'}>
                {selectedRoom.isActive ? 'Active' : 'Closed'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {selectedRoom.createdAt
                ? dayjs(selectedRoom.createdAt).format('DD/MM/YYYY HH:mm:ss')
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              {selectedRoom.updatedAt
                ? dayjs(selectedRoom.updatedAt).format('DD/MM/YYYY HH:mm:ss')
                : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminChatRoomsManagement;

