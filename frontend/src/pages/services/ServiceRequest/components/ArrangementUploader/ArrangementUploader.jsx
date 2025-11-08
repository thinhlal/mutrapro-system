// src/pages/ServiceRequest/components/ArrangementUploader/ArrangementUploader.jsx
import { useState } from 'react';
import { Upload, Space, Tag, Button, message } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './ArrangementUploader.module.css';
const { Dragger } = Upload;

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

export default function ArrangementUploader({ variant = 'pure', serviceType }) {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const beforeUpload = () => false;
  const onChange = ({ fileList }) => {
    const f = fileList?.[0]?.originFileObj || null;
    setFile(f);
  };
  const clearFile = () => setFile(null);

  const onContinue = () => {
    if (!file) {
      message.warning('Please upload your original notation.');
      return;
    }
    const state = {
      sourceType: 'upload',
      fileName: file.name,
      fileType: file.type || 'unknown',
      size: file.size || 0,
      variant, // "pure" | "with_recording"
      serviceType:
        serviceType ||
        (variant === 'with_recording'
          ? 'arrangement_with_recording'
          : 'arrangement'),
    };
    navigate('/arrangement/quote', { state });
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
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
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
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </section>
  );
}
