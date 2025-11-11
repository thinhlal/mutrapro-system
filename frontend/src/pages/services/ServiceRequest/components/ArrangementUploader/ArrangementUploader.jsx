// src/pages/ServiceRequest/components/ArrangementUploader/ArrangementUploader.jsx
import { useState, useCallback } from 'react';
import { Upload, Space, Tag, Button, message, InputNumber } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './ArrangementUploader.module.css';
import { getMediaDurationSec } from '../../../../../utils/getMediaDuration';
import { createServiceRequest } from '../../../../../services/serviceRequestService';
const { Dragger } = Upload;

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

export default function ArrangementUploader({ variant = 'pure', serviceType, formData }) {
  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState('');
  const [detectedDurationMinutes, setDetectedDurationMinutes] = useState(0);
  const [adjustedDurationMinutes, setAdjustedDurationMinutes] = useState(3); // Default 3 for non-audio
  const [isAudioFile, setIsAudioFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const beforeUpload = useCallback(() => false, []);
  
  const onChange = async ({ fileList }) => {
    const f = fileList?.[0]?.originFileObj || null;
    if (!f) {
      clearFile();
      return;
    }
    
    setFile(f);
    
    // Check if it's audio/video file
    const isAudio = f.type?.startsWith('audio/') || f.type?.startsWith('video/');
    setIsAudioFile(isAudio);
    
    if (isAudio) {
      const url = URL.createObjectURL(f);
      setBlobUrl(url);
      
      try {
        const sec = await getMediaDurationSec(f);
        const minutes = parseFloat((sec / 60).toFixed(2));
        setDetectedDurationMinutes(minutes);
        setAdjustedDurationMinutes(minutes);
      } catch {
        setDetectedDurationMinutes(0);
        setAdjustedDurationMinutes(3);
      }
    } else {
      // For non-audio files (MIDI, PDF, XML), default to 3 minutes
      setDetectedDurationMinutes(0);
      setAdjustedDurationMinutes(3);
    }
  };
  
  const clearFile = () => {
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }
    setFile(null);
    setBlobUrl('');
    setDetectedDurationMinutes(0);
    setAdjustedDurationMinutes(3);
    setIsAudioFile(false);
  };

  const handleDurationChange = (value) => {
    if (value && value > 0) {
      setAdjustedDurationMinutes(parseFloat(value));
    }
  };

  const handleSubmit = () => {
    if (!file) {
      message.warning('Please upload your original notation.');
      return;
    }

    // Validate form data
    if (!formData || !formData.title || !formData.contactName) {
      message.warning('Please fill in the form above before submitting.');
      return;
    }

    // Validate instruments
    if (!formData.instrumentIds || formData.instrumentIds.length === 0) {
      message.warning('Please select at least one instrument.');
      return;
    }

    // Validate duration
    if (adjustedDurationMinutes <= 0) {
      message.warning('Please set a valid duration.');
      return;
    }

    const actualServiceType = serviceType || (variant === 'with_recording' ? 'arrangement_with_recording' : 'arrangement');

    // Navigate to quote page with state
    navigate('/services/quotes/arrangement', {
      state: {
        formData: {
          ...formData,
          durationMinutes: adjustedDurationMinutes,
        },
        uploadedFile: file,
        blobUrl: blobUrl,
        fileName: file.name,
        serviceType: actualServiceType,
        variant: variant,
      },
    });
  };

  const toMMSS = (s = 0) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <section
      id="arrangement-uploader"
      className={styles.wrapper}
      aria-labelledby="arr-title"
    >
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.iconBadge} aria-hidden>
            <span className={styles.musicIcon}>♪</span>
          </div>
          <div className={styles.headings}>
            <h2 id="arr-title" className={styles.title}>
              {variant === 'with_recording'
                ? 'Arrangement + Recording'
                : 'Arrangement Uploader'}
            </h2>
            <p className={styles.desc}>
              Upload your original notation (MusicXML/MIDI/PDF). We’ll arrange
              and deliver for review.
            </p>
          </div>
        </div>

        <div className={styles.dragRow}>
          <Dragger
            name="file"
            multiple={false}
            beforeUpload={beforeUpload}
            accept=".musicxml,.xml,.midi,.mid,.pdf"
            className={styles.dragger}
            itemRender={() => null}
            onChange={onChange}
            disabled={!!file}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Drag & drop your notation here</p>
            <p className="ant-upload-hint">MusicXML / MIDI / PDF</p>
          </Dragger>
        </div>

        {file && (
          <div className={styles.selectedBox} role="status" aria-live="polite">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div className={styles.fileLine}>
                <Space wrap>
                  <FileTextOutlined />
                  <b>{file.name}</b>
                  <Tag>{file.type || 'unknown'}</Tag>
                  <span>{toSize(file.size)}</span>
                </Space>
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={clearFile}
                  danger
                  type="text"
                >
                  Remove
                </Button>
              </div>

              {/* Audio Player */}
              {isAudioFile && blobUrl && (
                <div style={{ marginTop: 16 }}>
                  <audio
                    controls
                    src={blobUrl}
                    style={{ width: '100%' }}
                    aria-label="Audio preview"
                  />
                </div>
              )}

              {/* Duration Adjustment */}
              <div style={{ padding: '16px 0', marginTop: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 8 }} />
                  <span style={{ fontWeight: 600 }}>Adjust Duration (Minutes):</span>
                  {isAudioFile && detectedDurationMinutes > 0 && (
                    <Tag color="cyan" style={{ marginLeft: 8 }}>
                      Detected: {detectedDurationMinutes} min (~ {toMMSS(Math.round(detectedDurationMinutes * 60))})
                    </Tag>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Button
                    icon={<MinusOutlined />}
                    onClick={() => handleDurationChange(Math.max(0.01, adjustedDurationMinutes - 0.01))}
                    disabled={adjustedDurationMinutes <= 0.01}
                  >
                    -0.01
                  </Button>
                  
                  <InputNumber
                    min={0.01}
                    max={999}
                    step={0.01}
                    value={adjustedDurationMinutes}
                    onChange={handleDurationChange}
                    precision={2}
                    style={{ width: 120 }}
                    addonAfter="min"
                  />
                  
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => handleDurationChange(adjustedDurationMinutes + 0.01)}
                  >
                    +0.01
                  </Button>
                  
                  {isAudioFile && detectedDurationMinutes > 0 && (
                    <Button
                      type="link"
                      onClick={() => setAdjustedDurationMinutes(detectedDurationMinutes)}
                    >
                      Reset to {detectedDurationMinutes} min
                    </Button>
                  )}
                </div>
                
                <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                  Hiện tại: {adjustedDurationMinutes} phút (~ {toMMSS(Math.round(adjustedDurationMinutes * 60))})
                </div>
                
                <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
                  💡 {isAudioFile ? 'Adjust the detected duration' : 'Estimate the duration'} for billing purposes
                </div>
              </div>
            </Space>
          </div>
        )}

        <div className={styles.actionRow}>
          <Button
            type="primary"
            size="large"
            className={styles.ctaBtn}
            onClick={handleSubmit}
            loading={submitting}
            disabled={!file || !formData || adjustedDurationMinutes <= 0}
          >
            Submit Request <ArrowRightOutlined />
          </Button>
        </div>
      </div>
    </section>
  );
}
