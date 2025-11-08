// src/pages/TranscriptionPage/components/InstrumentsGallerySection/InstrumentsGallerySection.jsx
import styles from './InstrumentsGallerySection.module.css';

const InstrumentsGallerySection = () => {
  const instruments = [
    { id: 1, name: 'Piano', category: 'Keyboard' },
    { id: 2, name: 'Guitar', category: 'String' },
    { id: 3, name: 'Violin', category: 'String' },
    { id: 4, name: 'Cello', category: 'String' },
    { id: 5, name: 'Flute', category: 'Woodwind' },
    { id: 6, name: 'Clarinet', category: 'Woodwind' },
    { id: 7, name: 'Saxophone', category: 'Woodwind' },
    { id: 8, name: 'Trumpet', category: 'Brass' },
    { id: 9, name: 'Trombone', category: 'Brass' },
    { id: 10, name: 'Drums', category: 'Percussion' },
    { id: 11, name: 'Bass', category: 'String' },
    { id: 12, name: 'Harp', category: 'String' },
  ];

  return (
    <section className={styles.instrumentsSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Instruments We Transcribe</h2>
        <p className={styles.subtitle}>
          Professional transcription for all major instruments
        </p>
        <div className={styles.instrumentsGrid}>
          {instruments.map(instrument => (
            <div key={instrument.id} className={styles.instrumentCard}>
              <div className={styles.instrumentIcon}>🎵</div>
              <h3 className={styles.instrumentName}>{instrument.name}</h3>
              <span className={styles.category}>{instrument.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstrumentsGallerySection;
