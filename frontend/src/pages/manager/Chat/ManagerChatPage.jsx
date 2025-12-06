import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Spin, Empty, Badge, Tag, Select } from 'antd';
import {
  SearchOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useChatRooms } from '../../../hooks/useChat';
import ChatConversationPage from '../../chat/ChatConversation/ChatConversationPage';
import styles from './ManagerChatPage.module.css';

const { Option } = Select;

/**
 * Manager Chat Page
 * Chat interface for MANAGER role - embedded within ManagerLayout
 * Similar to ChatLayout but without Header (Header is in ManagerLayout)
 */
const ManagerChatPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const { rooms, loading } = useChatRooms(selectedRoomType);
  const [filteredRooms, setFilteredRooms] = useState([]);

  // Filter rooms based on search query (rooms đã được filter theo type từ backend)
  useEffect(() => {
    if (loading || !rooms) {
      setFilteredRooms([]);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredRooms(rooms);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rooms.filter(
      room =>
        room.roomName?.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query) ||
        room.contextId?.toLowerCase().includes(query)
    );

    setFilteredRooms(filtered);
  }, [rooms, loading, searchQuery]);

  // Calculate total unread messages
  const totalUnread =
    rooms?.reduce((sum, room) => sum + (room.unreadCount || 0), 0) || 0;

  // Format date
  const formatDate = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const handleRoomClick = room => {
    navigate(`/manager/chat/${room.roomId}`);
  };

  return (
    <div className={styles.managerChatPage}>
      <div className={styles.chatContainer}>
        {/* Left Sidebar - Chat Rooms List */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.headerTitle}>
              <h2>Chats</h2>
              {totalUnread > 0 && (
                <Badge
                  count={totalUnread}
                  className={styles.totalUnreadBadge}
                />
              )}
            </div>
            <div className={styles.searchBox}>
              <Input
                placeholder="Search conversations..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div style={{ marginTop: '12px' }}>
              <Select
                placeholder="Filter by type"
                allowClear
                value={selectedRoomType}
                onChange={setSelectedRoomType}
                style={{ width: '100%' }}
                size="small"
              >
                <Option value="REQUEST_CHAT">Request</Option>
                <Option value="CONTRACT_CHAT">Contract</Option>
              </Select>
            </div>
          </div>

          <div className={styles.roomsList}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spin tip="Loading..." />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className={styles.emptyContainer}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchQuery
                      ? 'No conversations found'
                      : 'No conversations yet'
                  }
                />
              </div>
            ) : (
              filteredRooms.map(room => {
                const isInactive = room.isActive === false;
                return (
                  <div
                    key={room.roomId}
                    className={`${styles.roomItem} ${roomId === room.roomId ? styles.active : ''} ${isInactive ? styles.inactive : ''}`}
                    onClick={() => handleRoomClick(room)}
                    title={isInactive ? 'Phòng chat này đã được đóng' : ''}
                  >
                    <div className={styles.roomInfo}>
                      <div className={styles.roomTop}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <h4
                            className={styles.roomName}
                            style={{
                              margin: 0,
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {room.roomName || 'Chat Room'}
                          </h4>
                          {isInactive && (
                            <Tag
                              icon={<LockOutlined />}
                              color="default"
                              style={{
                                margin: 0,
                                fontSize: '10px',
                                padding: '0 4px',
                                height: '18px',
                                lineHeight: '18px',
                                flexShrink: 0,
                              }}
                            >
                              Closed
                            </Tag>
                          )}
                        </div>
                        <span className={styles.roomTime}>
                          {formatDate(room.updatedAt)}
                        </span>
                      </div>

                      <div className={styles.roomBottom}>
                        <p
                          className={styles.lastMessage}
                          style={{ opacity: isInactive ? 0.6 : 1 }}
                        >
                          {room.lastMessage ? (
                            <>
                              <span className={styles.senderName}>
                                {room.lastMessage.senderName}:
                              </span>{' '}
                              {room.lastMessage.content}
                            </>
                          ) : (
                            room.description || 'No messages yet'
                          )}
                        </p>
                        {room.unreadCount > 0 && !isInactive && (
                          <Badge
                            count={room.unreadCount}
                            className={styles.unreadBadge}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Content - Chat Conversation */}
        <div className={styles.mainContent}>
          {roomId ? (
            <ChatConversationPage />
          ) : (
            <div className={styles.emptyConversation}>
              <h3>Select a conversation</h3>
              <p>
                Choose a conversation from the list on the left to start
                messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerChatPage;
