// src/components/common/UserMenu/UserMenu.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getOrCreateMyWallet } from '../../../services/walletService';
import styles from './UserMenu.module.css';
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  FileTextOutlined,
  WalletOutlined,
  MessageOutlined,
} from '@ant-design/icons';

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const menuRef = useRef(null);
  const { user, logout, loading, isAuthenticated } = useAuth();
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

  // Load wallet info when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadWallet();
    }
  }, [isAuthenticated, user]);

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const response = await getOrCreateMyWallet();
      if (response.status === 'success' && response.data) {
        setWallet(response.data);
      }
    } catch (error) {
      // Silent fail - don't show error in menu
      console.error('Failed to load wallet:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'VND') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  const truncateText = (text, maxLength = 16) => {
    if (!text) return '';
    return text.length > maxLength
      ? `${text.slice(0, maxLength).trim()}...`
      : text;
  };

  const getInitials = email => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.fullName) return truncateText(user.fullName);
    if (user?.email) return truncateText(user.email.split('@')[0]);
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
          <span
            className={styles.userName}
            title={user?.fullName || user?.email || 'User'}
          >
            {getDisplayName()}
          </span>
          {/* <span className={styles.userRole}>{user?.role || 'User'}</span> */}
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
              <p
                className={styles.dropdownUserName}
                title={user?.fullName || user?.email || 'User'}
              >
                {getDisplayName()}
              </p>
              <p className={styles.dropdownUserEmail}>{user?.email}</p>
            </div>
          </div>

          {/* Wallet Balance Section */}
          {wallet && (
            <>
              <div className={styles.walletBalanceSection}>
                <div className={styles.walletBalanceHeader}>
                  <WalletOutlined className={styles.walletIcon} />
                  <span className={styles.walletLabel}>Available balance</span>
                </div>
                <div className={styles.walletBalanceAmount}>
                  {walletLoading ? (
                    <span className={styles.walletLoading}>...</span>
                  ) : (
                    formatCurrency(
                      wallet?.availableBalance ??
                        (wallet?.balance
                          ? wallet.balance - (wallet.holdBalance || 0)
                          : 0),
                      wallet.currency
                    )
                  )}
                </div>
              </div>
              <div className={styles.dropdownDivider} />
            </>
          )}

          <ul className={styles.dropdownMenu}>
            {/* Transcription Dashboard */}
            {(user?.role?.toUpperCase() === 'TRANSCRIPTION' ||
              user?.role?.toUpperCase() === 'SYSTEM_ADMIN') && (
              <li>
                <Link
                  to="/transcription/my-tasks"
                  className={styles.dropdownItem}
                  onClick={handleMenuItemClick}
                >
                  <DashboardOutlined className={styles.dropdownIcon} />
                  <span>Transcription Dashboard</span>
                </Link>
              </li>
            )}

            {/* Arrangement Dashboard */}
            {(user?.role?.toUpperCase() === 'ARRANGEMENT' ||
              user?.role?.toUpperCase() === 'SYSTEM_ADMIN') && (
              <li>
                <Link
                  to="/arrangement/my-tasks"
                  className={styles.dropdownItem}
                  onClick={handleMenuItemClick}
                >
                  <DashboardOutlined className={styles.dropdownIcon} />
                  <span>Arrangement Dashboard</span>
                </Link>
              </li>
            )}

            {/* Recording Artist Dashboard */}
            {(user?.role?.toUpperCase() === 'RECORDING_ARTIST' ||
              user?.role?.toUpperCase() === 'SYSTEM_ADMIN') && (
              <li>
                <Link
                  to="/recording-artist/profile"
                  className={styles.dropdownItem}
                  onClick={handleMenuItemClick}
                >
                  <DashboardOutlined className={styles.dropdownIcon} />
                  <span>Recording Artist Dashboard</span>
                </Link>
              </li>
            )}

            {/* Manager Dashboard */}
            {(user?.role?.toUpperCase() === 'MANAGER' ||
              user?.role?.toUpperCase() === 'SYSTEM_ADMIN') && (
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

            {/* Admin Dashboard */}
            {user?.role?.toUpperCase() === 'SYSTEM_ADMIN' && (
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
            )}

            {/* My requests */}
            <li>
              <Link
                to="/my-requests"
                className={styles.dropdownItem}
                onClick={handleMenuItemClick}
              >
                <FileTextOutlined className={styles.dropdownIcon} />
                <span>My Requests</span>
              </Link>
            </li>

            {/* Wallet */}
            <li>
              <Link
                to="/wallet"
                className={styles.dropdownItem}
                onClick={handleMenuItemClick}
              >
                <WalletOutlined className={styles.dropdownIcon} />
                <span>My Wallet</span>
              </Link>
            </li>

            {/* Chat */}
            <li>
              <Link
                to="/chat"
                className={styles.dropdownItem}
                onClick={handleMenuItemClick}
              >
                <MessageOutlined className={styles.dropdownIcon} />
                <span>Chat</span>
              </Link>
            </li>

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
