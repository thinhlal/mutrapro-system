import { useState, useEffect, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./WhatsIncluded.module.css";
import pianoImage from "../../../../assets/images/HomePage/Piano8-1.jpg";
import fileIconsImage from "../../../../assets/icons/HomePage/icones-2.png";
import fastDeliveryIcon from "../../../../assets/icons/HomePage/fast-delivery-new-1.png";
import accuracyIcon from "../../../../assets/icons/HomePage/accuracy-3-1-1.png";

const WhatsIncluded = () => {
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
    <section className={styles.whatsIncludedSection} ref={sectionRef}>
      {/* Background Image */}
      <div className={styles.backgroundImage}>
        <img
          src={pianoImage}
          alt="MIDI keyboard background"
          className={styles.pianoBackground}
        />
        <div className={styles.overlay}></div>
      </div>

      <Container className={styles.container}>
        {/* Section Title */}
        <div
          className={`${styles.sectionHeader} ${
            isVisible ? styles.visible : ""
          }`}
        >
          <h2 className={styles.sectionTitle}>What's included?</h2>
        </div>

        {/* Cards Row */}
        <Row className={styles.cardsRow}>
          {/* Card 1: Fast turnaround time */}
          <Col lg={4} md={6} sm={12} className={styles.cardCol}>
            <div
              className={`${styles.card} ${isVisible ? styles.visible : ""}`}
              style={{ animationDelay: "0.2s" }}
            >
              <div className={styles.cardIcon}>
                <img
                  src={fastDeliveryIcon}
                  alt="Fast delivery icon"
                  className={styles.iconImage}
                />
              </div>
              <h3 className={styles.cardTitle}>Fast turnaround time</h3>
              <p className={styles.cardDescription}>
                1-2 days standard delivery time. Rush orders available
              </p>
            </div>
          </Col>

          {/* Card 2: All sheet music formats */}
          <Col lg={4} md={6} sm={12} className={styles.cardCol}>
            <div
              className={`${styles.card} ${isVisible ? styles.visible : ""}`}
              style={{ animationDelay: "0.4s" }}
            >
              <div className={styles.cardIcon}>
                <img
                  src={fileIconsImage}
                  alt="File format icons"
                  className={styles.fileIconsImage}
                />
              </div>
              <h3 className={styles.cardTitle}>All sheet music formats</h3>
              <p className={styles.cardDescription}>
                Get the transcription in digital format: PDF, midi, SIB, MUSX,
                XML, MSCZ, GP
              </p>
            </div>
          </Col>

          {/* Card 3: 100% accuracy & Customer care */}
          <Col lg={4} md={6} sm={12} className={styles.cardCol}>
            <div
              className={`${styles.card} ${isVisible ? styles.visible : ""}`}
              style={{ animationDelay: "0.6s" }}
            >
              <div className={styles.cardIcon}>
                <img
                  src={accuracyIcon}
                  alt="Accuracy target icon"
                  className={styles.iconImage}
                />
              </div>
              <h3 className={styles.cardTitle}>
                100% accuracy & Customer care
              </h3>
              <p className={styles.cardDescription}>
                Note-for-note transcriptions and full customer support along the
                process
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default WhatsIncluded;
