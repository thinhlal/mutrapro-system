import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme, Avatar, Dropdown, message } from 'antd';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import { useAuth } from '../../contexts/AuthContext';
import styles from './SpecialistLayout.module.css';

const { Header, Sider, Content } = Layout;

const SpecialistLayout = ({ specialization, menuItems }) => {
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

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: loggingOut ? 'Logging out...' : 'Logout',
      onClick: handleLogout,
      disabled: loggingOut,
    },
  ];

  const getSpecializationDisplayName = () => {
    const names = {
      TRANSCRIPTION: 'Transcription',
      ARRANGEMENT: 'Arrangement',
      RECORDING_ARTIST: 'Recording Artist',
    };
    return names[specialization] || 'Specialist';
  };

  return (
    <Layout className={styles.specialistLayout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        className={styles.sider}
      >
        <div className={styles.logo}>
          {collapsed ? 'MTP' : `MuTraPro ${getSpecializationDisplayName()}`}
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
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <a onClick={e => e.preventDefault()}>
                <Avatar icon={<UserOutlined />} />
                <span className={styles.userName}>
                  {user?.fullName || user?.email || 'Specialist'}
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

export default SpecialistLayout;
