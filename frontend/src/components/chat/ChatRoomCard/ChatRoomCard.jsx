import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Tag } from 'antd';
import { MessageOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import styles from './ChatRoomCard.module.css';

/**
 * Chat Room Card Component
 * Displays a chat room in the list
 */
const ChatRoomCard = ({ room }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat/${room.roomId}`);
  };

  // Get room type display text
  const getRoomTypeText = type => {
    const types = {
      REQUEST_CHAT: 'Yêu cầu dịch vụ',
      PROJECT_CHAT: 'Dự án',
      REVISION_CHAT: 'Chỉnh sửa',
      SUPPORT_CHAT: 'Hỗ trợ',
      DIRECT_MESSAGE: 'Tin nhắn',
    };
    return types[type] || type;
  };

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

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN');
  };

  const isInactive = room.isActive === false;

  return (
    <div 
      className={`${styles.chatRoomCard} ${isInactive ? styles.inactive : ''}`} 
      onClick={handleClick}
      title={isInactive ? 'Phòng chat này đã được đóng' : ''}
    >
      <div className={styles.roomAvatar}>
        <Badge dot={room.unreadCount > 0 && !isInactive} offset={[-5, 5]}>
          <Avatar
            size={50}
            icon={<MessageOutlined />}
            style={{ 
              backgroundColor: isInactive ? '#d9d9d9' : getRoomTypeColor(room.roomType),
              opacity: isInactive ? 0.6 : 1
            }}
          />
        </Badge>
      </div>

      <div className={styles.roomContent}>
        <div className={styles.roomHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <h3 className={styles.roomName} style={{ margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {room.roomName || 'Chat Room'}
            </h3>
            {isInactive && (
              <Tag
                icon={<LockOutlined />}
                color="default"
                style={{ margin: 0, fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px', flexShrink: 0 }}
              >
                Closed
              </Tag>
            )}
          </div>
          <span className={styles.roomTime}>{formatDate(room.updatedAt)}</span>
        </div>

        <div className={styles.roomDetails}>
          <span
            className={styles.roomType}
            style={{ color: getRoomTypeColor(room.roomType) }}
          >
            {getRoomTypeText(room.roomType)}
          </span>
          {room.description && (
            <p className={styles.roomDescription}>{room.description}</p>
          )}
        </div>

        {room.lastMessage && (
          <div className={styles.lastMessage} style={{ opacity: isInactive ? 0.6 : 1 }}>
            <span className={styles.senderName}>
              {room.lastMessage.senderName}:
            </span>
            <span className={styles.messageContent}>
              {room.lastMessage.content}
            </span>
          </div>
        )}

        <div className={styles.roomFooter}>
          <div className={styles.participants} style={{ opacity: isInactive ? 0.6 : 1 }}>
            <UserOutlined /> {room.participantCount} người
          </div>
          {room.unreadCount > 0 && !isInactive && (
            <Badge count={room.unreadCount} className={styles.unreadBadge} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoomCard;
