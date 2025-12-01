// src/pages/ServiceRequest/components/RecordingUploader/RecordingUploader.jsx
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
import styles from './RecordingUploader.module.css';
import { getMediaDurationSec } from '../../../../../utils/getMediaDuration';
import { createServiceRequest } from '../../../../../services/serviceRequestService';
import { formatDurationMMSS } from '../../../../../utils/timeUtils';
const { Dragger } = Upload;

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

export default function RecordingUploader({ serviceType, formData }) {
  const [files, setFiles] = useState([]);
  const [detectedDurationMinutes, setDetectedDurationMinutes] = useState(0);
  const [adjustedDurationMinutes, setAdjustedDurationMinutes] = useState(5); // Default 5 minutes for recording
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const beforeUpload = useCallback(() => false, []);

  const onChange = async ({ fileList }) => {
    const fileObjs = fileList.map(it => it.originFileObj).filter(Boolean);
    setFiles(fileObjs);

    // If has audio files, try to detect duration from first file
    if (fileObjs.length > 0 && fileObjs[0].type?.startsWith('audio/')) {
      try {
        const sec = await getMediaDurationSec(fileObjs[0]);
        const minutes = parseFloat((sec / 60).toFixed(2));
        setDetectedDurationMinutes(minutes);
        setAdjustedDurationMinutes(minutes);
      } catch {
        setDetectedDurationMinutes(0);
      }
    }
  };

  const clearAll = () => {
    setFiles([]);
    setDetectedDurationMinutes(0);
    setAdjustedDurationMinutes(5);
  };

  const handleDurationChange = value => {
    if (value && value > 0) {
      setAdjustedDurationMinutes(parseFloat(value));
    }
  };

  const handleSubmit = () => {
    // Validate form data
    if (!formData || !formData.title || !formData.contactName) {
      message.warning('Please fill in the form above before submitting.');
      return;
    }

    // Validate booking date and time for recording
    if (!formData.bookingDate || !formData.bookingStartTime || !formData.bookingEndTime) {
      message.warning('Please select booking date and time.');
      return;
    }

    // Note: Recording service doesn't require instruments, files are optional
    // Duration is calculated from booking time range

    // Navigate to quote page with state
    navigate('/services/quotes/recording', {
      state: {
        formData: {
          ...formData,
          // Calculate duration from booking time range
          durationMinutes: formData.bookingStartTime && formData.bookingEndTime
            ? calculateDurationMinutes(formData.bookingStartTime, formData.bookingEndTime)
            : adjustedDurationMinutes,
        },
        uploadedFiles: files,
        serviceType: serviceType || 'recording',
      },
    });
  };

  const calculateDurationMinutes = (startTime, endTime) => {
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;
      return endTotal - startTotal;
    } catch {
      return adjustedDurationMinutes;
    }
  };

  return (
    <section
      id="recording-uploader"
      className={styles.wrapper}
      aria-labelledby="rec-title"
    >
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.iconBadge} aria-hidden>
            <span className={styles.musicIcon}>♪</span>
          </div>
          <div className={styles.headings}>
            <h2 id="rec-title" className={styles.title}>
              Recording: Reference Uploads (Optional)
            </h2>
            <p className={styles.desc}>
              You may upload lyrics / guide audio / notation to help the session
              run smoothly. Please ensure you have filled in the booking date and time in the form above.
            </p>
          </div>
        </div>

        {files.length === 0 && (
          <div className={styles.dragRow}>
            <Dragger
              name="files"
              multiple
              beforeUpload={beforeUpload}
              accept="audio/*,video/*,.midi,.mid,.musicxml,.xml,.pdf,.txt"
              className={styles.dragger}
              itemRender={() => null}
              onChange={onChange}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Drag & drop optional references</p>
              <p className="ant-upload-hint">Lyrics / guide audio / notation</p>
            </Dragger>
          </div>
        )}

        {files.length > 0 && (
          <div className={styles.selectedBox} role="status" aria-live="polite">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {files.map((f, idx) => (
                <div className={styles.fileLine} key={idx}>
                  <Space wrap>
                    <FileTextOutlined />
                    <b>{f.name}</b>
                    <Tag>{f.type || 'unknown'}</Tag>
                    <span>{toSize(f.size)}</span>
                  </Space>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={clearAll}
                  danger
                  type="text"
                >
                  Remove all
                </Button>
              </div>
            </Space>
          </div>
        )}

        {/* Booking Information Display */}
        {formData?.bookingDate && formData?.bookingStartTime && formData?.bookingEndTime && (
          <div className={styles.selectedBox} style={{ marginTop: 16 }}>
            <div style={{ padding: '16px 0' }}>
              <div style={{ marginBottom: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                <span style={{ fontWeight: 600 }}>Booking Information:</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', marginRight: 8 }}>
                  Date: {formData.bookingDate}
                </Tag>
                <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                  Time: {formData.bookingStartTime} - {formData.bookingEndTime}
                </Tag>
              </div>
              {formData.vocalistId && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="purple" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Vocalist Selected
                  </Tag>
                </div>
              )}
              {formData.instrumentalistIds && formData.instrumentalistIds.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {formData.instrumentalistIds.length} Instrumentalist(s) Selected
                  </Tag>
                </div>
              )}
              {formData.equipmentIds && formData.equipmentIds.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {formData.equipmentIds.length} Equipment(s) Selected
                  </Tag>
                </div>
              )}
              {formData.externalGuestCount > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
                    External Guests: {formData.externalGuestCount}
                  </Tag>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.actionRow}>
          <Button
            type="primary"
            size="large"
            className={styles.ctaBtn}
            onClick={handleSubmit}
            loading={submitting}
            disabled={
              !formData ||
              !formData.bookingDate ||
              !formData.bookingStartTime ||
              !formData.bookingEndTime
            }
          >
            Submit Request <ArrowRightOutlined />
          </Button>
        </div>
      </div>
    </section>
  );
}
