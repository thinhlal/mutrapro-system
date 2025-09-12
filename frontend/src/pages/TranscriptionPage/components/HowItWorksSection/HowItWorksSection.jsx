// src/pages/TranscriptionPage/components/HowItWorksSection/HowItWorksSection.jsx
import styles from "./HowItWorksSection.module.css";

const HowItWorksSection = () => {
  const steps = [
    {
      id: 1,
      title: "Upload Your Audio",
      description: "Send us your audio file or recording",
      icon: "📤"
    },
    {
      id: 2,
      title: "We Transcribe",
      description: "Our experts create accurate sheet music",
      icon: "🎼"
    },
    {
      id: 3,
      title: "Get Your Sheet Music",
      description: "Download your professional transcription",
      icon: "📝"
    }
  ];

  return (
    <section className={styles.howItWorksSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>How It Works</h2>
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={step.id} className={styles.stepCard}>
              <div className={styles.stepNumber}>{step.id}</div>
              <div className={styles.stepIcon}>{step.icon}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
              {index < steps.length - 1 && (
                <div className={styles.stepArrow}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
