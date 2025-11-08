import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Avatar,
  Button,
  Space,
  Tag,
  message,
} from 'antd';
import { UserOutlined, EditOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './AdminProfile.module.css';

const AdminProfile = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      message.success('Đăng xuất thành công');
      navigate('/login');
    } catch (error) {
      message.error('Lỗi khi đăng xuất');
      setLoggingOut(false);
    }
  };

  const getRoleColor = role => {
    const colors = {
      SYSTEM_ADMIN: 'red',
      SERVICE_COORDINATOR: 'blue',
      CUSTOMER: 'green',
    };
    return colors[role] || 'default';
  };

  const getRoleDisplayName = role => {
    const names = {
      SYSTEM_ADMIN: 'System Administrator',
      SERVICE_COORDINATOR: 'Service Coordinator',
      CUSTOMER: 'Customer',
    };
    return names[role] || role;
  };

  return (
    <div className={styles.container}>
      <Card
        title={<h2 style={{ margin: 0 }}>Admin Profile</h2>}
        extra={
          <Space>
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              loading={loggingOut}
            >
              Logout
            </Button>
          </Space>
        }
      >
        <div className={styles.profileHeader}>
          <Avatar size={100} icon={<UserOutlined />} />
          <div className={styles.profileInfo}>
            <h2>{user?.fullName || 'Admin User'}</h2>
            <Tag color={getRoleColor(user?.role)}>
              {getRoleDisplayName(user?.role)}
            </Tag>
          </div>
        </div>

        <Descriptions
          bordered
          column={1}
          style={{ marginTop: 30 }}
          labelStyle={{ fontWeight: 600, width: 200 }}
        >
          <Descriptions.Item label="Full Name">
            {user?.fullName || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="User ID">{user?.id}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={getRoleColor(user?.role)}>
              {getRoleDisplayName(user?.role)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Account Type">
            <Tag color={user?.isNoPassword ? 'orange' : 'blue'}>
              {user?.isNoPassword ? 'OAuth Account' : 'Local Account'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <div className={styles.actions}>
          <Space>
            <Button type="default" icon={<EditOutlined />}>
              Edit Profile
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;

