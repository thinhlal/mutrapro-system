import React, { useState, useEffect, useCallback } from 'react';
import {
  List,
  Typography,
  Tabs,
  Badge,
  Empty,
  Button,
  Spin,
  Pagination,
  message,
  Card,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/common/Header/Header';
import Footer from '../../../components/common/Footer/Footer';
import notificationService from '../../../services/notificationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import styles from './NotificationsPage.module.css';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

/**
 * Notifications Page
 * Hiển thị danh sách tất cả notifications với pagination
 */
const NotificationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  /**
   * Fetch notifications từ API
   */
  const fetchNotifications = useCallback(
    async (pageNum = 0) => {
      try {
        setLoading(true);
        const response = await notificationService.getNotifications(
          pageNum,
          pageSize
        );
        const pageData = response.data || response;

        setNotifications(pageData.content || []);
        setTotalElements(pageData.totalElements || 0);
        setPage(pageNum);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        message.error('Không thể tải thông báo');
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  /**
   * Fetch unread count
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = useCallback(async notificationId => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      message.success('Đã đánh dấu đã đọc');
    } catch (error) {
      console.error('Failed to mark as read:', error);
      message.error('Không thể đánh dấu đã đọc');
    }
  }, []);

  /**
   * Mark all as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      message.success('Đã đánh dấu tất cả thông báo');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      message.error('Không thể đánh dấu tất cả');
    }
  }, []);

  /**
   * Handle notification click
   */
  const handleNotificationClick = async notification => {
    // Mark as read if unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification.notificationId);
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
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

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = type => {
    switch (type) {
      case 'CHAT_ROOM_CREATED':
        return (
          <BellOutlined className={`${styles.notifIcon} ${styles.info}`} />
        );
      default:
        return (
          <InfoCircleOutlined
            className={`${styles.notifIcon} ${styles.info}`}
          />
        );
    }
  };

  /**
   * Filter notifications based on active tab
   */
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') {
      return !notification.isRead;
    }
    return true; // 'all' tab
  });

  /**
   * Load initial data
   */
  useEffect(() => {
    fetchNotifications(0);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  /**
   * Handle page change
   */
  const handlePageChange = (newPage, newPageSize) => {
    setPageSize(newPageSize);
    fetchNotifications(newPage - 1); // Ant Design Pagination is 1-based, API is 0-based
  };

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          <BellOutlined /> All
        </span>
      ),
      children: (
        <>
          <div className={styles.inboxContent}>
            {loading && notifications.length === 0 ? (
              <div className={styles.loadingContainer}>
                <Spin tip="Loading notifications..." />
              </div>
            ) : filteredNotifications.length > 0 ? (
              <>
                <div className={styles.inboxHeader}>
                  <Text type="secondary">
                    {unreadCount > 0 ? (
                      <>
                        You have {unreadCount} unread{' '}
                        {unreadCount === 1 ? 'notification' : 'notifications'}
                      </>
                    ) : (
                      <>All notifications have been read</>
                    )}
                  </Text>
                  {unreadCount > 0 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <List
                  itemLayout="horizontal"
                  dataSource={filteredNotifications}
                  loading={loading}
                  renderItem={notification => (
                    <List.Item
                      className={`${styles.notificationItem} ${
                        !notification.isRead ? styles.unread : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      style={{ cursor: 'pointer' }}
                    >
                      <List.Item.Meta
                        avatar={getNotificationIcon(notification.type)}
                        title={
                          <div className={styles.notifHeader}>
                            <span className={styles.notifTitle}>
                              {notification.title}
                            </span>
                            {!notification.isRead && (
                              <Badge
                                status="processing"
                                className={styles.unreadBadge}
                              />
                            )}
                          </div>
                        }
                        description={
                          <div>
                            <p className={styles.notifMessage}>
                              {notification.content}
                            </p>
                            <Text type="secondary" className={styles.notifTime}>
                              {formatTime(notification.createdAt)}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            ) : (
              <Empty
                description="No notifications"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
          {totalElements > pageSize && filteredNotifications.length > 0 && (
            <div className={styles.paginationContainer}>
              <Pagination
                current={page + 1}
                total={totalElements}
                pageSize={pageSize}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total} ${total === 1 ? 'notification' : 'notifications'}`
                }
              />
            </div>
          )}
        </>
      ),
    },
    {
      key: 'unread',
      label: (
        <span>
          <BellOutlined /> Unread
          {unreadCount > 0 && (
            <Badge count={unreadCount} className={styles.tabBadge} />
          )}
        </span>
      ),
      children: (
        <div className={styles.inboxContent}>
          {loading && notifications.length === 0 ? (
            <div className={styles.loadingContainer}>
              <Spin tip="Loading notifications..." />
            </div>
          ) : filteredNotifications.length > 0 ? (
            <>
              <div className={styles.inboxHeader}>
                <Text type="secondary">
                  You have {unreadCount} unread{' '}
                  {unreadCount === 1 ? 'notification' : 'notifications'}
                </Text>
                {unreadCount > 0 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleMarkAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <List
                itemLayout="horizontal"
                dataSource={filteredNotifications}
                loading={loading}
                renderItem={notification => (
                  <List.Item
                    className={`${styles.notificationItem} ${styles.unread}`}
                    onClick={() => handleNotificationClick(notification)}
                    style={{ cursor: 'pointer' }}
                  >
                    <List.Item.Meta
                      avatar={getNotificationIcon(notification.type)}
                      title={
                        <div className={styles.notifHeader}>
                          <span className={styles.notifTitle}>
                            {notification.title}
                          </span>
                          <Badge
                            status="processing"
                            className={styles.unreadBadge}
                          />
                        </div>
                      }
                      description={
                        <div>
                          <p className={styles.notifMessage}>
                            {notification.content}
                          </p>
                          <Text type="secondary" className={styles.notifTime}>
                            {formatTime(notification.createdAt)}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </>
          ) : (
            <Empty
              description="No unread notifications"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      <Header />

      <div className={styles.pageContainer}>
        <div className={styles.notificationsContent}>
          <div className={styles.pageHeader}>
            <div className={styles.headerText}>
              <Title level={1} className={styles.pageTitle}>
                Notifications
              </Title>
              <Text type="secondary" className={styles.pageSubtitle}>
                Manage and track all your notifications
              </Text>
            </div>
          </div>

          <Card className={styles.notificationCard}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              className={styles.notificationTabs}
            />
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotificationsPage;
