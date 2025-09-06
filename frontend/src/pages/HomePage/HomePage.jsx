// src/pages/HomePage/HomePage.jsx
import Header from "../../components/common/Header/Header";
import HeroSection from "./components/HeroSection/HeroSection";
import HowItWorks from "./components/HowItWorksSection/HowItWorks";
import Statistics from "./components/StatisticsSection/Statistics";
import styles from "./HomePage.module.css";

const HomePage = () => {
  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Hero Section */}
        <HeroSection />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Statistics Section */}
        <Statistics />

        {/* Additional Content Sections */}
        <section className={styles.contentSection}>
          <div className={styles.container}>
            <h2>Our Services</h2>
            <p>
              Discover our professional music transcription and arrangement
              services.
            </p>
          </div>
        </section>

        <section className={styles.contentSection}>
          <div className={styles.container}>
            <h2>Why Choose Us</h2>
            <p>
              Professional quality, fast turnaround, and competitive pricing.
            </p>
          </div>
        </section>

        <section className={styles.contentSection}>
          <div className={styles.container}>
            <h2>Get Started Today</h2>
            <p>Ready to transform your music? Contact us for a free quote.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
