import { TRANSCRIPTION_SERVICES } from "../../../../constants";
import { createLoopedArray, createUniqueKey } from "../../../../utils";
import styles from "./HeroSection.module.css";

// Lặp 2 lần để tạo hiệu ứng loop vô hạn mượt
const LOOPED_SERVICES = createLoopedArray(TRANSCRIPTION_SERVICES, 2);

const HeroSection = () => {
  return (
    <section
      className={styles.heroSection}
      aria-label="Music Transcription Services"
    >
      <div className={styles.container}>
        <header className={styles.headerBlock}>
          <h1 className={styles.title}>Music Transcription Service Online</h1>
          <div className={styles.titleDivider} aria-hidden="true" />
          <p className={styles.lead}>Turn audio into sheet music easily!</p>
          <p className={styles.description}>
            Learn more about our music notation services and our range of
            solutions to transform audio recordings into precise and digital
            sheet music.
          </p>
        </header>
      </div>
      <div>
        {/* Marquee chạy ngang (pause khi hover) */}
        <div className={styles.stripWrap}>
          <div className={styles.stripTrack}>
            {LOOPED_SERVICES.map((service, i) => (
              <figure
                key={createUniqueKey(service.key, i)}
                className={styles.stripItem}
                aria-hidden={i >= TRANSCRIPTION_SERVICES.length}
              >
                <img
                  src={service.image}
                  alt={service.name}
                  loading="lazy"
                  className={styles.iconImg}
                />
                <figcaption className={styles.itemLabel}>
                  {service.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
