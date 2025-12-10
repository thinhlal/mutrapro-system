import { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Input, Button, Divider, Tooltip } from 'antd';
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  FacebookFilled,
  YoutubeFilled,
  InstagramFilled,
  LinkedinFilled,
  GithubFilled,
} from '@ant-design/icons';
import styles from './Footer.module.css';

// (Optional) import your logo
// import logo from "../../../../assets/logo.svg";

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = e => {
    e.preventDefault();
    // TODO: Call API/submit form
    // reset or show toast here
    setEmail('');
  };

  return (
    <footer className={styles.footer}>
      {/* Decorative background (optional: replace with wave image) */}
      <div className={styles.bgDecor} aria-hidden="true" />

      <Container>
        <Row className="gy-5">
          {/* Brand + intro */}
          <Col xs={12} md={6} lg={4}>
            <div className={styles.brand}>
              {/* <img src={logo} alt="MuTraPro" className={styles.logo} /> */}
              <div className={styles.logoText}>
                <span className={styles.logoMy}>Mu</span>
                <span className={styles.logoMain}>Tra</span>
                <span className={styles.logoMy}>Pro</span>
              </div>
              <p className={styles.desc}>
                We provide on-demand <b>music transcription</b>,{' '}
                <b>arrangement</b>, and <b>production services</b> for artists,
                educators, and music applications. An integrated platform for
                seamless music production workflow.
              </p>

              <div className={styles.contacts}>
                <div>
                  <EnvironmentOutlined />{' '}
                  <span>US &amp; Europe (online worldwide)</span>
                </div>
                <div>
                  <PhoneOutlined /> <a href="tel:+1234567890">+1 234 567 890</a>
                </div>
                <div>
                  <MailOutlined />{' '}
                  <a href="mailto:hello@mutrapro.com">hello@mutrapro.com</a>
                </div>
              </div>

              <div className={styles.socials}>
                <Tooltip title="Facebook">
                  <a href="#" aria-label="Facebook">
                    <FacebookFilled />
                  </a>
                </Tooltip>
                <Tooltip title="YouTube">
                  <a href="#" aria-label="YouTube">
                    <YoutubeFilled />
                  </a>
                </Tooltip>
                <Tooltip title="Instagram">
                  <a href="#" aria-label="Instagram">
                    <InstagramFilled />
                  </a>
                </Tooltip>
                <Tooltip title="LinkedIn">
                  <a href="#" aria-label="LinkedIn">
                    <LinkedinFilled />
                  </a>
                </Tooltip>
                <Tooltip title="GitHub">
                  <a href="#" aria-label="GitHub">
                    <GithubFilled />
                  </a>
                </Tooltip>
              </div>
            </div>
          </Col>

          {/* Quick Links */}
          <Col xs={6} md={3} lg={2}>
            <h4 className={styles.heading}>Company</h4>
            <ul className={styles.links}>
              <li>
                <a href="/about">About us</a>
              </li>
              <li>
                <a href="/process">How it works</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
              <li>
                <a href="/reviews">Reviews</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </Col>

          {/* Services */}
          <Col xs={6} md={3} lg={2}>
            <h4 className={styles.heading}>Services</h4>
            <ul className={styles.links}>
              <li>
                <a href="/services/transcription">Transcription</a>
              </li>
              <li>
                <a href="/services/arrangement">Arrangement</a>
              </li>
              <li>
                <a href="/services/orchestration">Orchestration</a>
              </li>
              <li>
                <a href="/services/engraving">Notation &amp; Engraving</a>
              </li>
              <li>
                <a href="/services/recording">Studio Recording</a>
              </li>
            </ul>
          </Col>

          {/* Resources */}
          <Col xs={12} md={6} lg={4}>
            <h4 className={styles.heading}>Stay in the loop</h4>
            <p className={styles.small}>
              Receive transcription tips, lead sheet templates, and service
              offers every month.
            </p>

            <form className={styles.subscribe} onSubmit={handleSubscribe}>
              <Input
                size="large"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-label="Email address"
                required
              />
              <Button
                size="large"
                type="primary"
                htmlType="submit"
                icon={<ArrowRightOutlined />}
              >
                Subscribe
              </Button>
            </form>

            <Divider className={styles.divider} />

            <h4 className={styles.heading}>Resources</h4>
            <ul className={styles.linksTwoCols}>
              <li>
                <a href="/samples">Scores &amp; Samples</a>
              </li>
              <li>
                <a href="/blog">Blog / Tutorials</a>
              </li>
              <li>
                <a href="/faq">FAQ</a>
              </li>
              <li>
                <a href="/guides/style">Notation Style Guide</a>
              </li>
              <li>
                <a href="/guides/upload">Upload Guide</a>
              </li>
              <li>
                <a href="/support">Support Center</a>
              </li>
            </ul>
          </Col>
        </Row>

        <Divider className={styles.hr} />

        {/* Bottom bar */}
        <Row className={styles.bottomBar}>
          <Col xs={12} md={6} className="text-center text-md-start">
            <span>
              © {new Date().getFullYear()} MuTraPro. All rights reserved.
            </span>
          </Col>
          <Col xs={12} md={6} className="text-center text-md-end">
            <a href="/terms">Terms</a>
            <span className={styles.dot}>•</span>
            <a href="/privacy">Privacy</a>
            <span className={styles.dot}>•</span>
            <a href="/cookies">Cookies</a>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
