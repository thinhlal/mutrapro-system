import { useState, useEffect } from 'react';
import { Input, Spin, Empty, Badge, Select } from 'antd';
import { SearchOutlined, MessageOutlined } from '@ant-design/icons';
import { useChatRooms } from '../../../hooks/useChat';
import ChatRoomCard from '../../../components/chat/ChatRoomCard/ChatRoomCard';
import styles from './ChatRoomsPage.module.css';

const { Option } = Select;

/**
 * Chat Rooms List Page
 * Displays all chat rooms for the current user
 */
const ChatRoomsPage = () => {
  const { rooms, loading, refreshRooms } = useChatRooms();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [filteredRooms, setFilteredRooms] = useState([]);

  // Filter rooms based on search query and room type
  useEffect(() => {
    if (!rooms) {
      setFilteredRooms([]);
      return;
    }

    let filtered = rooms;

    // Filter by room type
    if (selectedRoomType) {
      filtered = filtered.filter(room => room.roomType === selectedRoomType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        room =>
          room.roomName?.toLowerCase().includes(query) ||
          room.description?.toLowerCase().includes(query) ||
          room.contextId?.toLowerCase().includes(query)
      );
    }

    setFilteredRooms(filtered);
  }, [rooms, searchQuery, selectedRoomType]);

  // Calculate total unread messages
  const totalUnread =
    rooms?.reduce((sum, room) => sum + (room.unreadCount || 0), 0) || 0;

  return (
    <div className={styles.chatRoomsPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              <MessageOutlined className={styles.titleIcon} />
              Tin nhắn
            </h1>
            {totalUnread > 0 && (
              <Badge count={totalUnread} className={styles.totalUnreadBadge} />
            )}
          </div>
          <p className={styles.subtitle}>
            Quản lý các cuộc trò chuyện về yêu cầu và dự án
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.searchSection}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <Input
              size="large"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Lọc theo loại"
              allowClear
              value={selectedRoomType}
              onChange={setSelectedRoomType}
              style={{ width: '200px' }}
              size="large"
            >
              <Option value="REQUEST_CHAT">Request</Option>
              <Option value="CONTRACT_CHAT">Contract</Option>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" spinning tip="Loading chat list..." />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className={styles.emptyContainer}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchQuery
                  ? 'No matching conversations found'
                  : 'No conversations yet'
              }
            />
          </div>
        ) : (
          <div className={styles.roomsList}>
            {filteredRooms.map(room => (
              <ChatRoomCard key={room.roomId} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoomsPage;
