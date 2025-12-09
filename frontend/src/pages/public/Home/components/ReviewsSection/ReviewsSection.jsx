import { useMemo, useRef, useCallback, memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Carousel, Rate, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import styles from './ReviewsSection.module.css';

// === Assets ===
import bgWaves from '../../../../../assets/images/Background/2-4-1-1.png';

// === Constants / Sample data
const AUTOPLAY_MS = 4000;
const REVIEWS = [
  {
    name: 'Sarah A.',
    locationRole: 'Musician from the US',
    date: 'March 2025',
    rating: 5,
    text: 'MuTraPro made the entire process so smooth! I uploaded my audio file, tracked the transcription progress in real-time, and got my sheet music in PDF and MusicXML formats. The AI-assisted transcription was incredibly accurate, and the revision process was seamless. Highly recommended!',
  },
  {
    name: 'Guy L.',
    locationRole: 'Composer from the UK',
    date: 'January 2025',
    rating: 5,
    text: 'I needed both transcription and arrangement services. The platform made it easy to submit my requirements, and I could see exactly which specialist was working on my project. The final arrangement exceeded my expectations. The integrated workflow is fantastic!',
  },
  {
    name: 'Marta S.',
    locationRole: 'Producer from Spain',
    date: 'December 2024',
    rating: 5,
    text: 'Booked a studio session through MuTraPro for vocal recording. The scheduling feature worked perfectly, and the Artist assigned to my project was professional. The entire process from booking to receiving the final recording was transparent and efficient.',
  },
  {
    name: 'Ethan P.',
    locationRole: 'Music Teacher from Canada',
    date: 'November 2024',
    rating: 5,
    text: 'The wallet system and payment process are very convenient. I could top up funds, see deposit requirements before confirming, and track all my transactions. The transcription quality is excellent, and I love being able to request revisions easily.',
  },
  {
    name: 'Julia K.',
    locationRole: 'Songwriter from Germany',
    date: 'September 2024',
    rating: 5,
    text: 'As someone who needed multiple services—transcription, arrangement, and recording—MuTraPro was the perfect solution. Everything is managed in one platform, and I could monitor progress at every stage. The customer support is responsive and helpful.',
  },
];

// Gom nhóm n phần tử/slide (desktop 2 thẻ/slide)
const pairize = (arr, size = 2) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

function ReviewsSection() {
  const carouselRef = useRef(null);
  const pairs = useMemo(() => pairize(REVIEWS, 2), []);

  const handlePrev = useCallback(() => carouselRef.current?.prev(), []);
  const handleNext = useCallback(() => carouselRef.current?.next(), []);

  return (
    <section className={styles.section}>
      {/* Decorative background */}
      <div className={styles.bgWrap} aria-hidden="true">
        <img src={bgWaves} className={styles.bgImage} alt="" />
      </div>

      <Container className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Customer Reviews</h2>
          <span className={styles.titleUnderline} />
        </div>

        {/* Controls */}
        <div
          className={styles.controls}
          role="group"
          aria-label="Carousel controls"
        >
          <Button
            shape="circle"
            size="large"
            className={styles.navBtn}
            icon={<LeftOutlined />}
            onClick={handlePrev}
            aria-label="Previous"
          />
          <Button
            shape="circle"
            size="large"
            className={styles.navBtn}
            icon={<RightOutlined />}
            onClick={handleNext}
            aria-label="Next"
          />
        </div>

        {/* Slider */}
        <Carousel
          ref={carouselRef}
          autoplay
          autoplaySpeed={AUTOPLAY_MS}
          dots
          pauseOnHover
          swipeToSlide
          draggable
          className={styles.carousel}
        >
          {pairs.map((group, idx) => (
            <div key={`slide-${idx}`}>
              <Row className="g-4">
                {group.map(r => (
                  <Col key={`${r.name}-${r.date}`} xs={12} md={12} lg={6}>
                    <article className={styles.card}>
                      {/* Top: name + Google badge */}
                      <div className={styles.cardTop}>
                        <h3 className={styles.name}>{r.name}</h3>
                        <div className={styles.gBadge} aria-hidden="true">
                          G
                        </div>
                      </div>

                      {/* Stars + role + date */}
                      <div className={styles.meta}>
                        <Rate
                          value={r.rating}
                          disabled
                          className={styles.stars}
                          aria-label={`${r.rating} out of 5 stars`}
                        />
                        <div className={styles.roleDate}>
                          {r.locationRole}{' '}
                          <b className={styles.date}>| {r.date}</b>
                        </div>
                      </div>

                      <div className={styles.hr} aria-hidden="true" />

                      {/* Content */}
                      <p className={styles.text}>{r.text}</p>
                    </article>
                  </Col>
                ))}
                {group.length === 1 && (
                  <Col lg={6} className="d-none d-lg-block" />
                )}
              </Row>
            </div>
          ))}
        </Carousel>
      </Container>
    </section>
  );
}

export default memo(ReviewsSection);
