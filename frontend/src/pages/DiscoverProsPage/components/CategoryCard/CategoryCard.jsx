import { Card } from "antd";
import { Link } from "react-router-dom";
import styles from "./CategoryCard.module.css";

export default function CategoryCard({ item }) {
  return (
    <Link
      to={item.href}
      className={`col-12 col-sm-6 col-lg-4 col-xl-3 ${styles.link}`}
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
    </Link>
  );
}
