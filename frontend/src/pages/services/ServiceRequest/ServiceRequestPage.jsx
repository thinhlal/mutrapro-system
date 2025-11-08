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

export default function ServiceRequestPage() {
  const location = useLocation();
  const serviceTypeFromNav = location?.state?.serviceType;

  const [selectedType, setSelectedType] = useState(serviceTypeFromNav || null); // transcription | arrangement | arrangement_with_recording | recording
  const uploadRef = useRef(null);

  useEffect(() => {
    if (serviceTypeFromNav) {
      setSelectedType(serviceTypeFromNav);
    }
  }, [serviceTypeFromNav]);

  const handleCreated = useCallback(type => {
    setSelectedType(type);
    // scroll tới khu vực upload sau khi tạo yêu cầu
    requestAnimationFrame(() => {
      const el = uploadRef.current || document.getElementById('quote-uploader');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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

      <div className={styles.contentGrid}>
        <RequestServiceForm
          onCreated={handleCreated}
          serviceType={selectedType}
        />

        <div ref={uploadRef}>
          {selectedType === 'transcription' && (
            <TranscriptionUploader serviceType={selectedType} />
          )}
          {selectedType === 'arrangement' && (
            <ArrangementUploader variant="pure" serviceType={selectedType} />
          )}
          {selectedType === 'arrangement_with_recording' && (
            <ArrangementUploader
              variant="with_recording"
              serviceType={selectedType}
            />
          )}
          {selectedType === 'recording' && (
            <RecordingUploader serviceType={selectedType} />
          )}

          {!selectedType && (
            <TranscriptionUploader serviceType={selectedType} />
          )}
        </div>
      </div>

      <Footer />
      <BackToTop />
    </>
  );
}
