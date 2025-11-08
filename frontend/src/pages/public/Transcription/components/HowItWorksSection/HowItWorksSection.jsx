import { HOW_IT_WORKS_STEPS, HOW_IT_WORKS_ICONS } from '../../../../../constants';
import { useScrollActiveIndex, useClientSide } from '../../../../../hooks';
import styles from './HowItWorksSection.module.css';

export default function HowItWorksSection() {
  const isClient = useClientSide();
  const { cardRefs, activeIndex } = useScrollActiveIndex(isClient);

  return (
    <section className={styles.section} aria-label="How it works">
      <div className={styles.container}>
        <h2 className={styles.heading}>How does it work?</h2>

        <div className={styles.stepsGrid}>
          {HOW_IT_WORKS_STEPS.map((step, idx) => {
            const Icon = HOW_IT_WORKS_ICONS[idx];
            const isActive = activeIndex === idx;

            return (
              <div key={step.id} className={styles.stepRow}>
                {/* Icon */}
                <div className={styles.iconCell}>
                  <div
                    className={`${styles.iconCircle} ${
                      isActive ? styles.iconActive : ''
                    }`}
                  >
                    <img src={Icon} alt={`Step ${step.id} icon`} />
                  </div>
                </div>

                {/* Card */}
                <article
                  ref={el => (cardRefs.current[idx] = el)}
                  data-index={idx}
                  className={[
                    styles.card,
                    styles[`tone${idx + 1}`],
                    isActive ? styles.isActive : '',
                  ].join(' ')}
                >
                  <h3 className={styles.cardTitle}>
                    <span className={styles.stepNo}>{step.id}.</span>{' '}
                    {step.title}
                  </h3>
                  <div className={styles.cardBody}>
                    {step.body.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
