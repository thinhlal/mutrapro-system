import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ContainerOutlined,
  TeamOutlined,
  SettingOutlined,
  BarsOutlined,
  LogoutOutlined,
  FileTextOutlined,
  WalletOutlined,
  StarOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme, Avatar, Dropdown, message } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import styles from './AdminLayout.module.css';

const { Header, Sider, Content } = Layout;

// Menu items Sidebar
const menuItems = [
  {
    key: '/admin/dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/admin/dashboard">Dashboard</Link>,
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: <Link to="/admin/users">User Management</Link>,
  },
  {
    key: '/admin/wallets',
    icon: <WalletOutlined />,
    label: <Link to="/admin/wallets">Wallet Management</Link>,
  },
  {
    key: '/admin/service-requests',
    icon: <FileTextOutlined />,
    label: <Link to="/admin/service-requests">Service Requests</Link>,
  },
  {
    key: '/admin/notation-instruments',
    icon: <BarsOutlined />,
    label: <Link to="/admin/notation-instruments">Notation Instruments</Link>,
  },
  {
    key: '/admin/equipment',
    icon: <BarsOutlined />,
    label: <Link to="/admin/equipment">Equipment Management</Link>,
  },
  {
    key: '/admin/specialists',
    icon: <StarOutlined />,
    label: <Link to="/admin/specialists">Specialist Management</Link>,
  },
  {
    key: '/admin/skills',
    icon: <BarsOutlined />,
    label: <Link to="/admin/skills">Skill Management</Link>,
  },
  {
    key: '/admin/demos',
    icon: <PlayCircleOutlined />,
    label: <Link to="/admin/demos">Demo Management</Link>,
  },
  {
    key: '/admin/contracts',
    icon: <ContainerOutlined />,
    label: <Link to="/admin/contracts">Contracts</Link>,
  },
  {
    key: '/admin/tasks',
    icon: <UnorderedListOutlined />,
    label: <Link to="/admin/tasks">Tasks</Link>,
  },
  {
    key: '/admin/settings',
    icon: <SettingOutlined />,
    label: <Link to="/admin/settings">Settings</Link>,
  },
];

const AdminLayout = () => {
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
        <Link to="/admin/profile">My Profile</Link>
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
    <Layout className={styles.adminLayout}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={240}>
        <div className={styles.logo}>
          {collapsed ? 'MTP' : 'MuTraPro Admin'}
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
                  {user?.fullName || user?.email || 'Admin'}
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

export default AdminLayout;
