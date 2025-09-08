import { useState, useEffect, useRef, memo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import classNames from "classnames";
import styles from "./HowItWorks.module.css";

import stepsImage from "../../../../assets/images/HomePage/3-steps.jpg";

// Constants
const OBSERVER_OPTS = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
const STEPS = [
  {
    id: 1,
    title: "Send us audio",
    description:
      "We will promptly send you a quote and an estimated delivery time",
  },
  {
    id: 2,
    title: "We transcribe it for you",
    description:
      "Our team of transcribers will prepare the sheet music as per your requirements",
  },
  {
    id: 3,
    title: "Print & Play",
    description:
      "You will be able to use and play your sheet music in PDF and other formats",
  },
];

function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer for animation trigger
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, OBSERVER_OPTS);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const withVisible = (base) =>
    classNames(base, { [styles.visible]: isVisible });

  return (
    <section className={styles.howItWorksSection} ref={sectionRef}>
      <Container>
        {/* Section Header */}
        <div className={withVisible(styles.sectionHeader)}>
          <h2 className={styles.sectionTitle}>How does it work?</h2>
          <div className={styles.titleUnderline} />
        </div>

        {/* Main Content */}
        <div className={styles.contentWrapper}>
          <Row className={styles.mainRow}>
            {/* Process Illustration */}
            <Col lg={12}>
              <div className={withVisible(styles.processIllustration)}>
                <img
                  src={stepsImage}
                  alt="3 steps: Send Audio → Transcribe → Print & Play"
                  className={styles.processImage}
                  loading="lazy"
                />
              </div>
            </Col>
          </Row>

          {/* Steps Text Below Image */}
          <Row className={`${styles.stepsRow} justify-content-center`}>
            {STEPS.map(({ id, title, description }) => (
              <Col key={id} lg={3} md={3} sm={12}>
                <div className={withVisible(styles.stepText)}>
                  <div className={styles.stepNumber}>{id}.</div>
                  <h3 className={styles.stepTitle}>{title}</h3>
                  <p className={styles.stepDescription}>{description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Container>
    </section>
  );
}

export default memo(HowItWorks);
