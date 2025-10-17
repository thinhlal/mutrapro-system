import { Typography } from "antd";
import { PROS_CATEGORIES } from "../../constants/index";
import CategoryCard from "./components/CategoryCard/CategoryCard";
import Header from "../../components/common/Header/Header";
import ProsTrustSection from "./components/ProsTrustSection/ProsTrustSection";
import Footer from "../../components/common/Footer/Footer";
import styles from "./DiscoverProsPage.module.css";
import BackToTop from "../../components/common/BackToTop/BackToTop";

const { Title, Paragraph } = Typography;

export default function DiscoverProsPage() {
  return (
    <div className={styles.page}>
      <Header />
      <section className={styles.hero}>
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-12 col-lg-10">
              <Title level={1} className={styles.heroTitle}>
                Discover Top Music Production Pros
              </Title>
              <Paragraph className={styles.heroSubtitle}>
                Mix & Mastering Engineers, Singers, Recording Studios & Session
                Musicians for Hire
              </Paragraph>

              <button
                type="button"
                className={styles.playButton}
                aria-label="Hear from our providers"
              >
                <span className={styles.playIcon} />
                <span className={styles.playText}>Hear from our providers</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container">
        <div
          style={{ marginTop: "3rem", marginBottom: "3rem" }}
          className="row g-4"
        >
          {PROS_CATEGORIES.map((item) => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <ProsTrustSection />
      </section>

      <Footer />
      <BackToTop />
    </div>
  );
}
