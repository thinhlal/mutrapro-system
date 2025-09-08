import { useMemo, useRef, useCallback, memo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Carousel, Rate, Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import styles from "./ReviewsSection.module.css";

// === Assets ===
import bgWaves from "../../../../assets/images/Background/2-4-1-1.png";

// === Constants / Sample data
const AUTOPLAY_MS = 4000;
const REVIEWS = [
  {
    name: "Sarah A.",
    locationRole: "Harpist from the US",
    date: "March 2025",
    rating: 5,
    text: "Such an amazing team and great work they provide! Very professional, everything is handled with care and done in a timely manner! Until I can learn to play music on my harp by ear, I’ll only use their services from now on which is 💯x better than AI transcriptions! ❤️",
  },
  {
    name: "Guy L.",
    locationRole: "Pianist from the UK",
    date: "January 2025",
    rating: 5,
    text: "Exceptional. I requested a transcription of a pretty complex piano piece, and the finished product really exceeded my expectations in terms of accuracy and presentation. Despite its complexity, I didn’t need to ask for any revisions. Will definitely use again.",
  },
  {
    name: "Marta S.",
    locationRole: "Composer from Spain",
    date: "December 2024",
    rating: 5,
    text: "Fast turnaround and stellar quality! Communication was clear and friendly from start to finish. Highly recommended.",
  },
  {
    name: "Ethan P.",
    locationRole: "Guitarist from Canada",
    date: "November 2024",
    rating: 5,
    text: "They nailed the fingerstyle parts I was struggling with. Clean notation and easy to read. Will come back for more.",
  },
  {
    name: "Julia K.",
    locationRole: "Vocalist from Germany",
    date: "September 2024",
    rating: 5,
    text: "Beautifully formatted lead sheets with correct harmonies. Exactly what I needed for rehearsal.",
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
                {group.map((r) => (
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
                          {r.locationRole}{" "}
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
