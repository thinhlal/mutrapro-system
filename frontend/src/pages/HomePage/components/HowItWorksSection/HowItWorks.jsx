import { useState, useEffect, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./HowItWorks.module.css";
import stepsImage from "../../../../assets/images/HomePage/3-steps.jpg";

const HowItWorks = () => {
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
        threshold: 0.1,
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

  const steps = [
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

  return (
    <section className={styles.howItWorksSection} ref={sectionRef}>
      <Container>
        {/* Section Header */}
        <div
          className={`${styles.sectionHeader} ${
            isVisible ? styles.visible : ""
          }`}
        >
          <h2 className={styles.sectionTitle}>How does it work?</h2>
          <div className={styles.titleUnderline}></div>
        </div>

        {/* Main Content */}
        <div className={styles.contentWrapper}>
          <Row className={styles.mainRow}>
            {/* Process Illustration */}
            <Col lg={12}>
              <div
                className={`${styles.processIllustration} ${
                  isVisible ? styles.visible : ""
                }`}
              >
                <img
                  src={stepsImage}
                  alt="3 Steps Process - Send Audio, Transcribe, Print & Play"
                  className={styles.processImage}
                />
              </div>
            </Col>
          </Row>

          {/* Steps Text Below Image */}
          <Row className={`${styles.stepsRow} justify-content-center`}>
            {steps.map((step) => (
              <Col lg={3} md={3} sm={12} key={step.id}>
                <div
                  className={`${styles.stepText} ${
                    isVisible ? styles.visible : ""
                  }`}
                >
                  <div className={styles.stepNumber}>{step.id}.</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Container>
    </section>
  );
};

export default HowItWorks;
