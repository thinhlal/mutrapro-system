// src/pages/ServiceRequest/components/ArrangementWithRecordingUploader/ArrangementWithRecordingUploader.jsx
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  Space,
  Tag,
  Button,
  message,
  Form,
  Select,
  Radio,
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
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from '../ArrangementUploader/ArrangementUploader.module.css';
import { useInstrumentStore } from '../../../../../stores/useInstrumentStore';
import InstrumentSelectionModal from '../../../../../components/modal/InstrumentSelectionModal/InstrumentSelectionModal';
import {
  MUSIC_GENRES,
  MUSIC_PURPOSES,
} from '../../../../../constants/musicOptionsConstants';
import {
  FEMALE_SINGERS_DATA,
  MALE_SINGERS_DATA,
} from '../../../../../constants/index';

const { Dragger } = Upload;

const toSize = (bytes = 0) =>
  bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '—';

const formatPrice = (price = 0) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

export default function ArrangementWithRecordingUploader({
  serviceType = 'arrangement_with_recording',
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

  // Vocalist preference (optional - can select 1-2 preferred vocalists or let manager suggest)
  // Lưu cả id và name để hiển thị
  const [preferredVocalists, setPreferredVocalists] = useState(() => {
    // Ưu tiên kiểm tra sessionStorage trước (nếu quay về từ vocalist selection)
    // sessionStorage chỉ dùng tạm thời khi navigate, sau đó sẽ sync vào formData
    try {
      const flowDataStr = sessionStorage.getItem('recordingFlowData');
      if (flowDataStr) {
        const flowData = JSON.parse(flowDataStr);
        if (
          flowData.step2?.vocalistIds &&
          Array.isArray(flowData.step2.vocalistIds)
        ) {
          // Multiple selections - return objects with id and name
          const vocalists = flowData.step2.vocalistIds.map(item => {
            if (
              typeof item === 'object' &&
              item !== null &&
              item.id &&
              item.name
            ) {
              return item;
            }
            if (typeof item === 'object' && item !== null && item.id) {
              return { id: item.id, name: item.name || `Vocalist ${item.id}` };
            }
            return { id: item, name: `Vocalist ${item}` };
          });
          // Sync vào formData ngay sau khi load
          if (onFormDataChange && formData) {
            setTimeout(() => {
              onFormDataChange({
                ...formData,
                preferredSpecialistIds: vocalists.map(v => v.id),
                preferredSpecialistNames: vocalists.map(v => ({
                  id: v.id,
                  name: v.name,
                })),
                hasVocalist: vocalists.length > 0,
              });
            }, 0);
          }
          return vocalists;
        }
      }
    } catch (error) {
      console.error(
        'Error loading vocalists from sessionStorage in initial state:',
        error
      );
    }

    // Nếu không có trong sessionStorage, dùng formData
    // formData có thể có preferredSpecialistNames (mới) hoặc preferredSpecialistIds (cũ)
    if (
      formData?.preferredSpecialistNames &&
      Array.isArray(formData.preferredSpecialistNames)
    ) {
      // Format mới: array of objects với id và name
      return formData.preferredSpecialistNames;
    }

    if (formData?.preferredSpecialistIds) {
      if (
        Array.isArray(formData.preferredSpecialistIds) &&
        formData.preferredSpecialistIds.length > 0
      ) {
        // Check if first item is object or string
        if (typeof formData.preferredSpecialistIds[0] === 'object') {
          return formData.preferredSpecialistIds;
        } else {
          // Convert array of IDs to array of objects
          return formData.preferredSpecialistIds.map(id => ({
            id,
            name: `Vocalist ${id}`,
          }));
        }
      }
    }
    return [];
  });

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
    return getInstrumentsByUsage('arrangement');
  }, [getInstrumentsByUsage, instrumentsData]);

  // Prepare table data for selected instruments
  const instrumentTableData = useMemo(() => {
    if (!selectedInstruments || selectedInstruments.length === 0) {
      return [];
    }
    return selectedInstruments.map(id => {
      const inst = instrumentsData.find(i => i.instrumentId === id);
      if (!inst) return null;
      return {
        key: id,
        instrumentId: id,
        instrumentName: inst.instrumentName || 'Unknown',
        basePrice: inst.basePrice || 0,
        isMain: id === mainInstrumentId,
      };
    }).filter(Boolean);
  }, [selectedInstruments, instrumentsData, mainInstrumentId]);

  // Table columns for instruments
  const instrumentTableColumns = [
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
      render: (price) => formatPrice(price),
    },
  ];

  // Prepare table data for selected vocalists
  const vocalistTableData = useMemo(() => {
    if (!preferredVocalists || preferredVocalists.length === 0) {
      return [];
    }
    return preferredVocalists.map((vocalist, index) => {
      const vocalistId =
        typeof vocalist === 'object' ? vocalist.id : vocalist;
      const vocalistName =
        typeof vocalist === 'object'
          ? vocalist.name
          : `Vocalist ${vocalist}`;
      return {
        key: vocalistId || index,
        vocalistId: vocalistId,
        vocalistName: vocalistName,
      };
    });
  }, [preferredVocalists]);

  // Table columns for vocalists
  const vocalistTableColumns = [
    {
      title: 'Vocalist Name',
      dataIndex: 'vocalistName',
      key: 'vocalistName',
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveVocalist(record.vocalistId)}
          size="small"
        >
          Remove
        </Button>
      ),
    },
  ];

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

        setSelectedInstruments(formData.instrumentIds || []);
        prevInstrumentsRef.current = formData.instrumentIds || [];
        setMainInstrumentId(formData.mainInstrumentId || null);
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
            preferredSpecialistIds: preferredVocalists.map(v =>
              typeof v === 'object' ? v.id : v
            ),
            hasVocalist: preferredVocalists.length > 0,
          });
        }
      }
    },
    [
      onFormDataChange,
      formData,
      selectedInstruments,
      mainInstrumentId,
      preferredVocalists,
      form,
    ]
  );

  // Clear formData error when formData is updated
  useEffect(() => {
    if (formData && formData.title && formData.description && formData.contactName && formData.contactPhone && formData.contactEmail) {
      // Check if description is long enough
      if (formData.description.trim().length >= 10) {
        setFormDataError('');
      }
    }
  }, [formData?.title, formData?.description, formData?.contactName, formData?.contactPhone, formData?.contactEmail]);

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
          preferredSpecialistIds: preferredVocalists.map(v =>
            typeof v === 'object' ? v.id : v
          ),
          preferredSpecialistNames: preferredVocalists.map(v =>
            typeof v === 'object'
              ? { id: v.id, name: v.name }
              : { id: v, name: `Vocalist ${v}` }
          ),
          hasVocalist: preferredVocalists.length > 0,
        });
      }
    }
  }, [selectedInstruments, mainInstrumentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update formData when vocalist preference changes
  useEffect(() => {
    if (onFormDataChange && formData && hasInitializedRef.current) {
      const currentGenres = form.getFieldValue('musicGenres') || [];
      const currentPurpose = form.getFieldValue('musicPurpose') || null;
      onFormDataChange({
        ...formData,
        genres: currentGenres,
        purpose: currentPurpose,
        instrumentIds: selectedInstruments,
        mainInstrumentId: mainInstrumentId,
        preferredSpecialistIds: preferredVocalists.map(v =>
          typeof v === 'object' ? v.id : v
        ),
        preferredSpecialistNames: preferredVocalists.map(v =>
          typeof v === 'object'
            ? { id: v.id, name: v.name }
            : { id: v, name: `Vocalist ${v}` }
        ),
        hasVocalist: preferredVocalists.length > 0,
      });
    }
  }, [preferredVocalists]); // eslint-disable-line react-hooks/exhaustive-deps

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
        preferredSpecialistIds: preferredVocalists.map(v =>
          typeof v === 'object' ? v.id : v
        ),
        hasVocalist: preferredVocalists.length > 0,
      });
    }
  };

  const handleSelectPreferredVocalists = () => {
    // Save callback data
    const callbackData = {
      fromArrangement: true,
      serviceType: serviceType,
      formData: formData,
      allowMultiple: true, // Allow selecting multiple vocalists
      maxSelections: 2, // Max 2 vocalists
      currentSelections: preferredVocalists.map(v =>
        typeof v === 'object' ? v.id : v
      ),
    };
    sessionStorage.setItem(
      'arrangementVocalistCallback',
      JSON.stringify(callbackData)
    );

    // Navigate to vocalist selection page
    navigate('/recording-flow/vocalist-selection', {
      state: {
        fromFlow: true,
        fromArrangement: true,
        allowMultiple: true,
        maxSelections: 2,
        selectedVocalists: preferredVocalists.map(v =>
          typeof v === 'object' ? v.id : v
        ),
      },
    });
  };

  const handleRemoveVocalist = vocalistId => {
    setPreferredVocalists(prev =>
      prev.filter(v => {
        const id = typeof v === 'object' ? v.id : v;
        return id !== vocalistId;
      })
    );
  };

  // Check if returning from vocalist selection page
  useEffect(() => {
    // Nếu đã có vocalists trong state, không cần load lại từ sessionStorage
    if (preferredVocalists.length > 0) {
      // Chỉ clear sessionStorage nếu có callback data
      const callbackDataStr = sessionStorage.getItem(
        'arrangementVocalistCallback'
      );
      if (callbackDataStr) {
        sessionStorage.removeItem('arrangementVocalistCallback');
        sessionStorage.removeItem('recordingFlowData');
      }
      return;
    }

    try {
      const callbackDataStr = sessionStorage.getItem(
        'arrangementVocalistCallback'
      );
      if (callbackDataStr) {
        const callbackData = JSON.parse(callbackDataStr);
        if (callbackData.fromArrangement && callbackData.allowMultiple) {
          // Check if we have selected vocalists from sessionStorage
          const flowDataStr = sessionStorage.getItem('recordingFlowData');
          if (flowDataStr) {
            const flowData = JSON.parse(flowDataStr);
            console.log('FlowData from sessionStorage in useEffect:', flowData);
            // Support both single and multiple selections
            if (
              flowData.step2?.vocalistIds &&
              Array.isArray(flowData.step2.vocalistIds)
            ) {
              console.log('Found vocalistIds:', flowData.step2.vocalistIds);
              // Multiple selections - check if it's array of objects or IDs
              const vocalists = flowData.step2.vocalistIds.map(item => {
                // Nếu đã là object với id và name, return luôn
                if (
                  typeof item === 'object' &&
                  item !== null &&
                  item.id &&
                  item.name
                ) {
                  console.log('Using object with id and name:', item);
                  return item;
                }
                // Nếu là object nhưng thiếu name, thử tìm từ constants
                if (typeof item === 'object' && item !== null && item.id) {
                  const allSingers = [
                    ...FEMALE_SINGERS_DATA,
                    ...MALE_SINGERS_DATA,
                  ];
                  const singer = allSingers.find(s => s.id === item.id);
                  const result = {
                    id: item.id,
                    name: item.name || singer?.name || `Vocalist ${item.id}`,
                  };
                  console.log('Object without name, using:', result);
                  return result;
                }
                // Nếu là string ID, tìm từ constants
                const allSingers = [
                  ...FEMALE_SINGERS_DATA,
                  ...MALE_SINGERS_DATA,
                ];
                const singer = allSingers.find(s => s.id === item);
                const result = singer
                  ? { id: singer.id, name: singer.name }
                  : { id: item, name: `Vocalist ${item}` };
                console.log('String ID, using:', result);
                return result;
              });
              console.log('Final vocalists to set in useEffect:', vocalists);
              setPreferredVocalists(vocalists);
            } else if (flowData.step2?.vocalistId) {
              // Single selection - convert to array
              const allSingers = [...FEMALE_SINGERS_DATA, ...MALE_SINGERS_DATA];
              const singer = allSingers.find(
                s => s.id === flowData.step2.vocalistId
              );
              setPreferredVocalists(
                singer
                  ? [{ id: singer.id, name: singer.name }]
                  : [
                      {
                        id: flowData.step2.vocalistId,
                        name: `Vocalist ${flowData.step2.vocalistId}`,
                      },
                    ]
              );
            }
            // Clear sessionStorage sau khi đã load xong
            sessionStorage.removeItem('arrangementVocalistCallback');
            sessionStorage.removeItem('recordingFlowData');
          } else {
            console.log('No recordingFlowData in sessionStorage');
          }
        }
      }
    } catch (error) {
      console.error('Error loading vocalist selection:', error);
    }
  }, [preferredVocalists.length]);

  const beforeUpload = useCallback(() => false, []);

  const onChange = async ({ fileList }) => {
    const f = fileList?.[0]?.originFileObj || null;
    if (!f) {
      clearFile();
      return;
    }

    setFile(f);
    setFileError(''); // Clear error when file is selected
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
      setFormDataError('Please fill in all required information in the form above before submitting.');
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
      setFormDataError(`Please fill in the following required fields: ${fieldsList}`);
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
    // Ưu tiên dùng formData.mainInstrumentId, nếu không có thì dùng mainInstrumentId state
    // Nếu vẫn null và chỉ có 1 instrument, tự động set làm main
    let finalMainInstrumentId = formData?.mainInstrumentId || mainInstrumentId;
    if (
      !finalMainInstrumentId &&
      selectedInstruments &&
      selectedInstruments.length === 1
    ) {
      finalMainInstrumentId = selectedInstruments[0];
      console.log(
        'Auto-setting main instrument (only 1 selected):',
        finalMainInstrumentId
      );
    }

    if (!finalMainInstrumentId) {
      setMainInstrumentError('Please select a main instrument for your arrangement.');
      hasError = true;
    }

    // If there are errors, stop submission
    if (hasError) {
      // Scroll to file upload area if file error
      if (!file) {
        const fileUploadElement = document.getElementById('arrangement-with-recording-uploader');
        if (fileUploadElement) {
          fileUploadElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      return;
    }

    // Navigate to quote page with state
    const navigationState = {
      formData: {
        ...formData,
        mainInstrumentId: finalMainInstrumentId, // Đảm bảo mainInstrumentId được set
        preferredSpecialists: preferredVocalists.map(v => ({
          specialistId: typeof v === 'object' ? v.id : v,
          name: typeof v === 'object' ? v.name : `Vocalist ${v}`,
          role: 'VOCALIST', // Mặc định là VOCALIST cho arrangement_with_recording
        })),
        hasVocalist: preferredVocalists.length > 0,
      },
      uploadedFile: file,
      fileName: file.name,
      fileType: file.type || 'unknown',
      size: file.size || 0,
      serviceType: serviceType,
    };

    navigate('/services/quotes/arrangement', {
      state: navigationState,
    });
  };

  return (
    <section
      id="arrangement-with-recording-uploader"
      className={styles.wrapper}
      aria-labelledby="arr-rec-title"
    >
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.iconBadge} aria-hidden>
            <span className={styles.musicIcon}>♪</span>
          </div>
          <div className={styles.headings}>
            <h2 id="arr-rec-title" className={styles.title}>
              Arrangement + Recording
            </h2>
            <p className={styles.desc}>
              Upload original notation file (MusicXML/MIDI/PDF). We will arrange
              and record for you.
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
                Arrangement + Recording (with Vocalist)
              </Tag>
            </Form.Item>

            <Form.Item
              label="Music Genres"
              name="musicGenres"
              tooltip="Select one or more music genres for arrangement"
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
              validateStatus={instrumentError || mainInstrumentError ? 'error' : ''}
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

            {/* Vocalist Preference (Optional) */}
            <Form.Item
              label="Preferred Vocalist (Optional)"
              tooltip="You can select 1-2 preferred vocalists, or let the manager suggest"
            >
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="small"
              >
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#f0f2f5',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#666',
                  }}
                >
                  <strong>Note:</strong> This is a preference suggestion, not a
                  commitment. We will try to book the vocalist you selected. If
                  they are not available, the manager will suggest similar
                  options.
                </div>

                <Space
                  direction="vertical"
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <Button
                    type="default"
                    onClick={handleSelectPreferredVocalists}
                    icon={<SelectOutlined />}
                    disabled={preferredVocalists.length >= 2}
                  >
                    {preferredVocalists.length === 0
                      ? 'Select preferred vocalist (1-2 people)'
                      : preferredVocalists.length === 1
                        ? 'Add preferred vocalist (max 2)'
                        : 'Maximum 2 vocalists selected'}
                  </Button>

                  {preferredVocalists.length > 0 && (
                    <Table
                      columns={vocalistTableColumns}
                      dataSource={vocalistTableData}
                      pagination={false}
                      size="middle"
                      bordered
                      rowKey="vocalistId"
                    />
                  )}

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      fontStyle: 'italic',
                      marginTop: 4,
                    }}
                  >
                    Or leave blank to let the manager suggest suitable vocalists
                  </div>
                </Space>
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
              <p className="ant-upload-text">
                Drag and drop notation file here
              </p>
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
                  Delete
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
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              console.log(
                '=== Button clicked in ArrangementWithRecordingUploader ==='
              );
              console.log('handleSubmit function:', handleSubmit);
              console.log('file:', file);
              console.log('formData:', formData);
              try {
                handleSubmit();
              } catch (error) {
                console.error('Error in handleSubmit:', error);
                message.error('An error occurred: ' + error.message);
              }
            }}
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
