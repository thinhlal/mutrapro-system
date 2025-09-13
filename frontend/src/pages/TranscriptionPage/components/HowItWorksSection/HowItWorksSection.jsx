// src/pages/TranscriptionPage/components/HowItWorksSection/HowItWorksSection.jsx
import { useEffect, useRef, useState } from "react";
import styles from "./HowItWorksSection.module.css";

// NOTE: đổi path SVG theo dự án của bạn
import Icon1 from "../../../../assets/icons/HowItWork/hinhwork1.svg";
import Icon2 from "../../../../assets/icons/HowItWork/hinhwork2.svg";
import Icon3 from "../../../../assets/icons/HowItWork/hinhwork3.svg";
import Icon4 from "../../../../assets/icons/HowItWork/hinhwork4.svg";
import Icon5 from "../../../../assets/icons/HowItWork/hinhwork5.svg";

const ICONS = [Icon1, Icon2, Icon3, Icon4, Icon5];

const STEPS = [
  {
    id: 1,
    title: "You request a quote",
    body: [
      "Send us the music you want us to transcribe (an audio file or a YouTube link!) and give us all relevant information: instruments, timestamps, difficulty, and arrangement details.",
    ],
  },
  {
    id: 2,
    title: "We assess and adapt",
    body: [
      "We are all music transcribers: we will listen to your music and get back to you with a price quote that suits your needs. An in-house specialist is always ready to take care of your project.",
    ],
  },
  {
    id: 3,
    title: "You place the order",
    body: [
      "When all details and price quote have been agreed on, you will place your order securely to get us started.",
    ],
  },
  {
    id: 4,
    title: "We transcribe",
    body: [
      "Our professional transcribers will craft your transcription as agreed. We will ensure the process is smooth and keep you updated if we have news or questions.",
    ],
  },
  {
    id: 5,
    title: "You enjoy the music – 100% satisfaction",
    body: [
      "We will send you the completed transcription in all the formats you need to print it or use it.",
      "We will make sure everything looks good to you. Adjusting any small details that might have been missed is our job too.",
    ],
  },
];

export default function HowItWorksSection() {
  const cardRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const updateActiveIndex = () => {
      const centerY = window.innerHeight / 2;
      let bestIdx = 0;
      let bestDistance = Infinity;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - centerY);

        // Only consider cards that are at least partially visible
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIdx = idx;
          }
        }
      });

      setActiveIndex(bestIdx);
    };

    // Intersection Observer for better performance
    const observer = new IntersectionObserver(
      (entries) => {
        // Throttle the update to avoid too many re-renders
        requestAnimationFrame(updateActiveIndex);
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-20% 0px -20% 0px",
      }
    );

    // Observe all cards
    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    // Also listen to scroll for more responsive updates
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveIndex();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial update
    updateActiveIndex();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isClient]);

  return (
    <section className={styles.section} aria-label="How it works">
      <div className={styles.container}>
        <h2 className={styles.heading}>How does it work?</h2>

        <div className={styles.stepsGrid}>
          {STEPS.map((s, idx) => {
            const Icon = ICONS[idx];
            const isActive = activeIndex === idx;

            return (
              <div key={s.id} className={styles.stepRow}>
                {/* Icon */}
                <div className={styles.iconCell}>
                  <div
                    className={`${styles.iconCircle} ${
                      isActive ? styles.iconActive : ""
                    }`}
                  >
                    <img src={Icon} alt="" />
                  </div>
                </div>

                {/* Card */}
                <article
                  ref={(el) => (cardRefs.current[idx] = el)}
                  data-index={idx}
                  className={[
                    styles.card,
                    styles[`tone${idx + 1}`],
                    isActive ? styles.isActive : "",
                  ].join(" ")}
                >
                  <h3 className={styles.cardTitle}>
                    <span className={styles.stepNo}>{s.id}.</span> {s.title}
                  </h3>
                  <div className={styles.cardBody}>
                    {s.body.map((p, i) => (
                      <p key={i}>{p}</p>
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
