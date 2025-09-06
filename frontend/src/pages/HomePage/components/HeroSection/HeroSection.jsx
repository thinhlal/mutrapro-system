import { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./HeroSection.module.css";

// Import all background images
import heroImg1 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-1-copia.webp";
import heroImg2 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-2.webp";
import heroImg3 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-3.webp";
import heroImg4 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-4.webp";
import heroImg5 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-5.webp";
import heroImg6 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-6.webp";

const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Array of background images
  const backgroundImages = [
    heroImg1,
    heroImg2,
    heroImg3,
    heroImg4,
    heroImg5,
    heroImg6,
  ];

  // Auto-slide background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prevIndex) => (prevIndex + 1) % backgroundImages.length
      );
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={styles.heroSection}>
      {/* Background Images Slideshow */}
      <div className={styles.backgroundSlideshow}>
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={`${styles.backgroundImage} ${
              index === currentImageIndex ? styles.active : ""
            }`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
        <div className={styles.backgroundOverlay} />
      </div>

      <Container fluid className={styles.heroContainer}>
        <Row className={styles.heroRow}>
          {/* Left Content */}
          <Col lg={6} md={12} className={styles.leftContent}>
            <div
              className={`${styles.contentWrapper} ${
                isVisible ? styles.visible : ""
              }`}
            >
              {/* Logo */}
              <div className={styles.logoSection}>
                <h1 className={styles.logoText}>
                  <span className={styles.logoMy}>my</span>
                  <span className={styles.logoMain}>sheet music</span>
                  <br />
                  <span className={styles.logoSub}>transcriptions</span>
                </h1>
              </div>

              {/* Main Heading */}
              <div className={styles.mainHeading}>
                <h2 className={styles.heroTitle}>
                  Your #1 sheet music transcription service online
                </h2>
              </div>

              {/* Description */}
              <div className={styles.description}>
                <p className={styles.heroDescription}>
                  Get accurate and high-quality sheet music to learn a song,
                  perform, register a composition, educate, or for any music
                  tech application.
                </p>
                <p className={styles.heroSubDescription}>
                  <strong>
                    Reliable digital notation services by professional
                    transcribers and music editors.
                  </strong>
                </p>
              </div>

              {/* CTA Button */}
              <div className={styles.ctaSection}>
                <a href="/services" className={styles.learnMoreBtn}>
                  LEARN MORE
                </a>
              </div>
            </div>
          </Col>

          {/* Right Content - Image Area */}
          <Col lg={6} md={12} className={styles.rightContent}>
            <div
              className={`${styles.imageWrapper} ${
                isVisible ? styles.visible : ""
              }`}
            >
              {/* Google Reviews Card */}
              <div className={styles.reviewsCard}>
                <div className={styles.googleIcon}>
                  <span className={styles.gLetter}>G</span>
                </div>
                <div className={styles.reviewsContent}>
                  <div className={styles.rating}>5.0 on Google Reviews</div>
                  <div className={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={styles.star}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div className={styles.reviewCount}>791 reviews</div>
                  <a href="/reviews" className={styles.seeMoreLink}>
                    SEE MORE →
                  </a>
                </div>
              </div>

              {/* Main Image Content */}
              <div className={styles.mainImageContent}>
                {/* This will be overlaid on the background slideshow */}
              </div>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Slideshow Indicators */}
      <div className={styles.slideshowIndicators}>
        {backgroundImages.map((_, index) => (
          <button
            key={index}
            className={`${styles.indicator} ${
              index === currentImageIndex ? styles.active : ""
            }`}
            onClick={() => setCurrentImageIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
