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
  UsergroupAddOutlined,
  MessageOutlined,
  EditOutlined,
  CalendarOutlined,
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
    key: '/manager/contracts',
    icon: <ContainerOutlined />,
    label: <Link to="/manager/contracts">Contracts</Link>,
  },
  {
    key: '/manager/milestone-assignments',
    icon: <UsergroupAddOutlined />,
    label: <Link to="/manager/milestone-assignments">Milestones</Link>,
  },
  {
    key: '/manager/task-progress',
    icon: <UnorderedListOutlined />,
    label: <Link to="/manager/task-progress">Task Progress</Link>,
  },
  {
    key: '/manager/revision-requests',
    icon: <EditOutlined />,
    label: <Link to="/manager/revision-requests">Revision Requests</Link>,
  },
  {
    key: '/manager/studio-bookings',
    icon: <CalendarOutlined />,
    label: <Link to="/manager/studio-bookings">Studio Bookings</Link>,
  },
  {
    key: '/manager/chat',
    icon: <MessageOutlined />,
    label: <Link to="/manager/chat">Chat</Link>,
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

  // Get selected key from pathname (support nested routes)
  const getSelectedKey = () => {
    const path = location.pathname;
    // Match exact paths or paths that start with the menu key
    if (path.startsWith('/manager/chat')) {
      return '/manager/chat';
    }
    if (path.startsWith('/manager/studio-booking')) {
      return '/manager/studio-bookings';
    }
    return path;
  };

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
      <Sider trigger={null} collapsible collapsed={collapsed} width={200}>
        <div className={styles.logo}>
          {collapsed ? 'MTP' : 'MuTraPro Manager'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
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
