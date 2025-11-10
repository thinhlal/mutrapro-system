import { useState } from 'react';
import { Badge, Dropdown, List, Button, Empty, Spin, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import styles from './NotificationBell.module.css';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Title } = Typography;

/**
 * Notification Bell Component
 * Hiển thị icon chuông với badge số lượng thông báo chưa đọc
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  
  const {
    unreadCount,
    notifications,
    loading,
    connected,
    fetchLatestNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  /**
   * Handle notification click
   */
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification.notificationId);
    }
    
    // Navigate to action URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    setVisible(false);
  };

  /**
   * Handle dropdown visibility change
   */
  const handleVisibleChange = (v) => {
    setVisible(v);
    if (v) {
      fetchLatestNotifications();
    }
  };

  /**
   * Format notification time
   */
  const formatTime = (timestamp) => {
    try {
      if (!timestamp) return '';
      return dayjs(timestamp).fromNow();
    } catch {
      return '';
    }
  };

  /**
   * Dropdown menu content
   */
  const menu = (
    <div className={styles.notificationDropdown}>
      {/* Header */}
      <div className={styles.header}>
        <Title level={5} style={{ margin: 0 }}>
          Thông báo
          {!connected && (
            <span className={styles.offlineIndicator}> (Offline)</span>
          )}
        </Title>
        {unreadCount > 0 && (
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            onClick={markAllAsRead}
          >
            Đánh dấu tất cả
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className={styles.notificationList}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin tip="Đang tải..." />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description="Không có thông báo"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                key={notification.notificationId}
                className={`${styles.notificationItem} ${
                  !notification.isRead ? styles.unread : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <Text strong className={styles.title}>
                      {notification.title}
                    </Text>
                    {!notification.isRead && (
                      <span className={styles.unreadDot} />
                    )}
                  </div>
                  <Text type="secondary" className={styles.content}>
                    {notification.content}
                  </Text>
                  <Text type="secondary" className={styles.time}>
                    {formatTime(notification.createdAt)}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={styles.footer}>
          <Button type="link" onClick={() => {
            navigate('/profile/notifications');
            setVisible(false);
          }}>
            Xem tất cả thông báo
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => (
        <div className={styles.notificationDropdownOverlay}>
          {menu}
        </div>
      )}
      trigger={['click']}
      open={visible}
      onOpenChange={handleVisibleChange}
      placement="bottomRight"
    >
      <Badge count={unreadCount} overflowCount={99} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          className={styles.bellButton}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;

