import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ContainerOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme, Avatar, Dropdown } from 'antd';
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
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: <Link to="/profile">Profile</Link>,
  },
];

// Dropdown menu cho User Avatar
const userMenu = (
  <Menu>
    <Menu.Item key="profile">
      <Link to="/profile">My Profile</Link>
    </Menu.Item>
    <Menu.Item key="logout">Logout</Menu.Item>
  </Menu>
);

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout className={styles.adminLayout}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
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
          <div className={styles.headerRight}>
            <Dropdown overlay={userMenu} trigger={['click']}>
              <a onClick={e => e.preventDefault()}>
                <Avatar icon={<UserOutlined />} />
                <span className={styles.userName}>Admin Name</span>
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

