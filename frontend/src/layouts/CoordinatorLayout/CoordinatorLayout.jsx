import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme, Avatar, Dropdown } from 'antd';
import styles from './CoordinatorLayout.module.css';

const { Header, Sider, Content } = Layout;

// Menu items Sidebar
const menuItems = [
  {
    key: '/coordinator/dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/coordinator/dashboard">Dashboard</Link>,
  },
  {
    key: '/coordinator/contact-builder',
    icon: <ContainerOutlined />,
    label: <Link to="/coordinator/contact-builder">Contact Builder</Link>,
  },
  {
    key: '/coordinator/contracts-list',
    icon: <ContainerOutlined />,
    label: <Link to="/coordinator/contracts-list">Contracts</Link>,
  },
  {
    key: '/coordinator/task',
    icon: <UnorderedListOutlined />,
    label: <Link to="/coordinator/task">Task</Link>,
  },
  {
    key: '3',
    icon: <UserOutlined />,
    label: 'Profile',
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

const CoordinatorLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout className={styles.coordinatorLayout}>
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
                <span className={styles.userName}>Coordinator Name</span>
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

export default CoordinatorLayout;
