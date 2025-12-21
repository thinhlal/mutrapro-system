// src/components/common/Header/Header.jsx
import { useState, useEffect, useCallback, memo } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import UserMenu from '../UserMenu/UserMenu';
import NotificationBell from '../../NotificationBell/NotificationBell';
import styles from './Header.module.css';
import logo from '../../../assets/images/Logo/Mutralogo.svg';

// ---- Helpers ----
const SECTION_KEYS = new Map([
  ['/', 'home'],
  ['/introduction', 'audio'],
  ['/request-service', 'request'],
  ['/ai-transcription', 'ai-transcription'],
  ['/recording-flow', 'recording'],
  ['/pricing', 'pricing'],
  ['/reviews', 'reviews'],
  ['/chat', 'chat'],
  ['/notifications', 'notifications'],
]);

const SERVICE_FLOW_ROUTES = [
  '/request-service',
  '/detail-service',
  '/transcription/quote',
  '/arrangement/quote',
  '/recording/quote',
  '/checkout/review',
];

const getActiveKey = () => {
  const { pathname } = window.location;

  if (SERVICE_FLOW_ROUTES.some(route => pathname.startsWith(route))) {
    return 'request';
  }

  let winner = 'home';
  let bestLen = -1;
  for (const [path, key] of SECTION_KEYS.entries()) {
    if (pathname.startsWith(path) && path.length > bestLen) {
      bestLen = path.length;
      winner = key;
    }
  }
  return winner;
};

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeKey, setActiveKey] = useState(getActiveKey());
  const { isAuthenticated } = useAuth();

  // Scroll-state (đổi style khi >20px)
  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(y > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active-state theo URL (back/forward)
  useEffect(() => {
    const updateActive = () => setActiveKey(getActiveKey());
    window.addEventListener('popstate', updateActive);
    updateActive();
    return () => {
      window.removeEventListener('popstate', updateActive);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    const onKey = e => e.key === 'Escape' && setIsMobileMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(v => !v), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  const navLink = (to, key, label) => (
    <Nav.Link
      as={Link}
      to={to}
      className={classNames(styles.navLink, {
        [styles.active]: activeKey === key,
      })}
    >
      <span className={styles.linkInner}>{label}</span>
    </Nav.Link>
  );

  return (
    <div
      className={classNames(styles.header, {
        [styles.scrolled]: isScrolled,
      })}
    >
      <Container fluid className={styles.container}>
        <Navbar expand="lg" className={styles.navbar}>
          {/* Logo */}
          <Navbar.Brand as={Link} to="/" className={styles.brand}>
            <img
              src={logo}
              alt="My Sheet Music Transcriptions"
              className={styles.logo}
            />
          </Navbar.Brand>

          {/* Desktop Navigation */}
          <div className={styles.desktopNav}>
            <Nav className={styles.navLinks}>
              {navLink('/', 'home', 'Home')}
              {navLink('/introduction', 'audio', 'Introduction')}
              {navLink('/request-service', 'request', 'Request Service')}
              {navLink(
                '/ai-transcription',
                'ai-transcription',
                'AI Transcription'
              )}
              {isAuthenticated &&
                navLink('/recording-flow', 'recording', 'Recording Booking')}
            </Nav>

            {/* Auth Section */}
            <div className={styles.authSection}>
              {isAuthenticated ? (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  <NotificationBell />
                  <UserMenu />
                </div>
              ) : (
                <div className="d-flex gap-4 align-items-center">
                  <Link
                    to="/login"
                    className={classNames(styles.navLink, styles.authLink)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className={classNames(styles.navLink, styles.authSignup)}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={styles.mobileToggle}
            onClick={toggleMobileMenu}
            aria-label={
              isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMobileMenuOpen ? (
              <CloseOutlined className={styles.toggleIcon} />
            ) : (
              <MenuOutlined className={styles.toggleIcon} />
            )}
          </button>
        </Navbar>

        {/* Mobile Navigation */}
        <div
          id="mobile-nav"
          className={classNames(styles.mobileNav, {
            [styles.mobileNavOpen]: isMobileMenuOpen,
          })}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.mobileNavContent}>
            <Nav className={styles.mobileNavLinks}>
              <Nav.Link
                as={Link}
                to="/"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'home',
                })}
                onClick={closeMobileMenu}
              >
                Home
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/introduction"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'audio',
                })}
                onClick={closeMobileMenu}
              >
                Introduciton
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/request-service"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'request',
                })}
                onClick={closeMobileMenu}
              >
                Request Service
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/ai-transcription"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'ai-transcription',
                })}
                onClick={closeMobileMenu}
              >
                AI Transcription
              </Nav.Link>

              {isAuthenticated && (
                <Nav.Link
                  as={Link}
                  to="/recording-flow"
                  className={classNames(styles.mobileNavLink, {
                    [styles.active]: activeKey === 'recording',
                  })}
                  onClick={closeMobileMenu}
                >
                  Recording Booking
                </Nav.Link>
              )}
            </Nav>

            {/* Mobile Auth Section */}
            <div className={styles.mobileAuthSection}>
              {isAuthenticated ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px 0',
                  }}
                >
                  <Link
                    to="/notifications"
                    className={styles.mobileNavLink}
                    onClick={closeMobileMenu}
                  >
                    Notifications
                  </Link>
                  <Link
                    to="/profile"
                    className={styles.mobileNavLink}
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </Link>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px 0',
                  }}
                >
                  <Link
                    to="/login"
                    className={classNames(
                      styles.mobileNavLink,
                      styles.authLink
                    )}
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className={classNames(
                      styles.mobileNavLink,
                      styles.authSignup
                    )}
                    onClick={closeMobileMenu}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
        )}
      </Container>
    </div>
  );
}

export default memo(Header);
