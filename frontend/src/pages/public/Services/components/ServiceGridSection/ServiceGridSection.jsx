import { TRANSCRIPTION_SERVICES } from '../../../../../constants';
import styles from './ServiceGridSection.module.css';

const ServiceGridSection = () => {
  return (
    <section className={styles.serviceGridSection}>
      <div className={styles.container}>
        <div className={styles.servicesGrid}>
          {TRANSCRIPTION_SERVICES.map(service => (
            <figure key={service.id} className={styles.serviceItem}>
              <img
                src={service.image}
                alt={service.name}
                loading="lazy"
                className={styles.serviceImage}
              />
              <figcaption className={styles.serviceName}>
                {service.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceGridSection;
