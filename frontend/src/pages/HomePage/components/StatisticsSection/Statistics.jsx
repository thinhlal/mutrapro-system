import { useMemo, memo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import classNames from "classnames";
import styles from "./Statistics.module.css";

import { useIntersection } from "../../../../hooks/Animations/useIntersection";
import { useCountUp } from "../../../../hooks/Animations/useCountUp";

import backgroundImage from "../../../../assets/images/HomePage/7-2-1-1.jpg";

// ===== Constants =====
const OBSERVER_OPTS = { threshold: 0.3, rootMargin: "0px 0px -100px 0px" };
const TARGET_NUMBERS = { transcriptions: 50629, customers: 22897 };
const COUNT_DURATION_MS = 2500;

function Statistics() {
  const { ref: sectionRef, isVisible } = useIntersection(OBSERVER_OPTS);

  // Counting animation ONLY for transcriptions
  const transcriptionsCount = useCountUp(
    TARGET_NUMBERS.transcriptions,
    COUNT_DURATION_MS,
    isVisible
  );

  const formatNumber = (num) => num.toLocaleString();

  // Cards config
  const statisticsCards = useMemo(
    () => [
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
        number: TARGET_NUMBERS.customers,
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
    ],
    []
  );

  return (
    <section className={styles.statisticsSection} ref={sectionRef}>
      {/* Background */}
      <div
        className={styles.backgroundImage}
        style={{ backgroundImage: `url(${backgroundImage})` }}
        aria-hidden="true"
      />
      <div className={styles.backgroundOverlay} aria-hidden="true" />

      <Container>
        <div className={styles.contentWrapper}>
          {/* Header */}
          <div
            className={classNames(styles.header, {
              [styles.visible]: isVisible,
            })}
          >
            <h2 className={styles.mainTitle}>
              The highest-rated online sheet music transcribers
            </h2>

            {/* Main Statistics */}
            <div className={styles.mainStats}>
              <div className={styles.bigNumber}>
                {formatNumber(transcriptionsCount)}
              </div>
              <div className={styles.bigNumberSubtitle}>
                transcriptions delivered since 2011
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <Row className={styles.cardsRow}>
            {statisticsCards.map((card, index) => (
              <Col key={card.id} lg={4} md={4} sm={12}>
                <div
                  className={classNames(styles.statCard, {
                    [styles.visible]: isVisible,
                  })}
                  style={{ animationDelay: `${0.2 + index * 0.2}s` }}
                >
                  {/* Icon */}
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

                  {/* Content */}
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{card.title}</h3>

                    {card.rating ? (
                      <div
                        className={styles.rating}
                        aria-label={`${card.rating} out of 5 stars`}
                      >
                        {Array.from({ length: card.rating }).map((_, i) => (
                          <span key={i} className={styles.star}>
                            ★
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {card.number !== undefined ? (
                      <div className={styles.cardNumber}>
                        {formatNumber(card.number)}
                      </div>
                    ) : null}

                    {card.reviews ? (
                      <div className={styles.cardReviews}>{card.reviews}</div>
                    ) : null}
                    {card.subtitle ? (
                      <div className={styles.cardSubtitle}>{card.subtitle}</div>
                    ) : null}
                    {card.description ? (
                      <div className={styles.cardDescription}>
                        {card.description}
                      </div>
                    ) : null}

                    {card.linkText ? (
                      <a
                        href="#"
                        className={styles.cardLink}
                        style={{ color: card.linkColor }}
                      >
                        {card.linkText} →
                      </a>
                    ) : null}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Container>
    </section>
  );
}

export default memo(Statistics);
