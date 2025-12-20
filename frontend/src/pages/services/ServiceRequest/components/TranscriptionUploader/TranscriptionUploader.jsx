import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  Button,
  Tooltip,
  Tag,
  Space,
  InputNumber,
  Alert,
  Form,
  Table,
} from 'antd';
import {
  InboxOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  MinusOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './TranscriptionUploader.module.css';
import { getMediaDurationSec } from '../../../../../utils/getMediaDuration';
import { createServiceRequest } from '../../../../../services/serviceRequestService';
import { formatDurationMMSS } from '../../../../../utils/timeUtils';
import { useInstrumentStore } from '../../../../../stores/useInstrumentStore';
import InstrumentSelectionModal from '../../../../../components/modal/InstrumentSelectionModal/InstrumentSelectionModal';

const { Dragger } = Upload;
const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

const formatPrice = (price = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

const SERVICE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

export default function TranscriptionUploader({
  serviceType,
  formData,
  onFormDataChange,
}) {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState('');
  const [detectedDurationMinutes, setDetectedDurationMinutes] = useState(0);
  const [adjustedDurationMinutes, setAdjustedDurationMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [instrumentError, setInstrumentError] = useState('');
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

  // Get instruments for transcription
  const availableInstruments = useMemo(() => {
    if (serviceType === 'transcription') {
      return getInstrumentsByUsage('transcription');
    }
    return [];
  }, [serviceType, getInstrumentsByUsage, instrumentsData]);

  // Prepare table data for selected instruments
  const instrumentTableData = useMemo(() => {
    if (!selectedInstruments || selectedInstruments.length === 0) {
      return [];
    }
    return selectedInstruments
      .map(id => {
        const inst = instrumentsData.find(i => i.instrumentId === id);
        if (!inst) return null;
        return {
          key: id,
          instrumentId: id,
          instrumentName: inst.instrumentName || 'Unknown',
          basePrice: inst.basePrice || 0,
        };
      })
      .filter(Boolean);
  }, [selectedInstruments, instrumentsData]);

  // Handle remove instrument
  const handleRemoveInstrument = useCallback(instrumentId => {
    setSelectedInstruments(prev => prev.filter(id => id !== instrumentId));
    setInstrumentError(''); // Clear error when instrument is removed
  }, []);

  // Table columns for instruments
  const instrumentTableColumns = useMemo(
    () => [
      {
        title: 'Instrument Name',
        dataIndex: 'instrumentName',
        key: 'instrumentName',
      },
      {
        title: 'Price',
        dataIndex: 'basePrice',
        key: 'basePrice',
        align: 'right',
        render: price => formatPrice(price),
      },
      {
        title: 'Action',
        key: 'action',
        align: 'center',
        width: 100,
        render: (_, record) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveInstrument(record.instrumentId)}
            size="small"
          >
            Remove
          </Button>
        ),
      },
    ],
    [handleRemoveInstrument]
  );

  // Track previous values to avoid unnecessary updates
  const prevTempoRef = useRef(null);
  const prevInstrumentsRef = useRef(null);

  // Initialize form values from formData
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (formData && form) {
      // Reset flag if formData was cleared
      if (!formData.title && !formData.description) {
        hasInitializedRef.current = false;
        prevTempoRef.current = null;
        prevInstrumentsRef.current = null;
      }

      if (!hasInitializedRef.current) {
        const tempoValue = formData.tempoPercentage || 100;
        form.setFieldsValue({
          tempoPercentage: tempoValue,
        });
        prevTempoRef.current = tempoValue;

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
      prevTempoRef.current = null;
      prevInstrumentsRef.current = null;
      setSelectedInstruments([]);
      form.setFieldsValue({
        tempoPercentage: 100,
      });
    }
  }, [
    formData?.title,
    formData?.description,
    formData?.contactName,
    formData?.contactPhone,
    formData?.contactEmail,
    form,
  ]); // Only sync when other fields change

  // Handle form values change - only when user actually changes the value
  const handleFormValuesChange = useCallback(
    (changedValues, allValues) => {
      // Only process if tempoPercentage was changed by user
      if (
        changedValues.tempoPercentage !== undefined &&
        onFormDataChange &&
        formData &&
        hasInitializedRef.current
      ) {
        const newTempo = allValues.tempoPercentage || 100;
        // Only update if value actually changed
        if (newTempo !== prevTempoRef.current) {
          prevTempoRef.current = newTempo;
          onFormDataChange({
            ...formData,
            tempoPercentage: newTempo,
            instrumentIds: selectedInstruments,
          });
        }
      }
    },
    [onFormDataChange, formData, selectedInstruments]
  );

  // Update formData when instruments change
  useEffect(() => {
    if (onFormDataChange && formData && hasInitializedRef.current) {
      // Only update if instruments actually changed
      const instrumentsChanged =
        JSON.stringify(selectedInstruments) !==
        JSON.stringify(prevInstrumentsRef.current);
      if (instrumentsChanged) {
        prevInstrumentsRef.current = selectedInstruments;
        const currentTempo = form.getFieldValue('tempoPercentage') || 100;
        onFormDataChange({
          ...formData,
          tempoPercentage: currentTempo,
          instrumentIds: selectedInstruments,
        });
      }
    }
  }, [selectedInstruments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstrumentSelect = instrumentIds => {
    setSelectedInstruments([instrumentIds]);
    setInstrumentError(''); // Clear error when instrument is selected
    setInstrumentModalVisible(false);
  };

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
    const instrumentIds = selectedInstruments || formData?.instrumentIds;
    const isInstrumentIdsValid =
      instrumentIds !== undefined &&
      instrumentIds !== null &&
      Array.isArray(instrumentIds) &&
      instrumentIds.length === 1;

    if (!isInstrumentIdsValid) {
      setInstrumentError('Please choose a musical instrument.');
      // Scroll to instrument selection
      setTimeout(() => {
        const instrumentElement = document.getElementById('quote-uploader');
        if (instrumentElement) {
          instrumentElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 100);
      return;
    }

    // Clear instrument error if valid
    setInstrumentError('');

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

        {/* Tempo Percentage, Service Type, and Instrument Selection - Only for transcription */}
        {serviceType === 'transcription' && (
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleFormValuesChange}
            >
              <Form.Item
                label="Tempo Percentage"
                name="tempoPercentage"
                tooltip="Adjust playback speed (100 = normal speed)"
              >
                <InputNumber
                  size="large"
                  min={50}
                  max={200}
                  step={5}
                  style={{ width: '100%' }}
                  formatter={value => `${value}%`}
                  parser={value => value.replace('%', '')}
                />
              </Form.Item>

              <Form.Item label="Service Type">
                <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                  {SERVICE_LABELS[serviceType] || serviceType}
                </Tag>
              </Form.Item>

              <Form.Item
                label="Select Instrument"
                required
                validateStatus={instrumentError ? 'error' : ''}
                help={instrumentError || ''}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
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
                      : 'Select Instrument'}
                  </Button>
                  {selectedInstruments.length > 0 && (
                    <Table
                      columns={instrumentTableColumns}
                      dataSource={instrumentTableData}
                      pagination={false}
                      size="middle"
                      bordered
                    />
                  )}
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}

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
                    • Detected Duration:{' '}
                    {formatDurationMMSS(detectedDurationMinutes)}
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

      {/* Instrument Selection Modal */}
      {serviceType === 'transcription' && (
        <InstrumentSelectionModal
          visible={instrumentModalVisible}
          onCancel={() => setInstrumentModalVisible(false)}
          instruments={availableInstruments}
          loading={instrumentsLoading}
          selectedInstruments={selectedInstruments[0]}
          onSelect={handleInstrumentSelect}
          multipleSelection={false}
          title="Select One Instrument"
        />
      )}
    </section>
  );
}
