import { useState, useEffect } from 'react';
import { Typography, Spin, message } from 'antd';
import { PROS_CATEGORIES } from '../../../constants/index';
import CategoryCard from './components/CategoryCard/CategoryCard';
import Header from '../../../components/common/Header/Header';
import ProsTrustSection from './components/ProsTrustSection/ProsTrustSection';
import Footer from '../../../components/common/Footer/Footer';
import styles from './DiscoverProsPage.module.css';
import BackToTop from '../../../components/common/BackToTop/BackToTop';
import { getPricingMatrix } from '../../../services/pricingMatrixService';

const { Title, Paragraph } = Typography;

export default function DiscoverProsPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        setLoading(true);
        const response = await getPricingMatrix();

        if (response.status === 'success' && response.data) {
          // Merge pricing data with display data from constants
          const mergedCategories = PROS_CATEGORIES.map(category => {
            const pricing = response.data.find(
              p => p.serviceType === category.serviceType && p.active
            );

            return {
              ...category,
              pricing: pricing || null,
            };
          });

          setCategories(mergedCategories);
        } else {
          // Fallback to original data without pricing
          setCategories(PROS_CATEGORIES);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        message.error('Không thể tải thông tin giá. Sử dụng dữ liệu mặc định.');
        // Fallback to original data
        setCategories(PROS_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };

    fetchPricingData();
  }, []);

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
          style={{ marginTop: '3rem', marginBottom: '3rem' }}
          className="row g-4"
        >
          {loading ? (
            <div className="col-12 text-center" style={{ padding: '3rem' }}>
              <Spin size="large" tip="Đang tải dữ liệu..." />
            </div>
          ) : (
            categories.map(item => <CategoryCard key={item.id} item={item} />)
          )}
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
