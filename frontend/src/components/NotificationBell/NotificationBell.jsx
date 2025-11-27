import { useState } from 'react';
import {
  Badge,
  Dropdown,
  List,
  Button,
  Empty,
  Spin,
  Typography,
  Divider,
} from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import styles from './NotificationBell.module.css';

// Configure dayjs
dayjs.extend(relativeTime);

const { Text, Title } = Typography;

/**
 * Notification Bell Component
 * Display bell icon with badge showing unread notifications count
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);

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
  const handleNotificationClick = async notification => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification.notificationId);
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }

    setOpen(false);
  };

  /**
   * Handle dropdown open change
   */
  const handleOpenChange = flag => {
    setOpen(flag);
    if (flag) {
      fetchLatestNotifications();
    }
  };

  /**
   * Format notification time
   */
  const formatTime = timestamp => {
    try {
      if (!timestamp) return '';
      return dayjs(timestamp).fromNow();
    } catch {
      return '';
    }
  };

  // Dropdown menu content
  const dropdownContent = (
    <div className={styles.notificationDropdown}>
      {/* Header */}
      <div className={styles.dropdownHeader}>
        <div className={styles.headerLeft}>
          {/* <BellOutlined className={styles.headerIcon} /> */}
          <Title level={5} style={{ margin: 0 }}>
            Notifications
          </Title>
          {!connected && (
            <span className={styles.offlineIndicator}> (Offline)</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            onClick={async e => {
              e.stopPropagation();
              try {
                setMarkAllLoading(true);
                await markAllAsRead();
              } finally {
                setMarkAllLoading(false);
              }
            }}
            loading={markAllLoading}
            className={styles.markAllButton}
          >
            Mark all
          </Button>
        )}
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Notifications List */}
      <div className={styles.notificationList}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Spin tip="Loading..." size="default" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description="No notifications"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={notifications.slice(0, 5)}
            renderItem={notification => (
              <List.Item
                key={notification.notificationId}
                className={`${styles.notificationItem} ${
                  !notification.isRead ? styles.unread : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
                style={{ cursor: 'pointer' }}
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
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div className={styles.footer}>
            <Button
              type="link"
              block
              onClick={() => {
                navigate('/notifications');
                setOpen(false);
              }}
              className={styles.viewAllButton}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      overlayClassName={styles.notificationDropdownOverlay}
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
