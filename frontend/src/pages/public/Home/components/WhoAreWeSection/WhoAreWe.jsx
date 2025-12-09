import { memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import classNames from 'classnames';
import styles from './WhoAreWe.module.css';

// import custom hook
import { useIntersection } from '../../../../../hooks/Animations/useIntersection';

import officeImage from '../../../../../assets/images/HomePage/My-Sheet-Music-Transcriptions-Office-Customer-Service-14.jpg';

const OBSERVER_OPTS = { threshold: 0.2, rootMargin: '0px 0px -50px 0px' };

function WhoAreWe() {
  const { ref: sectionRef, isVisible } = useIntersection(OBSERVER_OPTS);

  const withVisible = base => classNames(base, { [styles.visible]: isVisible });

  return (
    <section className={styles.whoAreWeSection} ref={sectionRef}>
      <Container>
        {/* Section Title */}
        <div className={withVisible(styles.sectionHeader)}>
          <h2 className={styles.sectionTitle}>Who are we?</h2>
          <div className={styles.titleUnderline} />
        </div>

        {/* Main Content */}
        <Row className={styles.contentRow}>
          {/* Left: Image */}
          <Col lg={6} md={6} sm={12} className={styles.imageCol}>
            <div className={withVisible(styles.imageWrapper)}>
              <img
                src={officeImage}
                alt="Professional transcriber working in office with headphones and computer"
                className={styles.officeImage}
                loading="lazy"
              />
            </div>
          </Col>

          {/* Right: Text */}
          <Col lg={6} md={6} sm={12} className={styles.textCol}>
            <div className={withVisible(styles.textContent)}>
              <p className={styles.paragraph}>
                <strong>MuTraPro</strong> is an integrated platform that provides 
                on-demand music transcription, arrangement, and production services 
                efficiently and seamlessly. Our system connects customers with 
                professional specialists to deliver high-quality musical outputs.
              </p>

              <p className={styles.paragraph}>
                Why MuTraPro? We optimize the music production workflow by 
                facilitating transparent interaction, progress monitoring, and 
                ensuring high-quality service delivery from request to final product.
              </p>

              <p className={styles.paragraph}>
                How does it work? Our platform manages the entire process—from 
                receiving your request, assigning tasks to Transcription Specialists, 
                Arrangement Specialists, and Artists, to delivering the final product. 
                We also integrate studio session booking for professional recordings.
              </p>

              <p className={styles.paragraph}>
                Our system uses{' '}
                <strong>AI-assisted transcription combined with expert review</strong> 
                to ensure accuracy. We provide{' '}
                <strong>
                  detailed musical notation, custom arrangements, and professional 
                  recordings—all managed through our streamlined platform
                </strong>
                .
              </p>
            </div>
          </Col>
        </Row>

        {/* CTA */}
        <div className={withVisible(styles.ctaSection)}>
          <a href="/about" className={styles.readMoreBtn}>
            READ MORE ABOUT US
          </a>
        </div>
      </Container>
    </section>
  );
}

export default memo(WhoAreWe);
