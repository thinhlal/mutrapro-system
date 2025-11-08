// src/pages/ServicesPage/components/HeroSection/HeroSection.jsx
import styles from './HeroSection.module.css';

const HeroSection = () => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>Turn any song into sheet music</h1>
          <p className={styles.subtitle}>
            Get your songs transcribed accurately into sheet music by
            professionals
          </p>
          <div className={styles.orangeLine}></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
