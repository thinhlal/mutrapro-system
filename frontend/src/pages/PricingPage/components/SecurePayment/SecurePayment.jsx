// src/pages/PricingPage/components/SecurePayment/SecurePayment.jsx
import { memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Customersupport from '../../../../assets/images/PricingPage/SecurePayments/Customersupportavailable.png';
import Dataprotection from '../../../../assets/images/PricingPage/SecurePayments/Dataprotection.png';
import Onlyverified from '../../../../assets/images/PricingPage/SecurePayments/Onlyverified.png';
import styles from './SecurePayment.module.css';

function SecurePayment() {
  return (
    <section className={styles.section} aria-labelledby="secure-payments">
      <Container className={styles.container}>
        <div className={styles.header}>
          <h2 id="secure-payments" className={styles.title}>
            Secure payments guaranteed
          </h2>
          <span className={styles.rule} aria-hidden="true" />
        </div>

        <Row className={`g-4 g-lg-5 ${styles.grid}`}>
          {/* Left */}
          <Col lg={4} className={styles.item}>
            <img
              className={styles.iconLogos}
              src={Onlyverified}
              alt="Verified payment methods logos"
            />
            <h3 className={styles.itemTitle}>Only verified payment methods</h3>
            <p className={styles.desc}>
              Pay by Credit/Debit Card, PayPal, or bank transfer
            </p>
          </Col>

          {/* Middle */}
          <Col lg={4} className={styles.item}>
            <img
              className={styles.icon}
              src={Dataprotection}
              alt="Data protection"
            />
            <h3 className={styles.itemTitle}>Data protection</h3>
            <p className={styles.desc}>
              All payment gateways are safe and your data is encrypted and
              private.
            </p>
          </Col>

          {/* Right */}
          <Col lg={4} className={styles.item}>
            <img
              className={styles.icon}
              src={Customersupport}
              alt="Customer support"
            />
            <h3 className={styles.itemTitle}>Customer support available</h3>
            <p className={styles.desc}>
              Our customer service will help you place your order safely
            </p>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

export default memo(SecurePayment);
