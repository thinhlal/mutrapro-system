import { useState, useEffect, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./WhoAreWe.module.css";
import officeImage from "../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-Office-Customer-Service-14.jpg";

const WhoAreWe = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer for animation trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section className={styles.whoAreWeSection} ref={sectionRef}>
      <Container>
        {/* Section Title - Centered above everything */}
        <div
          className={`${styles.sectionHeader} ${
            isVisible ? styles.visible : ""
          }`}
        >
          <h2 className={styles.sectionTitle}>Who are we?</h2>
          <div className={styles.titleUnderline}></div>
        </div>

        {/* Main Content Row */}
        <Row className={styles.contentRow}>
          {/* Left Column - Image */}
          <Col lg={6} md={6} sm={12} className={styles.imageCol}>
            <div
              className={`${styles.imageWrapper} ${
                isVisible ? styles.visible : ""
              }`}
            >
              <img
                src={officeImage}
                alt="Professional transcriber working in office with headphones and computer"
                className={styles.officeImage}
              />
            </div>
          </Col>

          {/* Right Column - Text Content */}
          <Col lg={6} md={6} sm={12} className={styles.textCol}>
            <div
              className={`${styles.textContent} ${
                isVisible ? styles.visible : ""
              }`}
            >
              <p className={styles.paragraph}>
                We are{" "}
                <strong>
                  a team of 40+ professional transcribers, arrangers, music
                  editors, musicologists, and engineers
                </strong>{" "}
                with proven experience in all types of musical transcriptions,
                arrangements, digitizations, and their music applications.
              </p>

              <p className={styles.paragraph}>
                Why do we do it? To create opportunities and facilitate the
                preservation, usefulness, and accessibility of musical
                brilliance.
              </p>

              <p className={styles.paragraph}>
                How do we like to do it? Bridging the gap between audio and
                music notation through a combination of expertise, experience,
                optimization, and commitment to quality!
              </p>

              <p className={styles.paragraph}>
                We transcribe{" "}
                <strong>each note by hand and by ear one by one</strong>. We
                don't use any kind of automatic transcription software. It's a
                slow process but it gives{" "}
                <strong>
                  great results, reliable notation, and tailored solutions
                </strong>
                .
              </p>
            </div>
          </Col>
        </Row>

        {/* CTA Button - Centered below everything */}
        <div
          className={`${styles.ctaSection} ${isVisible ? styles.visible : ""}`}
        >
          <a href="/about" className={styles.readMoreBtn}>
            READ MORE ABOUT US
          </a>
        </div>
      </Container>
    </section>
  );
};

export default WhoAreWe;
