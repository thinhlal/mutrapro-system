import { Card, Badge } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './CategoryCard.module.css';
import { formatPrice } from '../../../../../services/pricingMatrixService';

export default function CategoryCard({ item }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(item.href, { state: { serviceType: item.serviceType } });
  };

  // Map serviceType to display name
  const getServiceTypeName = (serviceType) => {
    if (!serviceType) return '';
    
    const serviceTypeMap = {
      'transcription': 'Transcription',
      'arrangement': 'Arrangement',
      'arrangement_with_recording': 'Arrangement / Record',
      'recording': 'Recording',
      'orchestration': 'Orchestration',
      'mixing': 'Mixing',
      'mastering': 'Mastering',
      'composition': 'Composition',
      'notation': 'Notation',
      'consultation': 'Consultation',
      'lesson': 'Lesson',
    };
    
    return serviceTypeMap[serviceType.toLowerCase()] || 
           serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get description from API pricing if available, otherwise use default
  const getDescription = () => {
    if (item.pricing?.description) {
      return item.pricing.description;
    }
    return item.description;
  };

  const getPriceDisplay = () => {
    if (!item.pricing) return null;
    
    const { basePrice, currency, unitType } = item.pricing;
    const unitLabel = unitType === 'per_minute' ? '/phút' : '/bài';
    
    return `${formatPrice(basePrice, currency)}${unitLabel}`;
  };

  return (
    <div
      className={`col-12 col-sm-6 col-lg-4 col-xl-3 ${styles.link}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <Badge.Ribbon
        text={
          item.pricing ? (
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {getPriceDisplay()}
            </span>
          ) : null
        }
        color="green"
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
                <div className={styles.title}>{getServiceTypeName(item.serviceType)}</div>
                <p className={styles.description}>{getDescription()}</p>
              </div>
            </div>
          }
        />
      </Badge.Ribbon>
    </div>
  );
}
