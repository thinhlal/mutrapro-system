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
  DollarOutlined,
  UsergroupAddOutlined,
  EditOutlined,
  CalendarOutlined,
  MessageOutlined,
  FundOutlined,
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
    key: '/admin/wallet-dashboard',
    icon: <FundOutlined />,
    label: <Link to="/admin/wallet-dashboard">Wallet & Revenue</Link>,
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
    key: '/admin/withdrawal-requests',
    icon: <DollarOutlined />,
    label: <Link to="/admin/withdrawal-requests">Withdrawal Requests</Link>,
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
    key: '/admin/pricing-matrix',
    icon: <DollarOutlined />,
    label: <Link to="/admin/pricing-matrix">Pricing Matrix</Link>,
  },
  {
    key: '/admin/studios',
    icon: <PlayCircleOutlined />,
    label: <Link to="/admin/studios">Studio Management</Link>,
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
    key: '/admin/milestone-assignments',
    icon: <UsergroupAddOutlined />,
    label: <Link to="/admin/milestone-assignments">Milestones</Link>,
  },
  {
    key: '/admin/task-progress',
    icon: <UnorderedListOutlined />,
    label: <Link to="/admin/task-progress">Task Progress</Link>,
  },
  {
    key: '/admin/revision-requests',
    icon: <EditOutlined />,
    label: <Link to="/admin/revision-requests">Revision Requests</Link>,
  },
  {
    key: '/admin/studio-bookings',
    icon: <CalendarOutlined />,
    label: <Link to="/admin/studio-bookings">Studio Bookings</Link>,
  },
  {
    key: '/admin/reviews',
    icon: <StarOutlined />,
    label: <Link to="/admin/reviews">Review Management</Link>,
  },
  {
    key: '/admin/chat-rooms',
    icon: <MessageOutlined />,
    label: <Link to="/admin/chat-rooms">Chat Rooms Management</Link>,
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

  // Function to get selected key for menu highlighting
  const getSelectedKey = () => {
    const path = location.pathname;
    // Handle nested routes - return parent route key
    if (path.startsWith('/admin/milestone-assignments')) {
      return '/admin/milestone-assignments';
    }
    if (path.startsWith('/admin/tasks/')) {
      return '/admin/task-progress';
    }
    if (path.startsWith('/admin/contracts/')) {
      return '/admin/contracts';
    }
    if (path.startsWith('/admin/studio-bookings/')) {
      return '/admin/studio-bookings';
    }
    if (path.startsWith('/admin/studio-booking/')) {
      return '/admin/studio-bookings';
    }
    if (path.startsWith('/admin/chat-rooms')) {
      return '/admin/chat-rooms';
    }
    if (path.startsWith('/admin/service-requests/')) {
      return '/admin/service-requests';
    }
    if (path.startsWith('/admin/wallet-dashboard')) {
      return '/admin/wallet-dashboard';
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
