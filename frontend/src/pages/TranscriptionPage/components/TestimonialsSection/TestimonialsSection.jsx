// src/pages/TranscriptionPage/components/TestimonialsSection/TestimonialsSection.jsx
import styles from "./TestimonialsSection.module.css";

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      name: "John Smith",
      role: "Professional Musician",
      content: "Excellent quality transcriptions. Very accurate and delivered on time!",
      rating: 5
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "Music Teacher",
      content: "Perfect for creating sheet music for my students. Highly recommended!",
      rating: 5
    },
    {
      id: 3,
      name: "Mike Chen",
      role: "Composer",
      content: "Outstanding service. The team really understands music notation.",
      rating: 5
    }
  ];

  return (
    <section className={styles.testimonialsSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>What Our Customers Say</h2>
        <div className={styles.testimonialsGrid}>
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className={styles.testimonialCard}>
              <div className={styles.rating}>
                {"⭐".repeat(testimonial.rating)}
              </div>
              <p className={styles.content}>"{testimonial.content}"</p>
              <div className={styles.author}>
                <h4 className={styles.name}>{testimonial.name}</h4>
                <span className={styles.role}>{testimonial.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
