// src/pages/ServiceRequest/ServiceRequestPage.jsx
import { useRef, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './ServiceRequestPage.module.css';
import Guitarist from '../../../assets/images/FromSoundToSheet/homeBannerTunescribersTeam.webp';
import Grid from '../../../assets/images/FromSoundToSheet/homeBannerGridVector.webp';
import Wave from '../../../assets/images/FromSoundToSheet/MusicLines.svg';
import Header from '../../../components/common/Header/Header';
import TranscriptionUploader from './components/TranscriptionUploader/TranscriptionUploader'; // dùng cho Transcription
import ArrangementUploader from './components/ArrangementUploader/ArrangementUploader';
import RecordingUploader from './components/RecordingUploader/RecordingUploader';
import RequestServiceForm from '../../../components/common/RequestServiceForm/RequestServiceForm';
import BackToTop from '../../../components/common/BackToTop/BackToTop';
import Footer from '../../../components/common/Footer/Footer';

const STORAGE_KEY = 'serviceRequestFormData';
const STORAGE_KEY_TYPE = 'serviceRequestType';

export default function ServiceRequestPage() {
  const location = useLocation();
  const serviceTypeFromNav = location?.state?.serviceType;

  // Khôi phục từ sessionStorage hoặc dùng giá trị từ navigation
  const [selectedType, setSelectedType] = useState(() => {
    const storedType = sessionStorage.getItem(STORAGE_KEY_TYPE);
    return serviceTypeFromNav || storedType || null;
  });
  const [formData, setFormData] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const uploadRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (serviceTypeFromNav) {
      setSelectedType(serviceTypeFromNav);
      sessionStorage.setItem(STORAGE_KEY_TYPE, serviceTypeFromNav);
    } else {
      // Nếu không có serviceTypeFromNav (vào từ home), clear form data
      // để tránh hiển thị data cũ
      setFormData(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [serviceTypeFromNav]);

  // Lưu selectedType vào sessionStorage khi thay đổi
  useEffect(() => {
    if (selectedType) {
      sessionStorage.setItem(STORAGE_KEY_TYPE, selectedType);
    } else {
      sessionStorage.removeItem(STORAGE_KEY_TYPE);
    }
  }, [selectedType]);

  // Nhận form data từ RequestServiceForm (không submit API)
  const handleFormComplete = useCallback(data => {
    setFormData(data);
    // Lưu vào sessionStorage
    if (data) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <>
      <Header />
      <section className={styles.hero} aria-labelledby="fst-title">
        <img
          src={Grid}
          alt=""
          aria-hidden="true"
          className={styles.grid}
          loading="eager"
        />
        <div className={styles.container}>
          <h1 id="fst-title" className={styles.title}>
            From Sound to Sheet
          </h1>
          <p className={styles.subtitle}>Fast. Accurate. Human.</p>

          <div
            className={styles.ctaPill}
            role="group"
            aria-label="Order transcription"
          >
            <div className={styles.ctaText}>
              <strong>Play it Right!</strong>
              <span>Get your song transcribed by our experts.</span>
            </div>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => {
                const el = document.getElementById('request-service-form');
                if (el)
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Start a Request <span aria-hidden>→</span>
            </button>
          </div>
        </div>

        <div className={styles.visualBand} aria-hidden="true">
          <img src={Wave} alt="" className={styles.waveLeft} />
          <img
            src={Guitarist}
            alt=""
            className={styles.guitarist}
            loading="lazy"
          />
          <img src={Wave} alt="" className={styles.waveRight} />
        </div>
      </section>

      <div className={`${styles.contentGrid} ${selectedType === 'recording' ? styles.recordingLayout : ''}`}>
        <RequestServiceForm
          onFormComplete={handleFormComplete}
          serviceType={selectedType}
          formRef={formRef}
          initialFormData={formData}
        />

        <div ref={uploadRef}>
          {selectedType === 'transcription' && (
            <TranscriptionUploader
              serviceType={selectedType}
              formData={formData}
            />
          )}
          {selectedType === 'arrangement' && (
            <ArrangementUploader
              variant="pure"
              serviceType={selectedType}
              formData={formData}
            />
          )}
          {selectedType === 'arrangement_with_recording' && (
            <ArrangementUploader
              variant="with_recording"
              serviceType={selectedType}
              formData={formData}
            />
          )}
          {/* Recording service is now handled in RequestServiceForm */}
          {!selectedType && (
            <TranscriptionUploader
              serviceType={selectedType}
              formData={formData}
            />
          )}
        </div>
      </div>

      <Footer />
      <BackToTop />
    </>
  );
}
