import { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import classNames from "classnames";
import styles from "./HeroSection.module.css";

// ===== Constants & assets =====
import heroImg1 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-1-copia.webp";
import heroImg2 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-2.webp";
import heroImg3 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-3.webp";
import heroImg4 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-4.webp";
import heroImg5 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-5.webp";
import heroImg6 from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-CS-6.webp";

const IMAGES = [heroImg1, heroImg2, heroImg3, heroImg4, heroImg5, heroImg6];
const SLIDE_INTERVAL_MS = 4000;
const ENTRANCE_DELAY_MS = 300;
const STAR_COUNT = 5;
const GOOGLE_RATING = "5.0";
const GOOGLE_REVIEWS_COUNT = 791;

function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Auto-slide background images
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Trigger entrance animation once
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), ENTRANCE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className={styles.heroSection}>
      {/* Background Images Slideshow */}
      <div className={styles.backgroundSlideshow} aria-hidden="true">
        {IMAGES.map((image, index) => (
          <div
            key={index}
            className={classNames(styles.backgroundImage, {
              [styles.active]: index === currentImageIndex,
            })}
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
              className={classNames(styles.contentWrapper, {
                [styles.visible]: isVisible,
              })}
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
              className={classNames(styles.imageWrapper, {
                [styles.visible]: isVisible,
              })}
            >
              {/* Google Reviews Card */}
              <div className={styles.reviewsCard} aria-label="Google Reviews">
                <div className={styles.googleIcon}>
                  <span className={styles.gLetter}>G</span>
                </div>
                <div className={styles.reviewsContent}>
                  <div className={styles.rating}>
                    {GOOGLE_RATING} on Google Reviews
                  </div>
                  <div className={styles.stars} aria-hidden="true">
                    {Array.from({ length: STAR_COUNT }).map((_, i) => (
                      <span key={i} className={styles.star}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div className={styles.reviewCount}>
                    {GOOGLE_REVIEWS_COUNT} reviews
                  </div>
                  <a href="/reviews" className={styles.seeMoreLink}>
                    SEE MORE →
                  </a>
                </div>
              </div>

              {/* Main Image Content (overlay on slideshow) */}
              <div className={styles.mainImageContent} />
            </div>
          </Col>
        </Row>
      </Container>

      {/* Slideshow Indicators */}
      <div className={styles.slideshowIndicators}>
        {IMAGES.map((_, index) => (
          <button
            key={index}
            type="button"
            className={classNames(styles.indicator, {
              [styles.active]: index === currentImageIndex,
            })}
            onClick={() => setCurrentImageIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-pressed={index === currentImageIndex}
          />
        ))}
      </div>
    </section>
  );
}

export default HeroSection;
