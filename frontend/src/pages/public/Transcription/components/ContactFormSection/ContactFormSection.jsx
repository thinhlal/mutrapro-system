// src/pages/TranscriptionPage/components/ContactFormSection/ContactFormSection.jsx
import { useState } from 'react';
import styles from './ContactFormSection.module.css';

const ContactFormSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    instrument: '',
    message: '',
    audioFile: null,
  });

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = e => {
    setFormData(prev => ({
      ...prev,
      audioFile: e.target.files[0],
    }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <section className={styles.contactFormSection}>
      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <h2 className={styles.title}>Get Your Music Transcribed</h2>
          <p className={styles.subtitle}>
            Send us your audio and get professional sheet music
          </p>

          <form className={styles.contactForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="instrument">Primary Instrument</label>
              <select
                id="instrument"
                name="instrument"
                value={formData.instrument}
                onChange={handleInputChange}
                required
              >
                <option value="">Select an instrument</option>
                <option value="piano">Piano</option>
                <option value="guitar">Guitar</option>
                <option value="violin">Violin</option>
                <option value="drums">Drums</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="audioFile">Audio File</label>
              <input
                type="file"
                id="audioFile"
                name="audioFile"
                accept="audio/*"
                onChange={handleFileChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message">Additional Notes</label>
              <textarea
                id="message"
                name="message"
                rows="4"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Any special requirements or notes..."
              ></textarea>
            </div>

            <button type="submit" className={styles.submitBtn}>
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactFormSection;
