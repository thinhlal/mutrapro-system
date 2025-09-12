// Header.jsx
import { useState, useEffect, useCallback, memo } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Dropdown } from "antd";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";
import classNames from "classnames";
import styles from "./Header.module.css";
import logo from "../../../assets/images/Logo/Logotip-Positiu.svg";

const SERVICES_ITEMS = [
  {
    key: "1",
    label: (
      <a href="/services" className={styles.dropdownItem}>
        All Services & Samples
      </a>
    ),
  },
  {
    key: "2",
    label: (
      <a href="#transcription" className={styles.dropdownItem}>
        Music Transcription
      </a>
    ),
  },
  {
    key: "3",
    label: (
      <a href="#arrangement" className={styles.dropdownItem}>
        Music Arrangement
      </a>
    ),
  },
  {
    key: "4",
    label: (
      <a href="#composition" className={styles.dropdownItem}>
        Original Composition
      </a>
    ),
  },
  {
    key: "5",
    label: (
      <a href="#editing" className={styles.dropdownItem}>
        Sheet Music Editing
      </a>
    ),
  },
];

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Chỉ đổi style khi đã lướt > 20px; KHÔNG ẩn header khi cuộn xuống
  useEffect(() => {
    const onScroll = () =>
      setIsScrolled(
        (window.pageYOffset || document.documentElement.scrollTop) > 20
      );
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Khoá cuộn nền khi mở menu mobile + đóng bằng phím Esc
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    const onKey = (e) =>
      e.key === "Escape" ? setIsMobileMenuOpen(false) : null;
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(
    () => setIsMobileMenuOpen((v) => !v),
    []
  );
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  return (
    <header
      className={classNames(styles.header, { [styles.scrolled]: isScrolled })}
    >
      <div
        className={classNames(styles.container, styles.authAlign)}
        style={{ marginTop: "1rem" }}
      >
        <div className="d-flex gap-4 align-items-center">
          <a
            href="/login"
            className={classNames(styles.navLink, styles.authLink)}
          >
            Login
          </a>
          <a
            href="/sign-up"
            className={classNames(styles.navLink, styles.authSignup)}
          >
            Sign up
          </a>
        </div>
      </div>
      <Container fluid className={styles.container}>
        <Navbar expand="lg" className={styles.navbar}>
          {/* Logo */}
          <Navbar.Brand href="/" className={styles.brand}>
            <img
              src={logo}
              alt="My Sheet Music Transcriptions"
              className={styles.logo}
            />
          </Navbar.Brand>

          {/* Desktop Navigation */}
          <div className={styles.desktopNav}>
            <Nav className={styles.navLinks}>
              <Nav.Link href="/" className={styles.navLink}>
                Home
              </Nav.Link>
              <Nav.Link href="/transcription" className={styles.navLink}>
                Audio → Sheet Music
              </Nav.Link>

              <Dropdown
                menu={{ items: SERVICES_ITEMS }}
                placement="bottomCenter"
                trigger={["hover"]}
                overlayClassName={styles.dropdown}
              >
                <Nav.Link className={styles.navLink}>
                  Services & Samples
                </Nav.Link>
              </Dropdown>

              <Nav.Link href="/pricing" className={styles.navLink}>
                Pricing
              </Nav.Link>
              <Nav.Link href="/reviews" className={styles.navLink}>
                Reviews
              </Nav.Link>
              <Nav.Link href="/about" className={styles.navLink}>
                About us
              </Nav.Link>
              <Nav.Link href="/contact" className={styles.navLink}>
                Contact
              </Nav.Link>
            </Nav>

            {/* CTA */}
            <div className={styles.ctaContainer}>
              <a href="/request" className={styles.ctaButton}>
                REQUEST YOUR SHEET MUSIC
              </a>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={styles.mobileToggle}
            onClick={toggleMobileMenu}
            aria-label={
              isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"
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
                href="/"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Home
              </Nav.Link>
              <Nav.Link
                href="/audio-sheet-music"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Audio → Sheet Music
              </Nav.Link>

              <div className={styles.mobileServicesGroup}>
                <span className={styles.mobileServicesTitle}>
                  Services & Samples
                </span>
                <div className={styles.mobileServicesItems}>
                  <Nav.Link
                    href="/services"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    All Services & Samples
                  </Nav.Link>
                  <Nav.Link
                    href="#transcription"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    Music Transcription
                  </Nav.Link>
                  <Nav.Link
                    href="#arrangement"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    Music Arrangement
                  </Nav.Link>
                  <Nav.Link
                    href="#composition"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    Original Composition
                  </Nav.Link>
                  <Nav.Link
                    href="#editing"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    Sheet Music Editing
                  </Nav.Link>
                </div>
              </div>

              <Nav.Link
                href="/pricing"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Pricing
              </Nav.Link>
              <Nav.Link
                href="/reviews"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Reviews
              </Nav.Link>
              <Nav.Link
                href="/about"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                About us
              </Nav.Link>
              <Nav.Link
                href="/contact"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Contact
              </Nav.Link>
            </Nav>

            {/* Mobile CTA */}
            <div className={styles.mobileCta}>
              <a
                href="/request"
                className={styles.mobileCtaButton}
                onClick={closeMobileMenu}
              >
                REQUEST YOUR SHEET MUSIC
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
        )}
      </Container>
    </header>
  );
}

export default memo(Header);
