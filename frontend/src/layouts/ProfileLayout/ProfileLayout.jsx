import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ProfileLayout.module.css';
import Header from '../../components/common/Header/Header';
import Footer from '../../components/common/Footer/Footer';

const ProfileLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Back to app', path: '/', type: 'link' },
    { type: 'separator' },
    { label: 'Profile', path: '/profile' },
    { label: 'My Requests', path: '/profile/my-requests' },
    { label: 'Subscription', path: '/profile/subscription' },
  ];

  const handleNavClick = (item) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div>
      <Header />
      <div className={styles.profilePageContainer}>
        <nav className={styles.sideNav}>
          {navItems.map((item, index) => {
            if (item.type === 'separator') {
              return <div key={`separator-${index}`} className={styles.navSeparator}></div>;
            }

            return (
              <div
                key={item.path || index}
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => handleNavClick(item)}
              >
                {item.label}
              </div>
            );
          })}
        </nav>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default ProfileLayout;

