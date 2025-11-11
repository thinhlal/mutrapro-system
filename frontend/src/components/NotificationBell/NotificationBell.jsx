import { useState } from 'react';
import { Badge, Drawer, List, Button, Empty, Spin, Typography, Divider } from 'antd';
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
   * Handle drawer open
   */
  const handleOpenDrawer = () => {
    setVisible(true);
    fetchLatestNotifications();
  };

  /**
   * Handle drawer close
   */
  const handleCloseDrawer = () => {
    setVisible(false);
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

  return (
    <>
      <Badge count={unreadCount} overflowCount={99} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          className={styles.bellButton}
          onClick={handleOpenDrawer}
        />
      </Badge>

      <Drawer
        title={
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>
              <BellOutlined className={styles.drawerIcon} />
              <span>Thông báo</span>
              {!connected && (
                <span className={styles.offlineIndicator}> (Offline)</span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={markAllAsRead}
                className={styles.markAllButton}
              >
                Đánh dấu tất cả
              </Button>
            )}
          </div>
        }
        placement="right"
        onClose={handleCloseDrawer}
        open={visible}
        width={720}
        className={styles.notificationDrawer}
      >
        {/* Notifications List */}
        <div className={styles.notificationList}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Spin tip="Đang tải..." size="large" />
            </div>
          ) : notifications.length === 0 ? (
            <Empty
              description="Không có thông báo"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: '60px' }}
            />
          ) : (
            <>
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
              
              <Divider style={{ margin: '12px 0' }} />
              
              <div className={styles.footer}>
                <Button 
                  type="primary" 
                  block
                  onClick={() => {
                    navigate('/notifications');
                    handleCloseDrawer();
                  }}
                  className={styles.viewAllButton}
                >
                  Xem tất cả thông báo
                </Button>
              </div>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
};

export default NotificationBell;

