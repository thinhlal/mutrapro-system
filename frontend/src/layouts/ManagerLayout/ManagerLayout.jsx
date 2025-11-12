import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ContainerOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme, Avatar, Dropdown, message } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import styles from './ManagerLayout.module.css';

const { Header, Sider, Content } = Layout;

// Menu items Sidebar
const menuItems = [
  {
    key: '/manager/dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/manager/dashboard">Dashboard</Link>,
  },
  {
    key: '/manager/service-requests',
    icon: <FileTextOutlined />,
    label: <Link to="/manager/service-requests">Service Requests</Link>,
  },
  {
    key: '/manager/contracts-list',
    icon: <ContainerOutlined />,
    label: <Link to="/manager/contracts-list">Contracts</Link>,
  },
  {
    key: '/manager/task',
    icon: <UnorderedListOutlined />,
    label: <Link to="/manager/task">Task</Link>,
  },
];

const ManagerLayout = () => {
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

  // Dropdown menu cho User Avatar
  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link to="/manager/profile">My Profile</Link>
      </Menu.Item>
      <Menu.Divider />
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
    <Layout className={styles.managerLayout}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={240}>
        <div className={styles.logo}>
          {collapsed ? 'MTP' : 'MuTraPro Manager'}
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
          <div
            className={styles.headerRight}
            style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <NotificationBell />
            <Dropdown overlay={userMenu} trigger={['click']}>
              <a onClick={e => e.preventDefault()}>
                <Avatar icon={<UserOutlined />} />
                <span className={styles.userName}>
                  {user?.fullName || user?.email || 'Manager'}
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

export default ManagerLayout;
