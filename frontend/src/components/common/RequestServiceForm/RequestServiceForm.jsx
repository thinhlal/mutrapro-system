import { useMemo, useEffect, useState, useRef } from 'react';
import {
  Form,
  Input,
  Tag,
  InputNumber,
  Button,
  Space,
  Select,
  Row,
  Col,
} from 'antd';
import { SelectOutlined } from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import InstrumentSelectionModal from '../../modal/InstrumentSelectionModal/InstrumentSelectionModal';
import {
  MUSIC_GENRES,
  MUSIC_PURPOSES,
} from '../../../constants/musicOptionsConstants';
import styles from './RequestServiceForm.module.css';

const { TextArea } = Input;

const SERVICE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

export default function RequestServiceForm({
  onFormComplete,
  serviceType,
  formRef,
  initialFormData,
}) {
  const [form] = Form.useForm();
  const { user } = useAuth();

  // Instrument selection - khôi phục từ initialFormData nếu có
  const [selectedInstruments, setSelectedInstruments] = useState(() => {
    return initialFormData?.instrumentIds || [];
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

  // Expose form instance to parent via ref
  useEffect(() => {
    if (formRef) {
      formRef.current = form;
    }
  }, [form, formRef]);

  // Khôi phục form values từ initialFormData - chỉ một lần khi mount
  const hasInitializedRef = useRef(false);
  const lastServiceTypeRef = useRef(serviceType);

  useEffect(() => {
    const serviceTypeChanged = lastServiceTypeRef.current !== serviceType;

    // Reset flag nếu serviceType thay đổi
    if (serviceTypeChanged) {
      hasInitializedRef.current = false;
      lastServiceTypeRef.current = serviceType;
    }

    if (!form) return;

    // Reset form khi initialFormData là null (user quay lại từ home)
    if (!initialFormData && hasInitializedRef.current) {
      form.resetFields();
      setSelectedInstruments([]);
      hasInitializedRef.current = false;
      return;
    }

    // Restore khi có initialFormData và chưa initialize
    if (initialFormData && !hasInitializedRef.current) {
      const formValues = {
        title: initialFormData.title || '',
        description: initialFormData.description || '',
        tempoPercentage: initialFormData.tempoPercentage || 100,
        contactName: initialFormData.contactName || user?.fullName || '',
        contactPhone: initialFormData.contactPhone || '',
        contactEmail: initialFormData.contactEmail || user?.email || '',
        hasVocalist: initialFormData.hasVocalist || false,
        // Restore genres và purpose fields if exists
        musicGenres: initialFormData.genres || [],
        musicPurpose: initialFormData.purpose || null,
      };
      form.setFieldsValue(formValues);

      setSelectedInstruments([]);

      hasInitializedRef.current = true;
    }
  }, [initialFormData, serviceType, form, user]);

  // Determine if service needs instrument selection and whether it's multiple or single
  const needsInstruments = serviceType && serviceType !== 'recording';
  const multipleInstruments =
    serviceType === 'arrangement' ||
    serviceType === 'arrangement_with_recording';

  // Get instruments based on service type
  const availableInstruments = useMemo(() => {
    if (serviceType === 'transcription') {
      return getInstrumentsByUsage('transcription');
    } else if (
      serviceType === 'arrangement' ||
      serviceType === 'arrangement_with_recording'
    ) {
      return getInstrumentsByUsage('arrangement');
    }
    return [];
  }, [serviceType, getInstrumentsByUsage, instrumentsData]);

  // Khi form values thay đổi hoặc instruments thay đổi, callback về parent
  const handleValuesChange = (changedValues, allValues) => {
    // Callback về parent với data đầy đủ
    const formData = {
      requestType: serviceType || 'transcription',
      title: allValues.title || '',
      description: allValues.description || '',
      tempoPercentage: allValues.tempoPercentage || 100,
      contactName: allValues.contactName || user?.fullName || '',
      contactPhone: allValues.contactPhone || '',
      contactEmail:
        form.getFieldValue('contactEmail') ||
        allValues.contactEmail ||
        user?.email ||
        '',
      instrumentIds: selectedInstruments, // Thêm instrumentIds
      // Optional fields based on service type
      hasVocalist: allValues.hasVocalist || false,
      externalGuestCount: allValues.externalGuestCount || 0,
      // Music options - chỉ cho arrangement
      genres:
        serviceType === 'arrangement' ||
        serviceType === 'arrangement_with_recording'
          ? allValues.musicGenres || []
          : null,
      purpose:
        serviceType === 'arrangement' ||
        serviceType === 'arrangement_with_recording'
          ? allValues.musicPurpose || null
          : null,
    };
    onFormComplete?.(formData);
  };

  // Khi instruments thay đổi, cũng callback lại
  useEffect(() => {
    if (form) {
      const allValues = form.getFieldsValue();
      handleValuesChange({}, allValues);
    }
  }, [selectedInstruments]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstrumentSelect = instrumentIds => {
    setSelectedInstruments(
      multipleInstruments ? instrumentIds : [instrumentIds]
    );
    if (!multipleInstruments) {
      // Single selection - close modal immediately
      setInstrumentModalVisible(false);
    }
  };

  const requiredMsg = useMemo(
    () => ({ required: true, message: 'Required' }),
    []
  );

  // If recording service, don't show form - use multi-step flow instead
  if (serviceType === 'recording') {
    return (
      <section
        id="request-service-form"
        className={styles.wrapper}
        aria-labelledby="request-title"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <div
          className={styles.card}
          style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}
        >
          <h2 id="request-title" className={styles.title}>
            Recording Service
          </h2>
          <p
            className={styles.desc}
            style={{ marginBottom: '24px', color: '#666' }}
          >
            Please use the new multi-step flow for recording bookings.
          </p>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              // Clear old form data and navigate to new flow
              sessionStorage.removeItem('serviceRequestFormData');
              sessionStorage.removeItem('serviceRequestType');
              window.location.href = '/recording-flow';
            }}
            style={{
              background: 'linear-gradient(135deg, #ec8a1c 0%, #d67a16 100%)',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              height: 'auto',
            }}
          >
            Start Recording Flow
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="request-service-form"
      className={styles.wrapper}
      aria-labelledby="request-title"
    >
      <div className={styles.card}>
        <h2 id="request-title" className={styles.title}>
          Create Your Service Request
        </h2>
        <p className={styles.desc}>
          Tell us what you need. After filling the form, please upload your
          files.
        </p>

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={{
            serviceType: serviceType || 'transcription',
            tempoPercentage: 100,
            contactName: user?.fullName || '',
            contactEmail: user?.email || '',
          }}
          className={styles.form}
        >
          <Form.Item label="Title" name="title" rules={[requiredMsg]}>
            <Input size="large" placeholder="e.g., Transcribe Song ABC" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[
              requiredMsg,
              {
                min: 10,
                message: 'Description must be at least 10 characters long',
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Describe your request in detail..."
              showCount
            />
          </Form.Item>

          <Form.Item
            label="Contact Name"
            name="contactName"
            rules={[requiredMsg]}
          >
            <Input size="large" placeholder="Your full name" />
          </Form.Item>
          <Form.Item
            label="Contact Email"
            name="contactEmail"
            rules={[requiredMsg, { type: 'email', message: 'Invalid email' }]}
          >
            <Input
              size="large"
              placeholder="you@example.com"
              readOnly
              disabled
            />
          </Form.Item>

          <Form.Item
            label="Contact Phone"
            name="contactPhone"
            rules={[
              requiredMsg,
              {
                pattern: /^[0-9+\-\s()]+$/,
                message:
                  'Phone number can only contain numbers, +, -, spaces, and parentheses',
              },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  // Remove spaces, dashes, parentheses for validation
                  const digitsOnly = value.replace(/[\s\-()]/g, '');
                  // Check if contains at least some digits
                  if (digitsOnly.length < 7) {
                    return Promise.reject(
                      new Error('Phone number must contain at least 7 digits')
                    );
                  }
                  // Check if contains any letters
                  if (/[a-zA-Z]/.test(value)) {
                    return Promise.reject(
                      new Error('Phone number cannot contain letters')
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              size="large"
              placeholder="+84 ..."
              onKeyPress={e => {
                // Allow: numbers, +, -, space, (, )
                const char = String.fromCharCode(e.which);
                if (!/[0-9+\-\s()]/.test(char)) {
                  e.preventDefault();
                }
              }}
            />
          </Form.Item>
        </Form>
        <p
          className={styles.nextStep}
          style={{ marginTop: 16, textAlign: 'center', color: '#888' }}
        >
          After filling the form, please upload your files.
        </p>
      </div>

      {/* Instrument Selection Modal - Removed for arrangement services (moved to uploader) */}
    </section>
  );
}
