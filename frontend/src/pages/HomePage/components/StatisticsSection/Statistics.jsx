import { useState, useEffect, useRef } from "react";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./Statistics.module.css";
import backgroundImage from "../../../../assets/images/HomePage/7-2-1-1.jpg";

const Statistics = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [countedNumbers, setCountedNumbers] = useState({
    transcriptions: 0,
    customers: 0,
  });
  const sectionRef = useRef(null);

  // Target numbers
  const targetNumbers = {
    transcriptions: 50629,
    customers: 22897,
  };

  // Intersection Observer for animation trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.3,
        rootMargin: "0px 0px -100px 0px",
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

  // Counting animation
  useEffect(() => {
    if (!isVisible) return;

    const duration = 2500; // 2.5 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    const transcriptionsIncrement = targetNumbers.transcriptions / steps;
    const customersIncrement = targetNumbers.customers / steps;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;

      if (currentStep <= steps) {
        setCountedNumbers({
          transcriptions: Math.min(
            Math.floor(transcriptionsIncrement * currentStep),
            targetNumbers.transcriptions
          ),
          customers: Math.min(
            Math.floor(customersIncrement * currentStep),
            targetNumbers.customers
          ),
        });
      } else {
        clearInterval(timer);
        // Ensure we end with exact target numbers
        setCountedNumbers({
          transcriptions: targetNumbers.transcriptions,
          customers: targetNumbers.customers,
        });
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible]);

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const statisticsCards = [
    {
      id: "google",
      icon: "G",
      iconColor: "#4285f4",
      title: "5.0 on Google Reviews",
      rating: 5,
      reviews: "791 reviews",
      linkText: "SEE ON GOOGLE",
      linkColor: "#4285f4",
    },
    {
      id: "location",
      icon: "🌍",
      iconColor: "#00d4aa",
      title: "Based in the US, UK & Europe",
      number: countedNumbers.customers,
      subtitle: "happy customers",
      description: "until September 2025",
    },
    {
      id: "facebook",
      icon: "f",
      iconColor: "#1877f2",
      title: "5.0 on Facebook Reviews",
      rating: 5,
      reviews: "306 reviews",
      linkText: "SEE ON FACEBOOK",
      linkColor: "#1877f2",
    },
  ];

  return (
    <section className={styles.statisticsSection} ref={sectionRef}>
      {/* Background Image */}
      <div
        className={styles.backgroundImage}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className={styles.backgroundOverlay} />

      <Container>
        {/* Main Content */}
        <div className={styles.contentWrapper}>
          {/* Header */}
          <div
            className={`${styles.header} ${isVisible ? styles.visible : ""}`}
          >
            <h2 className={styles.mainTitle}>
              The highest-rated online sheet music transcribers
            </h2>

            {/* Main Statistics */}
            <div className={styles.mainStats}>
              <div className={styles.bigNumber}>
                {formatNumber(countedNumbers.transcriptions)}
              </div>
              <div className={styles.bigNumberSubtitle}>
                transcriptions delivered since 2011
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <Row className={styles.cardsRow}>
            {statisticsCards.map((card, index) => (
              <Col lg={4} md={4} sm={12} key={card.id}>
                <div
                  className={`${styles.statCard} ${
                    isVisible ? styles.visible : ""
                  }`}
                  style={{ animationDelay: `${0.2 + index * 0.2}s` }}
                >
                  {/* Card Icon */}
                  <div className={styles.cardIcon}>
                    {card.icon === "G" || card.icon === "f" ? (
                      <span
                        className={styles.iconText}
                        style={{ color: card.iconColor }}
                      >
                        {card.icon}
                      </span>
                    ) : (
                      <span className={styles.iconEmoji}>{card.icon}</span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{card.title}</h3>

                    {/* Rating Stars */}
                    {card.rating && (
                      <div className={styles.rating}>
                        {[...Array(card.rating)].map((_, i) => (
                          <span key={i} className={styles.star}>
                            ★
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Big Number for Location Card */}
                    {card.number !== undefined && (
                      <div className={styles.cardNumber}>
                        {formatNumber(card.number)}
                      </div>
                    )}

                    {/* Card Description */}
                    {card.reviews && (
                      <div className={styles.cardReviews}>{card.reviews}</div>
                    )}

                    {card.subtitle && (
                      <div className={styles.cardSubtitle}>{card.subtitle}</div>
                    )}

                    {card.description && (
                      <div className={styles.cardDescription}>
                        {card.description}
                      </div>
                    )}

                    {/* Card Link */}
                    {card.linkText && (
                      <a
                        href="#"
                        className={styles.cardLink}
                        style={{ color: card.linkColor }}
                      >
                        {card.linkText} →
                      </a>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Container>
    </section>
  );
};

export default Statistics;
