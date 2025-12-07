// src/pages/ServiceRequest/components/ArrangementUploader/ArrangementUploader.jsx
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Upload, Space, Tag, Button, message, Form, Select, Row, Col } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './ArrangementUploader.module.css';
import { useInstrumentStore } from '../../../../../stores/useInstrumentStore';
import InstrumentSelectionModal from '../../../../../components/modal/InstrumentSelectionModal/InstrumentSelectionModal';
import { MUSIC_GENRES, MUSIC_PURPOSES } from '../../../../../constants/musicOptionsConstants';

const { Dragger } = Upload;

const SERVICE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

export default function ArrangementUploader({
  variant = 'pure',
  serviceType,
  formData,
  onFormDataChange,
}) {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState(() => {
    return formData?.instrumentIds || [];
  });
  const [instrumentModalVisible, setInstrumentModalVisible] = useState(false);

  const {
    instruments: instrumentsData,
    loading: instrumentsLoading,
    fetchInstruments,
    getInstrumentsByUsage,
  } = useInstrumentStore();

  // Fetch instruments when component mounts
  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  // Get instruments for arrangement
  const availableInstruments = useMemo(() => {
    const actualServiceType =
      serviceType ||
      (variant === 'with_recording'
        ? 'arrangement_with_recording'
        : 'arrangement');
    if (actualServiceType === 'arrangement' || actualServiceType === 'arrangement_with_recording') {
      return getInstrumentsByUsage('arrangement');
    }
    return [];
  }, [serviceType, variant, getInstrumentsByUsage, instrumentsData]);

  // Track previous values to avoid unnecessary updates
  const prevGenresRef = useRef(null);
  const prevPurposeRef = useRef(null);
  const prevInstrumentsRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // Initialize form values from formData
  useEffect(() => {
    if (formData && form) {
      // Reset flag if formData was cleared
      if (!formData.title && !formData.description) {
        hasInitializedRef.current = false;
        prevGenresRef.current = null;
        prevPurposeRef.current = null;
        prevInstrumentsRef.current = null;
      }
      
      if (!hasInitializedRef.current) {
        form.setFieldsValue({
          musicGenres: formData.genres || [],
          musicPurpose: formData.purpose || null,
        });
        prevGenresRef.current = formData.genres || [];
        prevPurposeRef.current = formData.purpose || null;
        
        if (formData.instrumentIds && formData.instrumentIds.length > 0) {
          setSelectedInstruments(formData.instrumentIds);
          prevInstrumentsRef.current = formData.instrumentIds;
        } else {
          setSelectedInstruments([]);
          prevInstrumentsRef.current = [];
        }
        hasInitializedRef.current = true;
      }
    } else if (!formData) {
      // Reset when formData is null
      hasInitializedRef.current = false;
      prevGenresRef.current = null;
      prevPurposeRef.current = null;
      prevInstrumentsRef.current = null;
      setSelectedInstruments([]);
      form.setFieldsValue({
        musicGenres: [],
        musicPurpose: null,
      });
    }
  }, [formData?.title, formData?.description, formData?.contactName, formData?.contactPhone, formData?.contactEmail, form]);

  // Handle form values change
  const handleFormValuesChange = useCallback((changedValues, allValues) => {
    if (onFormDataChange && formData && hasInitializedRef.current) {
      const newGenres = allValues.musicGenres || [];
      const newPurpose = allValues.musicPurpose || null;
      
      // Only update if values actually changed
      const genresChanged = JSON.stringify(newGenres) !== JSON.stringify(prevGenresRef.current);
      const purposeChanged = newPurpose !== prevPurposeRef.current;
      
      if (genresChanged || purposeChanged) {
        if (genresChanged) prevGenresRef.current = newGenres;
        if (purposeChanged) prevPurposeRef.current = newPurpose;
        
        onFormDataChange({
          ...formData,
          genres: newGenres,
          purpose: newPurpose,
          instrumentIds: selectedInstruments,
        });
      }
    }
  }, [onFormDataChange, formData, selectedInstruments]);

  // Update formData when instruments change
  useEffect(() => {
    if (onFormDataChange && formData && hasInitializedRef.current) {
      // Only update if instruments actually changed
      const instrumentsChanged = JSON.stringify(selectedInstruments) !== JSON.stringify(prevInstrumentsRef.current);
      if (instrumentsChanged) {
        prevInstrumentsRef.current = selectedInstruments;
        const currentGenres = form.getFieldValue('musicGenres') || [];
        const currentPurpose = form.getFieldValue('musicPurpose') || null;
        onFormDataChange({
          ...formData,
          genres: currentGenres,
          purpose: currentPurpose,
          instrumentIds: selectedInstruments,
        });
      }
    }
  }, [selectedInstruments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstrumentSelect = instrumentIds => {
    setSelectedInstruments(instrumentIds);
  };

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

        {/* Service Type, Music Genres, Purpose, and Instrument Selection */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange}>
            <Form.Item label="Service Type">
              <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                {SERVICE_LABELS[serviceType || (variant === 'with_recording' ? 'arrangement_with_recording' : 'arrangement')] || serviceType}
              </Tag>
            </Form.Item>

            <Form.Item
              label="Music Genres"
              name="musicGenres"
              tooltip="Select one or more music genres for your arrangement"
            >
              <Select
                mode="multiple"
                size="large"
                placeholder="Select genres (e.g., Pop, Rock, Jazz...)"
                style={{ width: '100%' }}
                options={MUSIC_GENRES}
              />
            </Form.Item>

            <Form.Item
              label="Purpose"
              name="musicPurpose"
              tooltip="What is the purpose of this arrangement?"
            >
              <Select
                size="large"
                placeholder="Select purpose"
                style={{ width: '100%' }}
                options={MUSIC_PURPOSES}
              />
            </Form.Item>

            <Form.Item label="Select Instruments (Multiple)" required>
              <Row gutter={16} align="middle">
                <Col xs={24} sm={24} md={12}>
                  <Button
                    type="primary"
                    icon={<SelectOutlined />}
                    onClick={() => setInstrumentModalVisible(true)}
                    size="large"
                    block
                    loading={instrumentsLoading}
                  >
                    {selectedInstruments.length > 0
                      ? `${selectedInstruments.length} instrument(s) selected`
                      : 'Select Instruments'}
                  </Button>
                </Col>
                {selectedInstruments.length > 0 && (
                  <Col xs={24} sm={24} md={12}>
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      {selectedInstruments.map(id => {
                        const inst = instrumentsData.find(
                          i => i.instrumentId === id
                        );
                        return inst ? (
                          <Tag
                            key={id}
                            color="blue"
                            style={{
                              fontSize: 14,
                              padding: '4px 12px',
                            }}
                          >
                            {inst.instrumentName}
                          </Tag>
                        ) : null;
                      })}
                    </div>
                  </Col>
                )}
              </Row>
            </Form.Item>
          </Form>
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

      {/* Instrument Selection Modal */}
      <InstrumentSelectionModal
        visible={instrumentModalVisible}
        onCancel={() => setInstrumentModalVisible(false)}
        instruments={availableInstruments}
        loading={instrumentsLoading}
        selectedInstruments={selectedInstruments}
        onSelect={handleInstrumentSelect}
        multipleSelection={true}
        title="Select Instruments (Multiple)"
      />
    </section>
  );
}
