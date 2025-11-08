// src/pages/HomePage/HomePage.jsx
import Header from '../../../components/common/Header/Header';
import HeroSection from './components/HeroSection/HeroSection';
import HowItWorks from './components/HowItWorksSection/HowItWorks';
import Statistics from './components/StatisticsSection/Statistics';
import WhoAreWe from './components/WhoAreWeSection/WhoAreWe';
import WhatsIncluded from './components/WhatsIncludedSection/WhatsIncluded';
import FlexiblePricing from './components/FlexiblePricingSection/FlexiblePricing';
import styles from './HomePage.module.css';
import EdgeGalleryStrip from './components/EdgeGalleryStrip/EdgeGalleryStrip';
import ReviewsSection from './components/ReviewsSection/ReviewsSection';
import Footer from '../../../components/common/Footer/Footer';
import BackToTop from '../../../components/common/BackToTop/BackToTop';

const HomePage = () => {
  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={styles.mainContent}>
        <HeroSection />
        <HowItWorks />
        <Statistics />
        <WhoAreWe />
        <WhatsIncluded />
        <FlexiblePricing />
        <EdgeGalleryStrip />
        <ReviewsSection />
      </main>

      {/* Footer */}
      <Footer />
      <BackToTop />
    </div>
  );
};

export default HomePage;
