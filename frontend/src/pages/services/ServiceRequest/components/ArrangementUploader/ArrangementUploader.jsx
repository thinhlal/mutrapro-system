// src/pages/ServiceRequest/components/ArrangementUploader/ArrangementUploader.jsx
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  Space,
  Tag,
  Button,
  message,
  Form,
  Select,
  Alert,
  Table,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  SelectOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './ArrangementUploader.module.css';
import { useInstrumentStore } from '../../../../../stores/useInstrumentStore';
import InstrumentSelectionModal from '../../../../../components/modal/InstrumentSelectionModal/InstrumentSelectionModal';
import {
  MUSIC_GENRES,
  MUSIC_PURPOSES,
} from '../../../../../constants/musicOptionsConstants';

const { Dragger } = Upload;

const SERVICE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

const formatPrice = (price = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

export default function ArrangementUploader({
  variant = 'pure',
  serviceType,
  formData,
  onFormDataChange,
}) {
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');
  const [instrumentError, setInstrumentError] = useState('');
  const [mainInstrumentError, setMainInstrumentError] = useState('');
  const [formDataError, setFormDataError] = useState('');
  const navigate = useNavigate();

  // Instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState(() => {
    return formData?.instrumentIds || [];
  });
  const [mainInstrumentId, setMainInstrumentId] = useState(() => {
    return formData?.mainInstrumentId || null;
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
    if (
      actualServiceType === 'arrangement' ||
      actualServiceType === 'arrangement_with_recording'
    ) {
      return getInstrumentsByUsage('arrangement');
    }
    return [];
  }, [serviceType, variant, getInstrumentsByUsage, instrumentsData]);

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
          isMain: id === mainInstrumentId,
        };
      })
      .filter(Boolean);
  }, [selectedInstruments, instrumentsData, mainInstrumentId]);

  // Handle remove instrument
  const handleRemoveInstrument = useCallback(
    instrumentId => {
      setSelectedInstruments(prev => prev.filter(id => id !== instrumentId));
      setInstrumentError(''); // Clear error when instrument is removed
      // Nếu instrument bị xóa là main instrument, reset mainInstrumentId
      if (mainInstrumentId === instrumentId) {
        setMainInstrumentId(null);
        setMainInstrumentError('');
      }
    },
    [mainInstrumentId]
  );

  // Table columns for instruments
  const instrumentTableColumns = useMemo(
    () => [
      {
        title: 'Instrument Name',
        dataIndex: 'instrumentName',
        key: 'instrumentName',
        render: (text, record) => (
          <Space>
            {text}
            {record.isMain && (
              <Tag color="gold" icon={<StarFilled />}>
                Main
              </Tag>
            )}
          </Space>
        ),
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

        setSelectedInstruments([]);
        prevInstrumentsRef.current = [];
        setMainInstrumentId(null);
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
  }, [
    formData?.title,
    formData?.description,
    formData?.contactName,
    formData?.contactPhone,
    formData?.contactEmail,
    form,
  ]);

  // Handle form values change
  const handleFormValuesChange = useCallback(
    (changedValues, allValues) => {
      // Clear form validation errors when user changes values
      if (changedValues.musicGenres || changedValues.musicPurpose) {
        form.setFields([
          {
            name: 'musicGenres',
            errors: [],
          },
          {
            name: 'musicPurpose',
            errors: [],
          },
        ]);
      }

      if (onFormDataChange && formData && hasInitializedRef.current) {
        const newGenres = allValues.musicGenres || [];
        const newPurpose = allValues.musicPurpose || null;

        // Only update if values actually changed
        const genresChanged =
          JSON.stringify(newGenres) !== JSON.stringify(prevGenresRef.current);
        const purposeChanged = newPurpose !== prevPurposeRef.current;

        if (genresChanged || purposeChanged) {
          if (genresChanged) prevGenresRef.current = newGenres;
          if (purposeChanged) prevPurposeRef.current = newPurpose;

          onFormDataChange({
            ...formData,
            genres: newGenres,
            purpose: newPurpose,
            instrumentIds: selectedInstruments,
            mainInstrumentId: mainInstrumentId,
          });
        }
      }
    },
    [onFormDataChange, formData, selectedInstruments, form, mainInstrumentId]
  );

  // Clear formData error when formData is updated
  useEffect(() => {
    if (
      formData &&
      formData.title &&
      formData.description &&
      formData.contactName &&
      formData.contactPhone &&
      formData.contactEmail
    ) {
      // Check if description is long enough
      if (formData.description.trim().length >= 10) {
        setFormDataError('');
      }
    }
  }, [
    formData?.title,
    formData?.description,
    formData?.contactName,
    formData?.contactPhone,
    formData?.contactEmail,
  ]);

  // Update formData when instruments change
  useEffect(() => {
    if (onFormDataChange && formData && hasInitializedRef.current) {
      // Only update if instruments actually changed
      const instrumentsChanged =
        JSON.stringify(selectedInstruments) !==
        JSON.stringify(prevInstrumentsRef.current);
      if (instrumentsChanged) {
        prevInstrumentsRef.current = selectedInstruments;
        const currentGenres = form.getFieldValue('musicGenres') || [];
        const currentPurpose = form.getFieldValue('musicPurpose') || null;
        onFormDataChange({
          ...formData,
          genres: currentGenres,
          purpose: currentPurpose,
          instrumentIds: selectedInstruments,
          mainInstrumentId: mainInstrumentId,
        });
      }
    }
  }, [selectedInstruments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstrumentSelect = instrumentIds => {
    setSelectedInstruments(instrumentIds);
    setInstrumentError(''); // Clear error when instruments are selected
    // Nếu mainInstrumentId không còn trong danh sách, reset nó
    if (mainInstrumentId && !instrumentIds.includes(mainInstrumentId)) {
      setMainInstrumentId(null);
      setMainInstrumentError('');
    }
  };

  const handleMainInstrumentChange = mainId => {
    setMainInstrumentId(mainId);
    setMainInstrumentError(''); // Clear error when main instrument is selected
    // Cập nhật formData ngay lập tức
    if (onFormDataChange && formData) {
      const currentGenres = form.getFieldValue('musicGenres') || [];
      const currentPurpose = form.getFieldValue('musicPurpose') || null;
      onFormDataChange({
        ...formData,
        genres: currentGenres,
        purpose: currentPurpose,
        instrumentIds: selectedInstruments,
        mainInstrumentId: mainId,
      });
    }
  };

  const beforeUpload = useCallback(() => false, []);

  const onChange = async ({ fileList }) => {
    const f = fileList?.[0]?.originFileObj || null;
    if (!f) {
      clearFile();
      return;
    }

    setFile(f);
    setFileError(''); // Clear error when file is selected
    // Arrangement only accepts notation files (MusicXML/MIDI/PDF), not audio
  };

  const clearFile = () => {
    setFile(null);
    setFileError('');
  };

  const handleSubmit = async () => {
    // Reset all errors
    setFileError('');
    setInstrumentError('');
    setMainInstrumentError('');
    setFormDataError('');

    let hasError = false;
    const missingFields = [];

    // Validate file
    if (!file) {
      setFileError('Please upload your original notation file.');
      hasError = true;
    }

    // Validate form data - check each required field
    if (!formData) {
      setFormDataError(
        'Please fill in all required information in the form above before submitting.'
      );
      hasError = true;
      // Scroll to form
      setTimeout(() => {
        const formElement = document.getElementById('request-service-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }

    // Check each required field
    if (!formData.title || formData.title.trim() === '') {
      missingFields.push('Title');
    }
    if (!formData.description || formData.description.trim() === '') {
      missingFields.push('Description');
    }
    if (!formData.contactName || formData.contactName.trim() === '') {
      missingFields.push('Contact Name');
    }
    if (!formData.contactPhone || formData.contactPhone.trim() === '') {
      missingFields.push('Contact Phone');
    }
    if (!formData.contactEmail || formData.contactEmail.trim() === '') {
      missingFields.push('Contact Email');
    }

    // Validate description length
    if (formData.description && formData.description.trim().length < 10) {
      missingFields.push('Description (must be at least 10 characters)');
    }

    if (missingFields.length > 0) {
      const fieldsList = missingFields.join(', ');
      setFormDataError(
        `Please fill in the following required fields: ${fieldsList}`
      );
      hasError = true;
      // Scroll to form
      setTimeout(() => {
        const formElement = document.getElementById('request-service-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Validate form fields (genres, purpose)
    try {
      await form.validateFields(['musicGenres', 'musicPurpose']);
    } catch (errorInfo) {
      hasError = true;
      // Scroll to first error field
      if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
        const firstErrorField = errorInfo.errorFields[0];
        const fieldName = firstErrorField.name[0];
        form.scrollToField(fieldName);
      }
    }

    // Validate instruments
    if (!selectedInstruments || selectedInstruments.length === 0) {
      setInstrumentError('Please select at least one instrument.');
      hasError = true;
    }

    // Validate main instrument (required for arrangement)
    if (!mainInstrumentId) {
      setMainInstrumentError(
        'Please select a main instrument for your arrangement.'
      );
      hasError = true;
    }

    // If there are errors, stop submission
    if (hasError) {
      // Scroll to file upload area if file error
      if (!file) {
        const fileUploadElement = document.getElementById(
          'arrangement-uploader'
        );
        if (fileUploadElement) {
          fileUploadElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }
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

        {/* Form Data Error Alert */}
        {formDataError && (
          <Alert
            message={formDataError}
            type="error"
            showIcon
            closable
            onClose={() => setFormDataError('')}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Service Type, Music Genres, Purpose, and Instrument Selection */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleFormValuesChange}
          >
            <Form.Item label="Service Type">
              <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                {SERVICE_LABELS[
                  serviceType ||
                    (variant === 'with_recording'
                      ? 'arrangement_with_recording'
                      : 'arrangement')
                ] || serviceType}
              </Tag>
            </Form.Item>

            <Form.Item
              label="Music Genres"
              name="musicGenres"
              tooltip="Select one or more music genres for your arrangement"
              rules={[
                {
                  required: true,
                  message: 'Please select at least one music genre.',
                },
              ]}
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
              rules={[
                {
                  required: true,
                  message: 'Please select the purpose of this arrangement.',
                },
              ]}
            >
              <Select
                size="large"
                placeholder="Select purpose"
                style={{ width: '100%' }}
                options={MUSIC_PURPOSES}
              />
            </Form.Item>

            <Form.Item
              label="Select Instruments (Multiple)"
              required
              validateStatus={
                instrumentError || mainInstrumentError ? 'error' : ''
              }
              help={instrumentError || mainInstrumentError || ''}
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
                    : 'Select Instruments'}
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
            {fileError && (
              <Alert
                message={fileError}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
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
        mainInstrumentId={mainInstrumentId}
        onSelect={handleInstrumentSelect}
        onMainInstrumentChange={handleMainInstrumentChange}
        multipleSelection={true}
        title="Select Instruments (Multiple)"
      />
    </section>
  );
}
