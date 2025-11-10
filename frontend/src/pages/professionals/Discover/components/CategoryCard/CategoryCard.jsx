import { Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './CategoryCard.module.css';
import { formatPrice } from '../../../../../services/pricingMatrixService';

export default function CategoryCard({ item }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(item.href, { state: { serviceType: item.serviceType } });
  };

  // Get description from API pricing if available, otherwise use default
  const getDescription = () => {
    if (item.pricing?.description) {
      return item.pricing.description;
    }
    return item.description;
  };

  const renderPriceTag = () => {
    if (!item.pricing) return null;
    
    const { basePrice, currency, unitType } = item.pricing;
    const unitLabel = unitType === 'per_minute' ? '/phút' : '/bài';
    
    return (
      <Tag 
        color="green" 
        style={{ 
          fontSize: '14px', 
          padding: '4px 12px',
          marginTop: '8px',
          fontWeight: 'bold'
        }}
      >
        {formatPrice(basePrice, currency)}{unitLabel}
      </Tag>
    );
  };

  return (
    <div
      className={`col-12 col-sm-6 col-lg-4 col-xl-3 ${styles.link}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <Card
        styles={{ body: { padding: 0 } }}
        hoverable
        className={styles.card}
        cover={
          <div className={styles.cover}>
            <img src={item.image} alt={item.title} className={styles.img} />
            <div className={styles.overlay} />
            <div className={styles.content}>
              <div className={styles.title}>{item.serviceType}</div>
              <p className={styles.description}>{getDescription()}</p>
              {renderPriceTag()}
            </div>
          </div>
        }
      />
    </div>
  );
}
