import { memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import classNames from 'classnames';
import styles from './HowItWorks.module.css';

import { useIntersection } from '../../../../../hooks/Animations/useIntersection';

import stepsImage from '../../../../../assets/images/HomePage/3-steps.jpg';

// Constants
const OBSERVER_OPTS = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const STEPS = [
  {
    id: 1,
    title: 'Submit Your Request',
    description:
      'Upload your audio file, song, or video. Submit existing music scores for arrangement, or book studio sessions for recording services',
  },
  {
    id: 2,
    title: 'We Process Your Order',
    description:
      'Our specialists handle transcription, arrangement, and recording. Track progress in real-time and request revisions as needed',
  },
  {
    id: 3,
    title: 'Receive & Use',
    description:
      'Get your deliverables in multiple formats (PDF, MusicXML). Approve final outputs and download your completed work',
  },
];

function HowItWorks() {
  const { ref: sectionRef, isVisible } = useIntersection(OBSERVER_OPTS);

  const withVisible = base => classNames(base, { [styles.visible]: isVisible });

  return (
    <section className={styles.howItWorksSection} ref={sectionRef}>
      <Container>
        {/* Section Header */}
        <div className={withVisible(styles.sectionHeader)}>
          <h2 className={styles.sectionTitle}>How does it work?</h2>
          <div className={styles.titleUnderline} />
        </div>

        {/* Main Content */}
        <div className={styles.contentWrapper}>
          <Row className={styles.mainRow}>
            {/* Process Illustration */}
            <Col lg={12}>
              <div className={withVisible(styles.processIllustration)}>
                <img
                  src={stepsImage}
                  alt="3 steps: Submit Request → Process Order → Receive & Use"
                  className={styles.processImage}
                  loading="lazy"
                />
              </div>
            </Col>
          </Row>

          {/* Steps Text Below Image */}
          <Row className={`${styles.stepsRow} justify-content-center`}>
            {STEPS.map(({ id, title, description }) => (
              <Col key={id} lg={3} md={3} sm={12}>
                <div className={withVisible(styles.stepText)}>
                  <div className={styles.stepNumber}>{id}.</div>
                  <h3 className={styles.stepTitle}>{title}</h3>
                  <p className={styles.stepDescription}>{description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Container>
    </section>
  );
}

export default memo(HowItWorks);
