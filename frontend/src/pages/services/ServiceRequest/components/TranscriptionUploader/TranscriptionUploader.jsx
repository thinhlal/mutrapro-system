import { useState, useCallback } from 'react';
import { Upload, Button, Tooltip, Tag, Space, InputNumber, Alert } from 'antd';
import {
  InboxOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './TranscriptionUploader.module.css';
import { getMediaDurationSec } from '../../../../../utils/getMediaDuration';
import { createServiceRequest } from '../../../../../services/serviceRequestService';

const { Dragger } = Upload;

const toMMSS = (s = 0) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(
    2,
    '0'
  )}`;
const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

export default function TranscriptionUploader({ serviceType, formData }) {
  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState('');
  const [detectedDurationMinutes, setDetectedDurationMinutes] = useState(0);
  const [adjustedDurationMinutes, setAdjustedDurationMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  const beforeUpload = useCallback(() => false, []);

  const onDraggerChange = async ({ fileList }) => {
    const f = fileList?.[0]?.originFileObj || null;
    if (!f) {
      clearFile();
      return;
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setBlobUrl(url);

    // Đo duration và set mặc định
    try {
      const sec = await getMediaDurationSec(f);
      const minutes = parseFloat((sec / 60).toFixed(2)); // Làm tròn 2 chữ số sau dấu phẩy
      setDetectedDurationMinutes(minutes);
      setAdjustedDurationMinutes(minutes); // Mặc định = detected duration
    } catch {
      setDetectedDurationMinutes(0);
      setAdjustedDurationMinutes(0);
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
    setAdjustedDurationMinutes(0);
  };

  const handleDurationChange = value => {
    if (value != null && value > 0) {
      // Cho phép số thập phân với 2 chữ số sau dấu phẩy
      const roundedValue = parseFloat(Number(value).toFixed(2));
      setAdjustedDurationMinutes(roundedValue);
    }
  };

  const handleSubmit = () => {
    // Clear error message trước khi validation
    setErrorMessage(null);

    if (!file) {
      setErrorMessage('Vui lòng tải lên file audio.');
      return;
    }

    // Validate form data
    if (!formData || !formData.title || !formData.contactName) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin form phía trên.');
      return;
    }

    // Validate instruments - transcription chỉ chọn được 1 nhạc cụ
    const instrumentIds = formData.instrumentIds;
    const isInstrumentIdsValid =
      instrumentIds !== undefined &&
      instrumentIds !== null &&
      Array.isArray(instrumentIds) &&
      instrumentIds.length === 1;

    if (!isInstrumentIdsValid) {
      setErrorMessage('Please choose a musical instrument.');
      // Scroll to error message
      setTimeout(() => {
        const errorElement = document.getElementById(
          'transcription-error-alert'
        );
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Validate duration - phải là số dương
    if (!adjustedDurationMinutes || adjustedDurationMinutes <= 0) {
      setErrorMessage('Vui lòng nhập thời lượng hợp lệ (phút).');
      return;
    }

    // Navigate to quote page with state
    navigate('/services/quotes/transcription', {
      state: {
        formData: {
          ...formData,
          durationMinutes: adjustedDurationMinutes,
        },
        uploadedFile: file,
        blobUrl: blobUrl,
        fileName: file.name,
        serviceType: serviceType || 'transcription',
      },
    });
  };

  return (
    <section
      id="quote-uploader"
      className={styles.wrapper}
      aria-labelledby="quote-title"
    >
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.iconBadge} aria-hidden>
            <span className={styles.musicIcon}>♪</span>
          </div>
          <div className={styles.headings}>
            <h2 id="quote-title" className={styles.title}>
              Sheet Music Transcription
            </h2>
            <p className={styles.desc}>
              We convert your song into precise sheet music for your chosen
              instruments.
            </p>
          </div>
        </div>

        <p className={styles.supportText}>
          We support multiple platforms like Soundcloud, Spotify, YouTube, etc.
        </p>

        {/* <Input
          size="large"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          placeholder="Paste your link here..."
          prefix={<LinkOutlined />}
          className={styles.linkInput}
          aria-label="Paste music link"
          disabled={!!file} 
        /> */}

        {!file && (
          <div className={styles.dragRow}>
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={beforeUpload}
              accept="audio/*,video/*,.midi,.mid,.musicxml,.xml"
              className={styles.dragger}
              itemRender={() => null}
              onChange={onDraggerChange}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Drag & drop your music files to upload
              </p>
              <p className="ant-upload-hint">or click to browse</p>
            </Dragger>
          </div>
        )}

        {/* Hiển thị file đã chọn */}
        {file && (
          <div className={styles.selectedBox} role="status" aria-live="polite">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div className={styles.fileLine}>
                <Space wrap>
                  <FileTextOutlined />
                  <b>{file.name}</b>
                  <Tag>{file.type || 'unknown'}</Tag>
                  <span>{toSize(file.size)}</span>
                  <span>
                    • Detected Duration: {detectedDurationMinutes} minutes (~{' '}
                    {toMMSS(Math.round(detectedDurationMinutes * 60))})
                  </span>
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
              {blobUrl &&
                (file.type?.startsWith('audio/') ||
                  file.type?.startsWith('video/')) && (
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
              {/* {detectedDurationMinutes > 0 && (
                <div style={{ padding: '16px 0', marginTop: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    <span style={{ fontWeight: 600 }}>
                      Adjust Duration (Minutes):
                    </span>
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <Button
                      icon={<MinusOutlined />}
                      onClick={() =>
                        handleDurationChange(
                          Math.max(0.01, adjustedDurationMinutes - 0.01)
                        )
                      }
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
                      onClick={() =>
                        handleDurationChange(adjustedDurationMinutes + 0.01)
                      }
                    >
                      +0.01
                    </Button>

                    <Button
                      type="link"
                      onClick={() =>
                        setAdjustedDurationMinutes(detectedDurationMinutes)
                      }
                    >
                      Reset to {detectedDurationMinutes} min
                    </Button>
                  </div>

                  <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
                    💡 Điều chỉnh thời lượng để tính giá (phát hiện:{' '}
                    {detectedDurationMinutes} phút ~{' '}
                    {toMMSS(Math.round(detectedDurationMinutes * 60))}). Cho
                    phép số thập phân 2 chữ số.
                  </div>
                  <div style={{ marginTop: 4, color: '#888', fontSize: 12 }}>
                    Hiện tại: {adjustedDurationMinutes} phút (~{' '}
                    {toMMSS(Math.round(adjustedDurationMinutes * 60))})
                  </div>
                </div>
              )} */}
            </Space>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert
            id="transcription-error-alert"
            message={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <div className={styles.actionRow}>
          <Tooltip title="Submit your transcription request" zIndex={0}>
            <Button
              type="primary"
              size="large"
              className={styles.ctaBtn}
              onClick={handleSubmit}
              htmlType="button"
              loading={submitting}
              disabled={!file || !formData || adjustedDurationMinutes <= 0}
            >
              Submit Request <ArrowRightOutlined />
            </Button>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}
