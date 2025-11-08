import { Typography } from 'antd';
import styles from './HeroSingerSection.module.css';

const { Title, Paragraph } = Typography;

const HeroSection = ({ gender }) => {
  // Tự động thay đổi chữ "Male" / "Female" dựa trên prop 'gender'
  const title = `Top ${gender === 'male' ? 'Male' : 'Female'} Singers for hire`;
  const subtitle = `These curated professional ${
    gender === 'male' ? 'male' : 'female'
  } session singers are available to record vocal tracks for your song`;
  const ctaText = 'Hear from our providers';

  return (
    <section className={styles.hero}>
      <div className="container">
        <div className="row justify-content-center text-center">
          <div className="col-12 col-lg-10">
            <Title level={1} className={styles.heroTitle}>
              {title}
            </Title>
            <Paragraph className={styles.heroSubtitle}>{subtitle}</Paragraph>
            <button
              type="button"
              className={styles.playButton}
              aria-label={ctaText}
            >
              <span className={styles.playIcon} />
              <span className={styles.playText}>{ctaText}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
