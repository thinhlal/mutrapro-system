// src/pages/TranscriptionPage/components/ServiceCategoriesSection/ServiceCategoriesSection.jsx
import styles from "./ServiceCategoriesSection.module.css";

const ServiceCategoriesSection = () => {
  const categories = [
    { id: 1, name: "Piano", icon: "🎹" },
    { id: 2, name: "Guitar", icon: "🎸" },
    { id: 3, name: "Violin", icon: "🎻" },
    { id: 4, name: "Drums", icon: "🥁" },
    { id: 5, name: "Saxophone", icon: "🎷" },
    { id: 6, name: "Trumpet", icon: "🎺" },
  ];

  return (
    <section className={styles.categoriesSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Choose Your Instrument</h2>
        <div className={styles.categoriesGrid}>
          {categories.map((category) => (
            <div key={category.id} className={styles.categoryCard}>
              <div className={styles.icon}>{category.icon}</div>
              <h3 className={styles.categoryName}>{category.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategoriesSection;
