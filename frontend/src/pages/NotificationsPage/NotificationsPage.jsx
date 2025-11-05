import React, { useState } from 'react';
import { Switch, List, Typography, Tabs, Badge, Empty, Button } from 'antd';
import {
  BellOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import ProfileLayout from '../../layouts/ProfileLayout/ProfileLayout';
import styles from './NotificationsPage.module.css';

const { Title, Text } = Typography;

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('inbox');

  const notificationSettings = [
    {
      id: 1,
      title: 'Email Notifications',
      description: 'Receive email updates about your orders and account',
      enabled: true,
    },
    {
      id: 2,
      title: 'Order Updates',
      description: 'Get notified when your order status changes',
      enabled: true,
    },
    {
      id: 3,
      title: 'Promotional Emails',
      description: 'Receive emails about special offers and promotions',
      enabled: false,
    },
    {
      id: 4,
      title: 'Newsletter',
      description: 'Subscribe to our monthly newsletter',
      enabled: false,
    },
  ];

  const systemNotifications = [
    {
      id: 1,
      type: 'success',
      title: 'Order Completed',
      message: 'Your transcription order #12345 has been completed successfully.',
      time: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'info',
      title: 'New Feature Available',
      message: 'We have added a new AI-powered transcription feature. Check it out!',
      time: '1 day ago',
      read: false,
    },
    {
      id: 3,
      type: 'warning',
      title: 'Payment Method Expiring',
      message: 'Your credit card ending in 4242 will expire soon. Please update your payment method.',
      time: '2 days ago',
      read: true,
    },
    {
      id: 4,
      type: 'info',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will be performed on Dec 15, 2024 from 2:00 AM to 4:00 AM EST.',
      time: '3 days ago',
      read: true,
    },
    {
      id: 5,
      type: 'success',
      title: 'Welcome to MutraPro!',
      message: 'Thank you for joining us. Get started by uploading your first audio file.',
      time: '1 week ago',
      read: true,
    },
  ];

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined className={`${styles.notifIcon} ${styles.success}`} />;
      case 'warning':
        return <WarningOutlined className={`${styles.notifIcon} ${styles.warning}`} />;
      case 'info':
      default:
        return <InfoCircleOutlined className={`${styles.notifIcon} ${styles.info}`} />;
    }
  };

  const unreadCount = systemNotifications.filter(n => !n.read).length;

  const tabItems = [
    {
      key: 'inbox',
      label: (
        <span>
          <BellOutlined /> Inbox
          {unreadCount > 0 && (
            <Badge count={unreadCount} className={styles.tabBadge} />
          )}
        </span>
      ),
      children: (
        <div className={styles.inboxContent}>
          {systemNotifications.length > 0 ? (
            <>
              <div className={styles.inboxHeader}>
                <Text type="secondary">
                  You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Text>
                <Button type="link" size="small">
                  Mark all as read
                </Button>
              </div>
              <List
                itemLayout="horizontal"
                dataSource={systemNotifications}
                renderItem={(item) => (
                  <List.Item
                    className={`${styles.notificationItem} ${!item.read ? styles.unread : ''}`}
                    actions={[
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={getNotificationIcon(item.type)}
                      title={
                        <div className={styles.notifHeader}>
                          <span className={styles.notifTitle}>{item.title}</span>
                          {!item.read && <Badge status="processing" />}
                        </div>
                      }
                      description={
                        <div>
                          <p className={styles.notifMessage}>{item.message}</p>
                          <Text type="secondary" className={styles.notifTime}>
                            {item.time}
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
              description="No notifications yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      ),
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined /> Settings
        </span>
      ),
      children: (
        <div className={styles.settingsContent}>
          <Text type="secondary" className={styles.settingsDesc}>
            Manage your notification preferences
          </Text>
          <div className={styles.settingsList}>
            <List
              itemLayout="horizontal"
              dataSource={notificationSettings}
              renderItem={(item) => (
                <List.Item
                  className={styles.listItem}
                  extra={<Switch defaultChecked={item.enabled} />}
                >
                  <List.Item.Meta
                    title={<span className={styles.settingTitle}>{item.title}</span>}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <ProfileLayout>
      <div className={styles.notificationsContent}>
        <Title level={2}>Notifications</Title>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className={styles.notificationTabs}
        />
      </div>
    </ProfileLayout>
  );
};

export default NotificationsPage;

