import { Avatar, Button, Badge, Tag, Select } from 'antd';
import {
  ArrowLeftOutlined,
  MoreOutlined,
  UserOutlined,
  LockOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ChatHeader.module.css';

const { Option } = Select;

/**
 * Chat Header Component
 * Header for chat conversation page
 */
const ChatHeader = ({ room, connected = false, selectedContextType = null, onContextTypeChange = null }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Detect if we're in manager route or customer route
    const backPath = location.pathname.startsWith('/manager/chat')
      ? '/manager/chat'
      : '/chat';
    navigate(backPath);
  };

  // Get room type text
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

  if (!room) {
    return (
      <div className={styles.chatHeader}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          className={styles.backButton}
        />
        <div className={styles.headerInfo}>
          <h3 className={styles.roomName}>Loading...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatHeader}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
        className={styles.backButton}
      />

      <Avatar size={40} icon={<UserOutlined />} className={styles.avatar} />

      <div className={styles.headerInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className={styles.roomName}>{room.roomName || 'Chat Room'}</h3>
          {room.isActive === false && (
            <Tag
              icon={<LockOutlined />}
              color="default"
              style={{ margin: 0, fontSize: '11px' }}
            >
              Closed
            </Tag>
          )}
        </div>
        <div className={styles.roomMeta}>
          <Badge
            status={connected ? 'success' : 'default'}
            text={connected ? 'Đang kết nối' : 'Không kết nối'}
          />
          <span className={styles.separator}>•</span>
          <span className={styles.roomType}>
            {getRoomTypeText(room.roomType)}
          </span>
          <span className={styles.separator}>•</span>
          <span className={styles.participants}>
            {room.participantCount} người
          </span>
          {room.isActive === false && (
            <>
              <span className={styles.separator}>•</span>
              <span style={{ color: '#999', fontSize: '12px' }}>
                Chỉ xem
              </span>
            </>
          )}
        </div>
        {/* Filter by context type - Only show for CONTRACT_CHAT */}
        {room?.roomType === 'CONTRACT_CHAT' && onContextTypeChange && (
          <div style={{ marginTop: '8px' }}>
            <Select
              placeholder="Lọc theo loại tin nhắn"
              allowClear
              value={selectedContextType}
              onChange={onContextTypeChange}
              style={{ width: '100%', fontSize: '12px' }}
              size="small"
            >
              <Option value="GENERAL">Chat chung</Option>
              <Option value="MILESTONE">Milestone</Option>
            </Select>
          </div>
        )}
      </div>

      <Button
        type="text"
        icon={<MoreOutlined />}
        className={styles.moreButton}
      />
    </div>
  );
};

export default ChatHeader;
