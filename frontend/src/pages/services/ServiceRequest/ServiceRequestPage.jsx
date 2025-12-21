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
import ArrangementWithRecordingUploader from './components/ArrangementWithRecordingUploader/ArrangementWithRecordingUploader';
import RequestServiceForm from '../../../components/common/RequestServiceForm/RequestServiceForm';
import BackToTop from '../../../components/common/BackToTop/BackToTop';
import Footer from '../../../components/common/Footer/Footer';

const STORAGE_KEY = 'serviceRequestFormData';
const STORAGE_TYPE_KEY = 'serviceRequestType';

export default function ServiceRequestPage() {
  const location = useLocation();
  const serviceTypeFromNav = location?.state?.serviceType;

  // Restore from sessionStorage on mount
  const [selectedType, setSelectedType] = useState(() => {
    // Priority: location state > sessionStorage > null
    if (serviceTypeFromNav) {
      return serviceTypeFromNav;
    }
    try {
      const storedType = sessionStorage.getItem(STORAGE_TYPE_KEY);
      return storedType || null;
    } catch {
      return null;
    }
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

  // Save to sessionStorage whenever formData or selectedType changes
  useEffect(() => {
    if (formData) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error('Error saving formData to sessionStorage:', error);
      }
    }
  }, [formData]);

  useEffect(() => {
    if (selectedType) {
      try {
        sessionStorage.setItem(STORAGE_TYPE_KEY, selectedType);
      } catch (error) {
        console.error('Error saving selectedType to sessionStorage:', error);
      }
    }
  }, [selectedType]);

  // Restore formData when component mounts or when returning from navigation
  useEffect(() => {
    const restoreFormData = () => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setFormData(prevFormData => {
            // Only update if formData is null or different
            if (!prevFormData) {
              return parsed;
            }
            const currentStr = JSON.stringify(prevFormData);
            const storedStr = JSON.stringify(parsed);
            if (currentStr !== storedStr) {
              return parsed;
            }
            return prevFormData; // No change needed
          });
        }
      } catch (error) {
        console.error('Error restoring formData from sessionStorage:', error);
      }
    };

    // Restore on mount
    restoreFormData();

    // Listen for popstate (back/forward navigation)
    const handlePopState = () => {
      // Small delay to ensure sessionStorage is updated
      setTimeout(restoreFormData, 100);
    };

    window.addEventListener('popstate', handlePopState);

    // Also restore when pathname changes (e.g., returning from navigation)
    const timeoutId = setTimeout(restoreFormData, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname]); // Run when pathname changes

  useEffect(() => {
    if (serviceTypeFromNav) {
      setSelectedType(serviceTypeFromNav);
    } else {
      // Nếu không có serviceTypeFromNav (vào từ home), reset về null
      // Nhưng chỉ reset nếu không có dữ liệu trong sessionStorage
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        const storedType = sessionStorage.getItem(STORAGE_TYPE_KEY);
        if (!stored && !storedType) {
          setFormData(null);
          setSelectedType(null);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_TYPE_KEY);
        } else if (storedType && !selectedType) {
          // Restore selectedType from sessionStorage if not set
          setSelectedType(storedType);
        }
      } catch {
        setFormData(null);
        setSelectedType(null);
      }
    }
  }, [serviceTypeFromNav, selectedType]);

  // Nhận form data từ RequestServiceForm (không submit API)
  const handleFormComplete = useCallback(data => {
    setFormData(data);
    // Also save to sessionStorage immediately
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving formData to sessionStorage:', error);
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
            {(() => {
              const titleMap = {
                transcription: 'From Sound to Sheet',
                arrangement: 'Arrangement Service',
                arrangement_with_recording: 'Arrangement + Recording',
              };
              return titleMap[selectedType] || 'From Sound to Sheet';
            })()}
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
              onFormDataChange={handleFormComplete}
            />
          )}
          {selectedType === 'arrangement' && (
            <ArrangementUploader
              variant="pure"
              serviceType={selectedType}
              formData={formData}
              onFormDataChange={handleFormComplete}
            />
          )}
          {selectedType === 'arrangement_with_recording' && (
            <ArrangementWithRecordingUploader
              serviceType={selectedType}
              formData={formData}
              onFormDataChange={handleFormComplete}
            />
          )}
          {!selectedType && (
            <TranscriptionUploader
              serviceType={selectedType}
              formData={formData}
              onFormDataChange={handleFormComplete}
            />
          )}
        </div>
      </div>

      <Footer />
      <BackToTop />
    </>
  );
}
