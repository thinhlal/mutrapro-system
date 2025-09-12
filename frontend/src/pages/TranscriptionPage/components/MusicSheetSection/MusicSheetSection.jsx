// src/pages/TranscriptionPage/components/MusicSheetSection/MusicSheetSection.jsx
import styles from "./MusicSheetSection.module.css";

const MusicSheetSection = () => {
  const samples = [
    { id: 1, title: "Piano Piece #1", difficulty: "Intermediate" },
    { id: 2, title: "Guitar Solo #2", difficulty: "Advanced" },
    { id: 3, title: "Violin Melody #3", difficulty: "Beginner" },
  ];

  return (
    <section className={styles.musicSheetSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Sample Transcriptions</h2>
        <p className={styles.subtitle}>
          See examples of our professional music transcription work
        </p>
        <div className={styles.sheetsGrid}>
          {samples.map((sample) => (
            <div key={sample.id} className={styles.sheetCard}>
              <div className={styles.sheetPreview}>
                {/* Placeholder for sheet music image */}
                <div className={styles.sheetPlaceholder}>
                  <span>♪ ♫ ♪ ♫</span>
                </div>
              </div>
              <div className={styles.sheetInfo}>
                <h3 className={styles.sheetTitle}>{sample.title}</h3>
                <span className={styles.difficulty}>{sample.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MusicSheetSection;
