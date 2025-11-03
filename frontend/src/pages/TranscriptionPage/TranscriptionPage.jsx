import Header from '../../components/common/Header/Header';
import HeroSection from './components/HeroSection/HeroSection';
import MusicSheetSection from './components/MusicSheetSection/MusicSheetSection';
import HowItWorksSection from './components/HowItWorksSection/HowItWorksSection';
import Footer from '../../components/common/Footer/Footer';
import BackToTop from '../../components/common/BackToTop/BackToTop';
import styles from './TranscriptionPage.module.css';
import WhatsIncluded from '../HomePage/components/WhatsIncludedSection/WhatsIncluded';
import ServicesPage from '../ServicesPage/ServicesPage';

const TranscriptionPage = () => {
  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={styles.mainContent}>
        <HeroSection />
        <MusicSheetSection />
        <HowItWorksSection />
        <WhatsIncluded />
        <ServicesPage />
      </main>

      {/* Footer */}
      <Footer />
      <BackToTop />
    </div>
  );
};

export default TranscriptionPage;
