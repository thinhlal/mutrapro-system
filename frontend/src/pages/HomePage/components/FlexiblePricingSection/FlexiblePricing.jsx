import { Container, Row, Col } from 'react-bootstrap';
import classNames from 'classnames';
import styles from './FlexiblePricing.module.css';

import { useIntersection } from '../../../../hooks/Animations/useIntersection';

import pianoIcon from '../../../../assets/icons/Pricing/Grand-Piano-2-2-1.png';
import hornsIcon from '../../../../assets/icons/Pricing/Horns2-1-2-1.png';
import quartetIcon from '../../../../assets/icons/Pricing/Cuartet2-1-2-1.png';

const CARDS = [
  {
    icon: pianoIcon,
    iconAlt: 'Piano icon',
    title: 'Piano',
    price: 'from',
    amount: '$19 USD',
    suffix: 'per minute of music',
    factors: [
      'Music length',
      'Musical complexity and density',
      'Difficulty of listening, notation, layers, and polyphonies',
    ],
    minimum: '*minimum charge of $49 USD',
    delay: '0.2s',
  },
  {
    icon: quartetIcon,
    iconAlt: 'Bands/Ensembles icon',
    title: 'Bands/Ensembles',
    price: 'from',
    amount: '$30 USD',
    suffix: 'per minute of music',
    factors: [
      'Music length',
      'Notation complexity and difficulty of listening',
      'Part extraction',
    ],
    delay: '0.4s',
  },
  {
    icon: hornsIcon,
    iconAlt: 'Melodic Instrument icon',
    title: 'Melodic Instrument',
    price: 'from',
    amount: '$15 USD',
    suffix: 'per minute of music',
    factors: [
      'Music length',
      'Musical complexity and density',
      'Idiomatic difficulty relative to each instrument',
    ],
    minimum: '*minimum charge of $49 USD',
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
            <strong>There are pricing options for every budget.</strong> The
            more instruments and the longer or more complex a piece is, the
            longer it takes to transcribe. The simpler and more schematic the
            required notation can be, the less time it takes.
          </p>
          <p className={styles.descriptionText}>
            We are a team of professional musicians, performers, editors, and
            musicologists with extensive experience.{' '}
            <strong>
              Your score will be 100% personalized, tailored to your needs, and
              crafted note by note manually by our professional
              transcribers.{' '}
            </strong>
            The process will be coordinated by our customer service specialists,
            who will keep you informed at all times.
          </p>
          <p className={styles.descriptionText}>
            Revisions and transpositions are included in the price, as well as
            all the digital formats you may need.
          </p>
          <p className={styles.descriptionText}>
            Below you will find a price guide, but please contact us for
            customized proposals:
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
