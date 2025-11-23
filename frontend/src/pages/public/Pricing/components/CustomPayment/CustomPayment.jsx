// src/pages/PricingPage/components/CustomPayment/CustomPayment.jsx
import { memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import styles from './CustomPayment.module.css';

function CustomPayment() {
  return (
    <section className={styles.section} aria-labelledby="custom-payment-title">
      <Container className={styles.container}>
        <div className={styles.header}>
          <h2 id="custom-payment-title" className={styles.title}>
            Custom payment milestone options
          </h2>
          <span className={styles.rule} aria-hidden="true" />
        </div>

        <div className={styles.card}>
          <Row className="g-4 g-lg-5">
            <Col lg={6} className={styles.col}>
              <h3 className={styles.question}>
                Are you looking at a large project?
              </h3>
              <p className={styles.text}>
                If you can’t commit or pay for the full project at once, let our
                team know and we will find the best payment solution for you.
              </p>
              <br />
              <p className={styles.text}>
                Our options include: 50–50% payments, multiple milestone payment
                plans, dividing the project in batches that you can afford, and
                others.
              </p>
            </Col>

            <Col lg={6} className={`${styles.col} ${styles.rightCol}`}>
              <h3 className={styles.question}>
                Is the price quote too much for you?
              </h3>
              <p className={styles.text}>
                Don’t worry. Make sure you’re requesting only the necessary
                notation and instruments.
              </p>
              <br />
              <p className={styles.text}>
                Tell our team to get started with just a portion of the song or
                the project, and let’s take things at a pace that works for you.
              </p>
            </Col>
          </Row>
        </div>
      </Container>
    </section>
  );
}

export default memo(CustomPayment);
