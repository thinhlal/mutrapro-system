// src/components/common/UserMenu/UserMenu.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './UserMenu.module.css';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined, // nếu không dùng nữa thì xoá
  DashboardOutlined,
  BellOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = event => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuItemClick = () => {
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  const getInitials = email => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.fullName) return user.fullName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.avatarButton}
        onClick={toggleMenu}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={styles.avatar}>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={getDisplayName()}
              className={styles.avatarImage}
            />
          ) : (
            <span className={styles.avatarInitials}>
              {getInitials(user?.email)}
            </span>
          )}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{getDisplayName()}</span>
          <span className={styles.userRole}>{user?.role || 'User'}</span>
        </div>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownAvatar}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={getDisplayName()}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarInitials}>
                  {getInitials(user?.email)}
                </span>
              )}
            </div>
            <div className={styles.dropdownUserInfo}>
              <p className={styles.dropdownUserName}>{getDisplayName()}</p>
              <p className={styles.dropdownUserEmail}>{user?.email}</p>
            </div>
          </div>

          <div className={styles.dropdownDivider} />

          <ul className={styles.dropdownMenu}>
            {/* Profile */}
            <li>
              <Link
                to="/profile"
                className={styles.dropdownItem}
                onClick={handleMenuItemClick}
              >
                <UserOutlined className={styles.dropdownIcon} />
                <span>My Profile</span>
              </Link>
            </li>

            {/* Manager Dashboard */}
            {user?.role === 'MANAGER' && (
              <li>
                <Link
                  to="/manager/dashboard"
                  className={styles.dropdownItem}
                  onClick={handleMenuItemClick}
                >
                  <DashboardOutlined className={styles.dropdownIcon} />
                  <span>Manager Dashboard</span>
                </Link>
              </li>
            )}

            {/* Admin Dashboard + Manager */}
            {user?.role === 'SYSTEM_ADMIN' && (
              <>
                <li>
                  <Link
                    to="/admin/dashboard"
                    className={styles.dropdownItem}
                    onClick={handleMenuItemClick}
                  >
                    <DashboardOutlined className={styles.dropdownIcon} />
                    <span>Admin Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/manager/dashboard"
                    className={styles.dropdownItem}
                    onClick={handleMenuItemClick}
                  >
                    <DashboardOutlined className={styles.dropdownIcon} />
                    <span>Manager Dashboard</span>
                  </Link>
                </li>
              </>
            )}

            {/* My requests */}
            <li>
              <Link
                to="/profile/my-requests"
                className={styles.dropdownItem}
                onClick={handleMenuItemClick}
              >
                <FileTextOutlined className={styles.dropdownIcon} />
                <span>My Requests</span>
              </Link>
            </li>
          </ul>

          <div className={styles.dropdownDivider} />

          <button
            className={styles.dropdownItemLogout}
            onClick={handleLogout}
            disabled={loading}
          >
            <LogoutOutlined className={styles.dropdownIcon} />
            <span>{loading ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
