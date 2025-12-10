import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Upload, Button, Select, Typography } from 'antd';
import { UploadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { KLANG_MODELS } from '../../config/klangConfig.js';
import { useKlangTranscriptionStore } from '../../stores/useKlangTranscriptionStore.js';
import Header from '../../components/common/Header/Header.jsx';
import IntroSection from './components/IntroSection.jsx';
import styles from './KlangTranscriptionPanel.module.css';
import BackToTop from '../../components/common/BackToTop/BackToTop.jsx';

const { Text } = Typography;

const KlangTranscriptionPanel = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outputFormat, setOutputFormat] = useState('midi');

  const { model, setModel, createTranscription, reset, setOutputFormats } =
    useKlangTranscriptionStore();

  const handleBeforeUpload = file => {
    setFile(file);
    reset();
    return false; // Don't upload to server, keep in state
  };

  const handleOutputChange = value => {
    setOutputFormat(value);
    setOutputFormats([value]);
  };

  const handleTranscribe = async () => {
    if (!file) {
      alert('Please select an audio file first!');
      return;
    }

    try {
      setIsSubmitting(true);
      // ensure store has current output format
      setOutputFormats([outputFormat]);

      // Start transcription
      await createTranscription(file);

      // Navigate to process page
      navigate('/ai-transcription/process', { state: { file } });
    } catch (error) {
      console.error('Transcription error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <BackToTop />
      <div className={styles.container}>
        {/* Intro Section */}
        <IntroSection />

        <Card className={styles.mainCard} bordered={false}>
          <div className={styles.cardContent}>
            {/* Step 1: Select Model */}
            <div className={styles.stepSection}>
              <div className={styles.stepTitle}>
                <span className={styles.stepNumber}>1</span>
                Select Instrument Type
              </div>
              <Select
                className={styles.modelSelect}
                size="large"
                value={model}
                onChange={setModel}
                options={KLANG_MODELS}
              />
              <div className={styles.stepDescription}>
                <Text type="secondary">
                  AI will automatically detect and analyze the instrument from
                  your audio file
                </Text>
              </div>
            </div>

            {/* Step 2: Upload Audio File */}
            <div className={styles.stepSection}>
              <div className={styles.stepTitle}>
                <span className={styles.stepNumber}>2</span>
                Upload Audio File
              </div>
              <div className={styles.uploadArea}>
                <Upload
                  beforeUpload={handleBeforeUpload}
                  maxCount={1}
                  accept="audio/*"
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />} size="large">
                    Choose Audio File
                  </Button>
                </Upload>
              </div>
              {file && (
                <div className={styles.fileInfo}>
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileSize}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              )}
              <div className={styles.stepDescription}>
                <Text type="secondary">
                  Free plan supports audio files ≤ 15 seconds
                </Text>
              </div>
            </div>

            {/* Step 3: Choose Output Format */}
            <div className={styles.stepSection}>
              <div className={styles.stepTitle}>
                <span className={styles.stepNumber}>3</span>
                Choose Output Format
              </div>
              <Select
                className={styles.modelSelect}
                size="large"
                value={outputFormat}
                onChange={handleOutputChange}
                options={[
                  { label: 'MIDI (.mid)', value: 'midi' },
                  { label: 'PDF (.pdf)', value: 'pdf' },
                ]}
              />
              <div className={styles.stepDescription}>
                <Text type="secondary">
                  Free plan may only return one format per job; choose the one
                  you need.
                </Text>
              </div>
            </div>

            {/* Step 3: Start Transcription */}
            <div className={styles.stepSection}>
              <div className={styles.stepTitle}>
                <span className={styles.stepNumber}>4</span>
                Start Transcription
              </div>
              <Button
                className={styles.transcribeButton}
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleTranscribe}
                disabled={!file || isSubmitting}
                loading={isSubmitting}
                size="large"
                block
              >
                {isSubmitting ? 'Processing...' : 'Transcribe Now'}
              </Button>
              {isSubmitting && (
                <div className={styles.submittingHint}>
                  <Text type="secondary" className={styles.submittingText}>
                    Preparing to switch to processing page...
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default KlangTranscriptionPanel;
