import Header from "../../components/common/Header/Header";
import HeroSection from "./components/HeroSection/HeroSection";
import ServiceGridSection from "./components/ServiceGridSection/ServiceGridSection";
import Footer from "../../components/common/Footer/Footer";
import BackToTop from "../../components/common/BackToTop/BackToTop";
import styles from "./ServicesPage.module.css";

const ServicesPage = () => {
  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className={styles.mainContent}>
        <HeroSection />
        <ServiceGridSection />
      </main>

      {/* Footer */}
      <Footer />
      <BackToTop />
    </div>
  );
};

export default ServicesPage;
