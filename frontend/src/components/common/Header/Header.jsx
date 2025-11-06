// src/components/common/Header/Header.jsx
import { useState, useEffect, useCallback, memo } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import UserMenu from '../UserMenu/UserMenu';
import styles from './Header.module.css';
import logo from '../../../assets/images/Logo/Logotip-Positiu.svg';

// ---- Helpers ----
const SECTION_KEYS = new Map([
  ['/', 'home'],
  ['/transcription', 'audio'],
  ['/request-service', 'request'],
  ['/pricing', 'pricing'],
  ['/reviews', 'reviews'],
  ['/about', 'about'],
  ['/contact', 'contact'],
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
      {/* Auth bar */}
      <div
        className={classNames(styles.container, styles.authAlign)}
        style={{ marginTop: '1rem' }}
      >
        {isAuthenticated ? (
          <UserMenu />
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
              {navLink('/transcription', 'audio', 'Audio → Sheet Music')}
              {navLink('/request-service', 'request', 'Request Service')}
              {navLink('/pricing', 'pricing', 'Pricing')}
              {navLink('/reviews', 'reviews', 'Reviews')}
              {navLink('/about', 'about', 'About us')}
              {navLink('/contact', 'contact', 'Contact')}
            </Nav>

            {/* CTA */}
            <div className={styles.ctaContainer}>
              <Link to="/request-service" className={styles.ctaButton}>
                REQUEST YOUR SHEET MUSIC
              </Link>
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
                to="/transcription"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'audio',
                })}
                onClick={closeMobileMenu}
              >
                Audio → Sheet Music
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
                to="/pricing"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'pricing',
                })}
                onClick={closeMobileMenu}
              >
                Pricing
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/reviews"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'reviews',
                })}
                onClick={closeMobileMenu}
              >
                Reviews
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/about"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'about',
                })}
                onClick={closeMobileMenu}
              >
                About us
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/contact"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === 'contact',
                })}
                onClick={closeMobileMenu}
              >
                Contact
              </Nav.Link>
            </Nav>

            {/* Mobile CTA */}
            <div className={styles.mobileCta}>
              <Link
                to="/request-service"
                className={styles.mobileCtaButton}
                onClick={closeMobileMenu}
              >
                REQUEST YOUR SHEET MUSIC
              </Link>
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
