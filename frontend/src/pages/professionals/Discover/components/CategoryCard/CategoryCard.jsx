import { Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from './CategoryCard.module.css';

export default function CategoryCard({ item }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(item.href, { state: { serviceType: item.serviceType } });
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
              <div className={styles.title}>{item.title}</div>
              <p className={styles.description}>{item.description}</p>
            </div>
          </div>
        }
      />
    </div>
  );
}
