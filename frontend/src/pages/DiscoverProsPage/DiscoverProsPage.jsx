import { Typography } from "antd";
import { DISCOVER_PROS_HERO, PROS_CATEGORIES } from "../../constants/index";
import CategoryCard from "./components/CategoryCard/CategoryCard";
import Header from "../../components/common/Header/Header";
import ProsTrustSection from "./components/ProsTrustSection/ProsTrustSection";
import Footer from "../../components/common/Footer/Footer";
import styles from "./DiscoverProsPage.module.css";

const { Title, Paragraph } = Typography;

export default function DiscoverProsPage() {
  const { title, subtitle, ctaText } = DISCOVER_PROS_HERO;

  return (
    <div className={styles.page}>
      <Header />
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

      <section className="container">
        <div className="row g-4 py-4">
          {PROS_CATEGORIES.map((item) => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <ProsTrustSection />
      </section>

      <Footer />
    </div>
  );
}
