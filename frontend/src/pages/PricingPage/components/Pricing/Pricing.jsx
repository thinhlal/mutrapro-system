import styles from './Pricing.module.css';
import { Container, Row, Col } from 'react-bootstrap';
import { Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const Pricing = () => {
  return (
    <section className={styles.section}>
      <Container className={styles.container}>
        {/* Heading */}
        <div>
          <h1 className={styles.title}>Pricing</h1>
          <span className={styles.titleUnderline} />
        </div>
        <p className={styles.subtitle}>
          There are pricing options for every budget.
        </p>

        {/* Card */}
        <div className={styles.pricingCard}>
          <Row className="g-0 align-items-center">
            {/* Left: price */}
            <Col lg={6} className={styles.leftCol}>
              <p className={styles.fromText}>from</p>

              <div className={styles.priceLine}>
                <span className={styles.priceAmount}>$15</span>
                <span className={styles.priceCurrency}> USD</span>
              </div>

              <p className={styles.perMinute}>per minute of music</p>
              <p className={styles.minimumNote}>
                *$49 USD minimum charge per order
              </p>
            </Col>

            {/* Right: based on */}
            <Col lg={6} className={styles.rightCol}>
              <h3 className={styles.ratesTitle}>Our rates are based on:</h3>
              <ol className={styles.ratesList}>
                <li>Instrumentation</li>
                <li>Difficulty</li>
                <li>Song length</li>
                <li>Music density and complexity</li>
              </ol>
            </Col>
          </Row>
        </div>

        {/* Explainer + CTA */}
        <div className={styles.explainer}>
          <p className={styles.explainerTitle}>
            Every transcription is different and our prices reflect the time and
            skill required to transcribe the music.
          </p>
          <p className={styles.explainerDesc}>
            The more instruments and the longer or more complex a piece is, the
            longer it takes to transcribe. The simpler and more schematic the
            required notation can be, the less time it takes.
          </p>
          <p className={styles.explainerDesc}>
            Check out the pricing guides below or request a proposal.
          </p>
        </div>
        <div>
          <Button type="primary" size="large" className={styles.ctaButton}>
            REQUEST A QUOTE NOW <ArrowRightOutlined />
          </Button>
        </div>
      </Container>
    </section>
  );
};

export default Pricing;
