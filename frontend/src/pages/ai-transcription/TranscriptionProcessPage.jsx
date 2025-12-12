import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Space, Typography, Progress } from 'antd';
import {
  LoadingOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import Lottie from 'lottie-react';
import Embed from 'flat-embed';
import { useKlangTranscriptionStore } from '../../stores/useKlangTranscriptionStore.js';
import Header from '../../components/common/Header/Header.jsx';
import aiAnimation from '../../assets/animations/AI animation.json';
import styles from './TranscriptionProcessPage.module.css';

const { Title, Text } = Typography;

const TranscriptionProcessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const flatHostRef = useRef(null);

  const [flatEmbed, setFlatEmbed] = useState(null);
  const [flatReady, setFlatReady] = useState(false);
  const [flatLoading, setFlatLoading] = useState(false);
  const [showFlatViewer, setShowFlatViewer] = useState(false);
  const [midiLoaded, setMidiLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { jobId, status, error, midiBlob, downloadResult, outputFormats } =
    useKlangTranscriptionStore();

  const file = location.state?.file;

  // Steps for animation
  const steps = [
    { label: 'Uploading audio file...', duration: 2000 },
    { label: 'AI analyzing audio...', duration: 3000 },
    { label: 'Detecting notes...', duration: 3000 },
    { label: 'Creating sheet music...', duration: 2000 },
  ];

  // Simulate step progression based on status
  useEffect(() => {
    if (status === 'CREATING' && currentStep < 1) {
      setCurrentStep(1);
    } else if (status === 'IN_QUEUE' && currentStep < 2) {
      setCurrentStep(2);
    } else if (status === 'IN_PROGRESS' && currentStep < 3) {
      setCurrentStep(3);
    } else if (status === 'COMPLETED' && currentStep < 4) {
      setCurrentStep(4);
    }
  }, [status, currentStep]);

  // Initialize Flat Embed only when user clicks to view
  useEffect(() => {
    if (!flatHostRef.current || !showFlatViewer) return;

    const instance = new Embed(flatHostRef.current, {
      height: '600px',
      embedParams: {
        appId: import.meta.env.VITE_FLAT_APP_ID,
        mode: 'edit',
        controlsPosition: 'top',
        branding: false,
      },
    });

    instance
      .ready()
      .then(() => {
        setFlatEmbed(instance);
        setFlatReady(true);
      })
      .catch(e => console.error('Flat Embed init failed:', e));

    return () => {
      // Cleanup if needed
    };
  }, [showFlatViewer]);

  // Load MIDI into Flat when available
  useEffect(() => {
    if (!midiBlob || !flatEmbed || !flatReady || midiLoaded) return;

    const loadMidiIntoFlat = async () => {
      setFlatLoading(true);
      try {
        const arrayBuffer = await midiBlob.arrayBuffer();
        await flatEmbed.loadMIDI(arrayBuffer);
        console.log('MIDI loaded into Flat successfully');
        setMidiLoaded(true);
      } catch (err) {
        console.error('Failed to load MIDI into Flat:', err);
      } finally {
        setFlatLoading(false);
      }
    };

    loadMidiIntoFlat();
  }, [midiBlob, flatEmbed, flatReady, midiLoaded]);

  const handleViewSheetMusic = () => {
    setShowFlatViewer(true);
  };

  const handleBackToUpload = () => {
    navigate('/ai-transcription');
  };

  const isProcessing =
    status === 'CREATING' || status === 'IN_QUEUE' || status === 'IN_PROGRESS';
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  const progressPercent = (currentStep / steps.length) * 100;

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Card className={styles.mainCard} bordered={false}>
          {/* Back Button */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToUpload}
            className={styles.backButton}
            type="text"
          >
            Back
          </Button>

          {/* File Info */}
          {file && (
            <div className={styles.fileInfoHeader}>
              <Text className={styles.fileInfoText}>
                Processing: <strong>{file.name}</strong>
              </Text>
            </div>
          )}

          {/* Processing Animation */}
          {isProcessing && (
            <div className={styles.processingSection}>
              {/* Lottie Animation */}
              <div className={styles.lottieContainer}>
                <Lottie
                  animationData={aiAnimation}
                  loop={true}
                  className={styles.lottieAnimation}
                />
              </div>

              <Title
                level={2}
                className={styles.processingTitle}
                key={currentStep}
              >
                {steps[currentStep]?.label || 'Processing'}
              </Title>

              <div className={styles.progressSection}>
                <Progress
                  percent={progressPercent}
                  strokeColor={{
                    '0%': '#6366f1',
                    '100%': '#8b5cf6',
                  }}
                  showInfo={false}
                  className={styles.progressBar}
                />
              </div>

              {/* Steps List */}
              <div className={styles.stepsList}>
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`${styles.stepItem} ${
                      index < currentStep ? styles.stepCompleted : ''
                    } ${index === currentStep ? styles.stepActive : ''}`}
                  >
                    <Text className={styles.stepLabel}>{step.label}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {isCompleted && (
            <div className={styles.completedSection}>
              <Title level={2} className={styles.completedTitle}>
                Transcription Complete!
              </Title>
              <Text className={styles.completedText}>
                AI has finished analyzing your audio file and created your sheet
                music
              </Text>

              <Space className={styles.actionButtons} size="large">
                {/* <Button
                  type="primary"
                  size="medium"
                  onClick={handleViewSheetMusic}
                  disabled={showFlatViewer}
                  className={styles.viewButton}
                >
                  {showFlatViewer ? ' Sheet Music Opened' : ' View Sheet Music'}
                </Button> */}
                {outputFormats?.map(format => {
                  const isMidi = format === 'midi';
                  const label =
                    format === 'pdf'
                      ? 'Download PDF'
                      : format === 'midi'
                        ? 'Download MIDI'
                        : `Download ${format.toUpperCase()}`;

                  return (
                    <Button
                      key={format}
                      size="large"
                      icon={<DownloadOutlined />}
                      onClick={() => downloadResult(format)}
                      disabled={isMidi && !midiBlob}
                      className={styles.downloadButton}
                    >
                      {label}
                    </Button>
                  );
                })}
              </Space>

              {/* Job ID */}
              {/* <div className={styles.jobIdSection}>
                <Text type="secondary">Job ID: </Text>
                <Text code>{jobId}</Text>
              </div> */}
            </div>
          )}

          {/* Error Section */}
          {isFailed && (
            <div className={styles.errorSection}>
              {/* <div className={styles.errorIcon}>❌</div> */}
              <Title level={2} className={styles.errorTitle}>
                An Error Occurred
              </Title>
              <Text className={styles.errorText}>
                {error || 'Unable to process audio file. Please try again.'}
              </Text>
              <Button
                type="primary"
                size="large"
                onClick={handleBackToUpload}
                className={styles.retryButton}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Sheet Music Viewer */}
          {isCompleted && midiBlob && showFlatViewer && (
            <div className={styles.sheetMusicSection}>
              {/* <div className={styles.sheetMusicTitle}>
                <span className={styles.sheetMusicIcon}>🎼</span>
                Your Sheet Music
              </div> */}
              <div className={styles.flatContainer}>
                {(flatLoading || !flatReady) && (
                  <div className={styles.flatLoading}>
                    <LoadingOutlined
                      style={{ fontSize: 32, marginRight: 12 }}
                    />
                    {!flatReady
                      ? 'Initializing editor...'
                      : 'Loading sheet music...'}
                  </div>
                )}
                <div
                  ref={flatHostRef}
                  className={styles.flatEmbed}
                  style={{
                    display: flatLoading || !flatReady ? 'none' : 'block',
                  }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default TranscriptionProcessPage;
