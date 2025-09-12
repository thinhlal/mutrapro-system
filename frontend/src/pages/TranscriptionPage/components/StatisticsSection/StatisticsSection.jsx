// src/pages/TranscriptionPage/components/StatisticsSection/StatisticsSection.jsx
import styles from "./StatisticsSection.module.css";

const StatisticsSection = () => {
  const stats = [
    { id: 1, number: "12,257", label: "Transcriptions Completed", icon: "🎼" },
    { id: 2, number: "98%", label: "Customer Satisfaction", icon: "⭐" },
    { id: 3, number: "24h", label: "Average Delivery Time", icon: "⚡" },
    { id: 4, number: "50+", label: "Instruments Supported", icon: "🎵" },
  ];

  return (
    <section className={styles.statisticsSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Our Track Record</h2>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.id} className={styles.statCard}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
