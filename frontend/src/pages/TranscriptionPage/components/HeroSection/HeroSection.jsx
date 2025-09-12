// src/pages/TranscriptionPage/components/HeroSection/HeroSection.jsx
import styles from "./HeroSection.module.css";

const HeroSection = () => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Music Transcription Service Online
          </h1>
          <p className={styles.subtitle}>
            Professional music transcription services for all instruments
          </p>
          <div className={styles.ctaButtons}>
            <button className={styles.primaryBtn}>Get Started</button>
            <button className={styles.secondaryBtn}>Learn More</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
