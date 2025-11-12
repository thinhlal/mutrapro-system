import { useState, useEffect } from 'react';
import { Input, Spin, Empty, Badge } from 'antd';
import { SearchOutlined, MessageOutlined } from '@ant-design/icons';
import { useChatRooms } from '../../../hooks/useChat';
import ChatRoomCard from '../../../components/chat/ChatRoomCard/ChatRoomCard';
import styles from './ChatRoomsPage.module.css';

/**
 * Chat Rooms List Page
 * Displays all chat rooms for the current user
 */
const ChatRoomsPage = () => {
  const { rooms, loading, refreshRooms } = useChatRooms();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRooms, setFilteredRooms] = useState([]);

  // Filter rooms based on search query
  useEffect(() => {
    if (!rooms) {
      setFilteredRooms([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredRooms(rooms);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rooms.filter((room) =>
      room.roomName?.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.contextId?.toLowerCase().includes(query)
    );

    setFilteredRooms(filtered);
  }, [rooms, searchQuery]);

  // Calculate total unread messages
  const totalUnread = rooms?.reduce((sum, room) => sum + (room.unreadCount || 0), 0) || 0;

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
          <Input
            size="large"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
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
                  ? "No matching conversations found" 
                  : "No conversations yet"
              }
            />
          </div>
        ) : (
          <div className={styles.roomsList}>
            {filteredRooms.map((room) => (
              <ChatRoomCard key={room.roomId} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoomsPage;

