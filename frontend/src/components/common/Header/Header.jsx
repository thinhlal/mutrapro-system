import { useState, useEffect } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Dropdown } from "antd";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";
import styles from "./Header.module.css";
import logo from "../../../assets/images/Logo/Logotip-Positiu.svg";

function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState("up");
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Enhanced scroll effect with direction detection and sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      // Determine scroll direction
      if (currentScrollTop > lastScrollTop && currentScrollTop > 100) {
        // Scrolling down
        setScrollDirection("down");
      } else {
        // Scrolling up
        setScrollDirection("up");
      }

      // Set scrolled state for styling
      setIsScrolled(currentScrollTop > 20);

      setLastScrollTop(currentScrollTop <= 0 ? 0 : currentScrollTop);
    };

    let ticking = false;
    const optimizedScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", optimizedScroll, { passive: true });
    return () => window.removeEventListener("scroll", optimizedScroll);
  }, [lastScrollTop]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Services dropdown items
  const servicesItems = [
    {
      key: "1",
      label: (
        <a href="#transcription" className={styles.dropdownItem}>
          Music Transcription
        </a>
      ),
    },
    {
      key: "2",
      label: (
        <a href="#arrangement" className={styles.dropdownItem}>
          Music Arrangement
        </a>
      ),
    },
    {
      key: "3",
      label: (
        <a href="#composition" className={styles.dropdownItem}>
          Original Composition
        </a>
      ),
    },
    {
      key: "4",
      label: (
        <a href="#editing" className={styles.dropdownItem}>
          Sheet Music Editing
        </a>
      ),
    },
  ];

  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.scrolled : ""} ${
        scrollDirection === "down" && isScrolled ? styles.hidden : ""
      }`}
    >
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

              <Nav.Link href="/audio-sheet-music" className={styles.navLink}>
                Audio → Sheet Music
              </Nav.Link>

              <Dropdown
                menu={{ items: servicesItems }}
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

            {/* CTA Button */}
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
            aria-label="Toggle mobile menu"
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
          className={`${styles.mobileNav} ${
            isMobileMenuOpen ? styles.mobileNavOpen : ""
          }`}
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

            {/* Mobile CTA Button */}
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

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={closeMobileMenu}></div>
        )}
      </Container>
    </header>
  );
}

export default Header;
