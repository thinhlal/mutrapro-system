import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Spin, Empty, Badge, Avatar } from 'antd';
import { SearchOutlined, MessageOutlined } from '@ant-design/icons';
import { useChatRooms } from '../../hooks/useChat';
import ChatConversationPage from '../../pages/chat/ChatConversation/ChatConversationPage';
import Header from '../../components/common/Header/Header';
import Footer from '../../components/common/Footer/Footer';
import styles from './ChatLayout.module.css';

/**
 * Chat Layout - Facebook Messenger Style
 * Left sidebar: List of chat rooms
 * Right content: Selected conversation
 */
const ChatLayout = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { rooms, loading } = useChatRooms();
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
    const filtered = rooms.filter(
      room =>
        room.roomName?.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query) ||
        room.contextId?.toLowerCase().includes(query)
    );

    setFilteredRooms(filtered);
  }, [rooms, searchQuery]);

  // Calculate total unread messages
  const totalUnread =
    rooms?.reduce((sum, room) => sum + (room.unreadCount || 0), 0) || 0;

  // Get room type color
  const getRoomTypeColor = type => {
    const colors = {
      REQUEST_CHAT: '#1890ff',
      PROJECT_CHAT: '#52c41a',
      REVISION_CHAT: '#faad14',
      SUPPORT_CHAT: '#722ed1',
      DIRECT_MESSAGE: '#eb2f96',
    };
    return colors[type] || '#1890ff';
  };

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
    
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
  };

  const handleRoomClick = room => {
    navigate(`/chat/${room.roomId}`);
  };

  return (
    <div className={styles.chatLayoutWrapper}>
      <Header />

      <div className={styles.chatLayout}>
        <div className={styles.chatContainer}>
          {/* Left Sidebar - Chat Rooms List */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.headerTitle}>
                <h2>Chats</h2>
                {totalUnread > 0 && (
                  <Badge count={totalUnread} className={styles.totalUnreadBadge} />
                )}
              </div>
              <div className={styles.searchBox}>
                <Input
                  placeholder="Search conversations..."
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
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
                        ? "No conversations found" 
                        : "No conversations yet"
                    }
                  />
                </div>
              ) : (
                filteredRooms.map(room => (
                  <div
                    key={room.roomId}
                    className={`${styles.roomItem} ${roomId === room.roomId ? styles.active : ''}`}
                    onClick={() => handleRoomClick(room)}
                  >
                    <div className={styles.roomAvatar}>
                      <Avatar
                        size={56}
                        icon={<MessageOutlined />}
                        style={{
                          backgroundColor: getRoomTypeColor(room.roomType),
                        }}
                      />
                      {room.unreadCount > 0 && (
                        <span className={styles.unreadDot}></span>
                      )}
                    </div>

                    <div className={styles.roomInfo}>
                      <div className={styles.roomTop}>
                        <h4 className={styles.roomName}>
                          {room.roomName || 'Chat Room'}
                        </h4>
                        <span className={styles.roomTime}>
                          {formatDate(room.updatedAt)}
                        </span>
                      </div>

                      <div className={styles.roomBottom}>
                        <p className={styles.lastMessage}>
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
                        {room.unreadCount > 0 && (
                          <Badge
                            count={room.unreadCount}
                            className={styles.unreadBadge}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))
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
                <p>Choose a conversation from the list on the left to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
