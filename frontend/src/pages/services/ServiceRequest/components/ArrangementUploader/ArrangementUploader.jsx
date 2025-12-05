// src/pages/ServiceRequest/components/ArrangementUploader/ArrangementUploader.jsx
import { useState, useCallback } from 'react';
import { Upload, Space, Tag, Button, message } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './ArrangementUploader.module.css';
const { Dragger } = Upload;

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

export default function ArrangementUploader({
  variant = 'pure',
  serviceType,
  formData,
}) {
  const [file, setFile] = useState(null);
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
    // Arrangement only accepts notation files (MusicXML/MIDI/PDF), not audio
  };

  const clearFile = () => {
    setFile(null);
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

    // Duration only needed for transcription
    const actualServiceType =
      serviceType ||
      (variant === 'with_recording'
        ? 'arrangement_with_recording'
        : 'arrangement');

    // Navigate to quote page with state
    navigate('/services/quotes/arrangement', {
      state: {
        formData: {
          ...formData,
        },
        uploadedFile: file,
        fileName: file.name,
        fileType: file.type || 'unknown',
        size: file.size || 0,
        serviceType: actualServiceType,
        variant: variant,
      },
    });
  };

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
              {variant === 'with_recording'
                ? "Upload your original notation (MusicXML/MIDI/PDF). We'll arrange and record it for you."
                : "Upload your original notation (MusicXML/MIDI/PDF). We'll arrange it and deliver for review."}
            </p>
          </div>
        </div>

        {!file && (
          <div className={styles.dragRow}>
            <Dragger
              name="file"
              multiple={false}
              beforeUpload={beforeUpload}
              accept=".musicxml,.xml,.midi,.mid,.pdf"
              className={styles.dragger}
              itemRender={() => null}
              onChange={onChange}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Drag & drop your notation here</p>
              <p className="ant-upload-hint">MusicXML / MIDI / PDF</p>
            </Dragger>
          </div>
        )}

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
            disabled={!file || !formData}
          >
            Submit Request <ArrowRightOutlined />
          </Button>
        </div>
      </div>
    </section>
  );
}
