// src/pages/TranscriptionPage/components/FAQSection/FAQSection.jsx
import { useState } from 'react';
import styles from './FAQSection.module.css';

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How long does transcription take?',
      answer:
        'Most transcriptions are completed within 24-48 hours, depending on complexity and length.',
    },
    {
      id: 2,
      question: 'What audio formats do you accept?',
      answer:
        'We accept all major audio formats including MP3, WAV, FLAC, M4A, and more.',
    },
    {
      id: 3,
      question: 'Can you transcribe multiple instruments?',
      answer:
        'Yes, we can transcribe full arrangements with multiple instruments and parts.',
    },
    {
      id: 4,
      question: "What if I'm not satisfied with the transcription?",
      answer:
        "We offer unlimited revisions until you're completely satisfied with the result.",
    },
    {
      id: 5,
      question: 'Do you provide different notation formats?',
      answer:
        'Yes, we can provide sheet music in various formats including PDF, MusicXML, and MIDI.',
    },
  ];

  const toggleFAQ = id => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <section className={styles.faqSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map(faq => (
            <div key={faq.id} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFAQ(faq.id)}
              >
                <span>{faq.question}</span>
                <span className={styles.faqIcon}>
                  {openFAQ === faq.id ? '−' : '+'}
                </span>
              </button>
              {openFAQ === faq.id && (
                <div className={styles.faqAnswer}>
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
