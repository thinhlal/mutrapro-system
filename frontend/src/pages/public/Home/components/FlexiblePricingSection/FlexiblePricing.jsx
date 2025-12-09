import { Container, Row, Col } from 'react-bootstrap';
import classNames from 'classnames';
import styles from './FlexiblePricing.module.css';

import { useIntersection } from '../../../../../hooks/Animations/useIntersection';

import pianoIcon from '../../../../../assets/icons/Pricing/Grand-Piano-2-2-1.png';
import hornsIcon from '../../../../../assets/icons/Pricing/Horns2-1-2-1.png';
import quartetIcon from '../../../../../assets/icons/Pricing/Cuartet2-1-2-1.png';

const CARDS = [
  {
    icon: pianoIcon,
    iconAlt: 'Transcription icon',
    title: 'Transcription Service',
    price: 'Custom',
    amount: 'Pricing',
    suffix: 'based on complexity',
    factors: [
      'Audio file length and quality',
      'Musical complexity and density',
      'Number of instruments and layers',
    ],
    minimum: '*AI-assisted transcription with expert review',
    delay: '0.2s',
  },
  {
    icon: quartetIcon,
    iconAlt: 'Arrangement icon',
    title: 'Arrangement Service',
    price: 'Custom',
    amount: 'Pricing',
    suffix: 'based on requirements',
    factors: [
      'Original score complexity',
      'Arrangement style and instrumentation',
      'Customer specifications and revisions',
    ],
    delay: '0.4s',
  },
  {
    icon: hornsIcon,
    iconAlt: 'Recording icon',
    title: 'Recording Service',
    price: 'Studio',
    amount: 'Session',
    suffix: 'booking available',
    factors: [
      'Studio facility and equipment',
      'Session duration and scheduling',
      'Artist assignment and performance',
    ],
    minimum: '*Professional recording with vocal/instrumental artists',
    delay: '0.6s',
  },
];

function FlexiblePricing() {
  const { ref: sectionRef, isVisible } = useIntersection({
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px',
  });

  const withVisible = base => classNames(base, { [styles.visible]: isVisible });

  return (
    <section className={styles.flexiblePricingSection} ref={sectionRef}>
      <Container>
        {/* Section Header */}
        <div className={withVisible(styles.sectionHeader)}>
          <h2 className={styles.sectionTitle}>Flexible pricing</h2>
          <div className={styles.titleUnderline} />
        </div>

        {/* Description Text */}
        <div className={withVisible(styles.descriptionSection)}>
          <p className={styles.descriptionText}>
            <strong>Flexible pricing tailored to your project needs.</strong> Our 
            pricing depends on the complexity of your request, the length of audio, 
            the number of instruments, and the specific services required (transcription, 
            arrangement, or recording).
          </p>
          <p className={styles.descriptionText}>
            MuTraPro connects you with professional Transcription Specialists, 
            Arrangement Specialists, and Artists.{' '}
            <strong>
              Your project will be managed from intake to delivery, with real-time 
              progress tracking and the ability to request revisions.{' '}
            </strong>
            Our Managers coordinate the workflow and ensure quality at every step.
          </p>
          <p className={styles.descriptionText}>
            Revisions and multiple export formats (PDF, MusicXML) are included. 
            Secure online payments and wallet system for convenient transactions.
          </p>
          <p className={styles.descriptionText}>
            Contact us for a customized quote based on your specific requirements:
          </p>
        </div>

        {/* Pricing Cards */}
        <Row className={`${styles.cardsRow} gx-0`}>
          {CARDS.map(
            ({
              icon,
              iconAlt,
              title,
              price,
              amount,
              suffix,
              factors,
              minimum,
              delay,
            }) => (
              <Col key={title} lg={4} md={6} sm={12} className={styles.cardCol}>
                <div
                  className={withVisible(styles.pricingCard)}
                  style={{ animationDelay: delay }}
                >
                  <div className={styles.cardIcon}>
                    <img
                      src={icon}
                      alt={iconAlt}
                      className={styles.iconImage}
                    />
                  </div>

                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{title}</h3>
                  </div>

                  <div className={styles.priceSection}>
                    <span className={styles.pricePrefix}>{price}</span>
                    <span className={styles.priceAmount}>{amount}</span>
                    <span className={styles.priceSuffix}>{suffix}</span>
                  </div>

                  <div className={styles.pricingFactors}>
                    <ul className={styles.factorsList}>
                      {factors.map(f => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {minimum && (
                    <div className={styles.minimumCharge}>
                      <em>{minimum}</em>
                    </div>
                  )}
                </div>
              </Col>
            )
          )}
        </Row>

        {/* CTA Button */}
        <div className={withVisible(styles.ctaSection)}>
          <a href="/pricing" className={styles.pricingGuideBtn}>
            SEE THE FULL PRICING GUIDE
          </a>
        </div>
      </Container>
    </section>
  );
}

export default FlexiblePricing;
