import { memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import classNames from 'classnames';
import styles from './WhatsIncluded.module.css';

import { useIntersection } from '../../../../../hooks/Animations/useIntersection';

import pianoImage from '../../../../../assets/images/HomePage/Piano8-1.jpg';
import fileIconsImage from '../../../../../assets/icons/HomePage/icones-2.png';
import fastDeliveryIcon from '../../../../../assets/icons/HomePage/fast-delivery-new-1.png';
import accuracyIcon from '../../../../../assets/icons/HomePage/accuracy-3-1-1.png';

const OBSERVER_OPTS = { threshold: 0.2, rootMargin: '0px 0px -50px 0px' };

const CARDS = [
  {
    id: 'services',
    icon: fastDeliveryIcon,
    iconAlt: 'Services icon',
    iconClass: 'iconImage',
    title: 'Comprehensive Services',
    description: 'Transcription, arrangement, and recording services. Book studio sessions and track progress in real-time',
    delay: '0.2s',
  },
  {
    id: 'formats',
    icon: fileIconsImage,
    iconAlt: 'File format icons',
    iconClass: 'fileIconsImage',
    title: 'Multiple Export Formats',
    description:
      'Get your deliverables in PDF, MusicXML, and other digital formats. Integrated notation editor for editing',
    delay: '0.4s',
  },
  {
    id: 'workflow',
    icon: accuracyIcon,
    iconAlt: 'Workflow icon',
    iconClass: 'iconImage',
    title: 'Streamlined Workflow',
    description:
      'AI-assisted transcription, expert review, revision requests, and transparent progress tracking throughout the process',
    delay: '0.6s',
  },
];

function WhatsIncluded() {
  const { ref: sectionRef, isVisible } = useIntersection(OBSERVER_OPTS);

  const withVisible = base => classNames(base, { [styles.visible]: isVisible });

  return (
    <section className={styles.whatsIncludedSection} ref={sectionRef}>
      {/* Background Image (decorative) */}
      <div className={styles.backgroundImage} aria-hidden="true">
        <img
          src={pianoImage}
          alt=""
          className={styles.pianoBackground}
          loading="lazy"
        />
        <div className={styles.overlay} />
      </div>

      <Container className={styles.container}>
        {/* Section Title */}
        <div className={withVisible(styles.sectionHeader)}>
          <h2 className={styles.sectionTitle}>What's included?</h2>
        </div>

        {/* Cards Row */}
        <Row className={styles.cardsRow}>
          {CARDS.map(
            ({ id, icon, iconAlt, iconClass, title, description, delay }) => (
              <Col key={id} lg={4} md={6} sm={12} className={styles.cardCol}>
                <div
                  className={withVisible(styles.card)}
                  style={{ animationDelay: delay }}
                >
                  <div className={styles.cardIcon}>
                    <img
                      src={icon}
                      alt={iconAlt}
                      className={styles[iconClass]}
                      loading="lazy"
                    />
                  </div>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <p className={styles.cardDescription}>{description}</p>
                </div>
              </Col>
            )
          )}
        </Row>
      </Container>
    </section>
  );
}

export default memo(WhatsIncluded);
