import { useState, useEffect, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./FlexiblePricing.module.css";
import pianoIcon from "../../../../assets/icons/Pricing/Grand-Piano-2-2-1.png";
import hornsIcon from "../../../../assets/icons/Pricing/Horns2-1-2-1.png";
import quartetIcon from "../../../../assets/icons/Pricing/Cuartet2-1-2-1.png";

const FlexiblePricing = () => {
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
    <section className={styles.flexiblePricingSection} ref={sectionRef}>
      <Container>
        {/* Section Header */}
        <div
          className={`${styles.sectionHeader} ${
            isVisible ? styles.visible : ""
          }`}
        >
          <h2 className={styles.sectionTitle}>Flexible pricing</h2>
          <div className={styles.titleUnderline}></div>
        </div>

        {/* Description Text */}
        <div
          className={`${styles.descriptionSection} ${
            isVisible ? styles.visible : ""
          }`}
        >
          <p className={styles.descriptionText}>
            <strong>There are pricing options for every budget.</strong> The
            more instruments and the longer or more complex a piece is, the
            longer it takes to transcribe. The simpler and more schematic the
            required notation can be, the less time it takes.
          </p>
          <p className={styles.descriptionText}>
            We are a team of professional musicians, performers, editors, and
            musicologists with extensive experience.{" "}
            <strong>
              Your score will be 100% personalized, tailored to your needs, and
              crafted note by note manually by our professional transcribers.{" "}
            </strong>{" "}
            The process will be coordinated by our customer service specialists,
            who will keep you informed at all times.
          </p>
          <p className={styles.descriptionText}>
            Revisions and transpositions are included in the price, as well as
            all the digital formats you may need.{" "}
          </p>
          <p className={styles.descriptionText}>
            Below you will find a price guide, but please contact us for
            customized proposals:
          </p>
        </div>

        {/* Pricing Cards */}
        <Row className={`${styles.cardsRow} gx-0`}>
          {/* Card 1: Piano */}
          <Col lg={4} md={6} sm={12} className={styles.cardCol}>
            <div
              className={`${styles.pricingCard} ${
                isVisible ? styles.visible : ""
              }`}
              style={{ animationDelay: "0.2s" }}
            >
              <div className={styles.cardIcon}>
                <img
                  src={pianoIcon}
                  alt="Piano icon"
                  className={styles.iconImage}
                />
              </div>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Piano</h3>
              </div>
              <div className={styles.priceSection}>
                <span className={styles.pricePrefix}>from</span>
                <span className={styles.priceAmount}>$19 USD</span>
                <span className={styles.priceSuffix}>per minute of music</span>
              </div>
              <div className={styles.pricingFactors}>
                <ul className={styles.factorsList}>
                  <li>Music length</li>
                  <li>Musical complexity and density</li>
                  <li>
                    Difficulty of listening, notation, layers, and polyphonies
                  </li>
                </ul>
              </div>
              <div className={styles.minimumCharge}>
                <em>*minimum charge of $49 USD</em>
              </div>
            </div>
          </Col>

          {/* Card 2: Bands/Ensembles */}
          <Col lg={4} md={6} sm={12} className={styles.cardCol}>
            <div
              className={`${styles.pricingCard} ${
                isVisible ? styles.visible : ""
              }`}
              style={{ animationDelay: "0.4s" }}
            >
              <div className={styles.cardIcon}>
                <img
                  src={quartetIcon}
                  alt="Bands/Ensembles icon"
                  className={styles.iconImage}
                />
              </div>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Bands/Ensembles</h3>
              </div>
              <div className={styles.priceSection}>
                <span className={styles.pricePrefix}>from</span>
                <span className={styles.priceAmount}>$30 USD</span>
                <span className={styles.priceSuffix}>per minute of music</span>
              </div>
              <div className={styles.pricingFactors}>
                <ul className={styles.factorsList}>
                  <li>Music length</li>
                  <li>Notation complexity and difficulty of listening</li>
                  <li>Part extraction</li>
                </ul>
              </div>
            </div>
          </Col>

          {/* Card 3: Melodic Instrument */}
          <Col lg={4} md={6} sm={12} className={styles.cardCol}>
            <div
              className={`${styles.pricingCard} ${
                isVisible ? styles.visible : ""
              }`}
              style={{ animationDelay: "0.6s" }}
            >
              <div className={styles.cardIcon}>
                <img
                  src={hornsIcon}
                  alt="Melodic Instrument icon"
                  className={styles.iconImage}
                />
              </div>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Melodic Instrument</h3>
              </div>
              <div className={styles.priceSection}>
                <span className={styles.pricePrefix}>from</span>
                <span className={styles.priceAmount}>$15 USD</span>
                <span className={styles.priceSuffix}>per minute of music</span>
              </div>
              <div className={styles.pricingFactors}>
                <ul className={styles.factorsList}>
                  <li>Music length</li>
                  <li>Musical complexity and density</li>
                  <li>Idiomatic difficulty relative to each instrument</li>
                </ul>
              </div>
              <div className={styles.minimumCharge}>
                <em>*minimum charge of $49 USD</em>
              </div>
            </div>
          </Col>
        </Row>

        {/* CTA Button */}
        <div
          className={`${styles.ctaSection} ${isVisible ? styles.visible : ""}`}
        >
          <a href="/pricing" className={styles.pricingGuideBtn}>
            SEE THE FULL PRICING GUIDE
          </a>
        </div>
      </Container>
    </section>
  );
};

export default FlexiblePricing;
