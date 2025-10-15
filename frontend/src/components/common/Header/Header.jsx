// src/components/common/Header/Header.jsx
import { useState, useEffect, useCallback, memo } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Dropdown } from "antd";
import { MenuOutlined, CloseOutlined, DownOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import logo from "../../../assets/images/Logo/Logotip-Positiu.svg";

// ---- Helpers ----
const SECTION_KEYS = new Map([
  ["/", "home"],
  ["/transcription", "audio"],
  ["/soundtosheet", "services"],
  ["/services", "services"],
  ["/pricing", "pricing"],
  ["/reviews", "reviews"],
  ["/about", "about"],
  ["/contact", "contact"],
]);

const HASH_TO_SERVICES = new Set([
  "#transcription",
  "#arrangement",
  "#composition",
  "#editing",
]);

const getActiveKey = () => {
  const { pathname, hash } = window.location;
  if (HASH_TO_SERVICES.has(hash)) return "services";
  // match longest prefix
  let winner = "home";
  let bestLen = -1;
  for (const [path, key] of SECTION_KEYS.entries()) {
    if (pathname.startsWith(path) && path.length > bestLen) {
      bestLen = path.length;
      winner = key;
    }
  }
  return winner;
};

// ---- Data ----
const SERVICES_ITEMS = [
  {
    key: "services-all",
    label: (
      <Link to="/services" className={styles.dropdownItem}>
        All Services &amp; Samples
      </Link>
    ),
  },
  {
    key: "services-trans",
    label: (
      <Link to="/soundtosheet" className={styles.dropdownItem}>
        From Sound to Sheet
      </Link>
    ),
  },
  {
    key: "services-arr",
    // vẫn để anchor về #arrangement trong trang services, tuỳ bạn có muốn tách route riêng không
    label: (
      <a href="#arrangement" className={styles.dropdownItem}>
        Music Arrangement
      </a>
    ),
  },
  {
    key: "services-comp",
    label: (
      <a href="#composition" className={styles.dropdownItem}>
        Original Composition
      </a>
    ),
  },
  {
    key: "services-edit",
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
  const [activeKey, setActiveKey] = useState(getActiveKey());
  const [servicesOpen, setServicesOpen] = useState(false); // rotate caret on desktop

  // Scroll-state (đổi style khi >20px)
  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(y > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active-state theo URL/hash (back/forward/hashchange)
  useEffect(() => {
    const updateActive = () => setActiveKey(getActiveKey());
    window.addEventListener("popstate", updateActive);
    window.addEventListener("hashchange", updateActive);
    // cũng cập nhật khi mount
    updateActive();
    return () => {
      window.removeEventListener("popstate", updateActive);
      window.removeEventListener("hashchange", updateActive);
    };
  }, []);

  // Khoá cuộn nền khi mở menu mobile + đóng bằng phím Esc
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setIsMobileMenuOpen(false);
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
  const onDesktopDropdownOpenChange = useCallback((open) => {
    setServicesOpen(open);
  }, []);

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
    <header
      className={classNames(styles.header, {
        [styles.scrolled]: isScrolled,
      })}
    >
      {/* Auth bar */}
      <div
        className={classNames(styles.container, styles.authAlign)}
        style={{ marginTop: "1rem" }}
      >
        <div className="d-flex gap-4 align-items-center">
          <Link
            to="/login"
            className={classNames(styles.navLink, styles.authLink)}
          >
            Login
          </Link>
          <Link
            to="/sign-up"
            className={classNames(styles.navLink, styles.authSignup)}
          >
            Sign up
          </Link>
        </div>
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
              {navLink("/", "home", "Home")}
              {navLink("/transcription", "audio", "Audio → Sheet Music")}

              <Dropdown
                menu={{ items: SERVICES_ITEMS }}
                placement="bottomCenter"
                trigger={["hover"]}
                overlayClassName={styles.dropdown}
                onOpenChange={onDesktopDropdownOpenChange}
              >
                <Nav.Link
                  className={classNames(styles.navLink, {
                    [styles.active]: activeKey === "services",
                  })}
                >
                  <span className={styles.linkInner}>
                    Services &amp; Samples
                    <DownOutlined
                      className={classNames(styles.caret, {
                        [styles.caretOpen]: servicesOpen,
                      })}
                    />
                  </span>
                </Nav.Link>
              </Dropdown>

              {navLink("/pricing", "pricing", "Pricing")}
              {navLink("/reviews", "reviews", "Reviews")}
              {navLink("/about", "about", "About us")}
              {navLink("/contact", "contact", "Contact")}
            </Nav>

            {/* CTA */}
            <div className={styles.ctaContainer}>
              <Link to="/soundtosheet" className={styles.ctaButton}>
                REQUEST YOUR SHEET MUSIC
              </Link>
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
                as={Link}
                to="/"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === "home",
                })}
                onClick={closeMobileMenu}
              >
                Home
              </Nav.Link>

              <Nav.Link
                as={Link}
                to="/transcription"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === "audio",
                })}
                onClick={closeMobileMenu}
              >
                Audio → Sheet Music
              </Nav.Link>

              <div className={styles.mobileServicesGroup}>
                <span
                  className={classNames(styles.mobileServicesTitle, {
                    [styles.active]: activeKey === "services",
                  })}
                >
                  Services &amp; Samples
                </span>
                <div className={styles.mobileServicesItems}>
                  <Nav.Link
                    as={Link}
                    to="/services"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    All Services &amp; Samples
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to="/soundtosheet"
                    className={styles.mobileSubLink}
                    onClick={closeMobileMenu}
                  >
                    Music Transcription
                  </Nav.Link>
                  {/* Giữ nguyên các anchor dưới đây hoặc chuyển thành route riêng tùy ý bạn */}
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
                as={Link}
                to="/pricing"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === "pricing",
                })}
                onClick={closeMobileMenu}
              >
                Pricing
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/reviews"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === "reviews",
                })}
                onClick={closeMobileMenu}
              >
                Reviews
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/about"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === "about",
                })}
                onClick={closeMobileMenu}
              >
                About us
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/contact"
                className={classNames(styles.mobileNavLink, {
                  [styles.active]: activeKey === "contact",
                })}
                onClick={closeMobileMenu}
              >
                Contact
              </Nav.Link>
            </Nav>

            {/* Mobile CTA */}
            <div className={styles.mobileCta}>
              <Link
                to="/request"
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
    </header>
  );
}

export default memo(Header);
