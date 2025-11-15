import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EditOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import {
  Button,
  Layout,
  Menu,
  theme,
  Avatar,
  Dropdown,
  message,
} from 'antd';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import { useAuth } from '../../contexts/AuthContext';
import styles from './TranscriptionLayout.module.css';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/transcription/edit-tool',
    icon: <EditOutlined />,
    label: <Link to="/transcription/edit-tool">Edit Tool</Link>,
  },
];

const TranscriptionLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

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

  const userMenu = (
    <Menu>
      <Menu.Item
        key="logout"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? 'Logging out...' : 'Logout'}
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout className={styles.transcriptionLayout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        className={styles.sider}
      >
        <div className={styles.logo}>
          {collapsed ? 'MTP' : 'MuTraPro Transcription'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          className={styles.header}
          style={{ background: colorBgContainer }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.triggerButton}
          />
          <div className={styles.headerRight}>
            <NotificationBell />
            <Dropdown overlay={userMenu} trigger={['click']}>
              <a onClick={e => e.preventDefault()}>
                <Avatar icon={<UserOutlined />} />
                <span className={styles.userName}>
                  {user?.fullName || user?.email || 'Transcriber'}
                </span>
              </a>
            </Dropdown>
          </div>
        </Header>
        <Content
          className={styles.content}
          style={{
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default TranscriptionLayout;

