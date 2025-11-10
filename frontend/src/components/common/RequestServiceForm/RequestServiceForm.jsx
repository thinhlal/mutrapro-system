import { useMemo, useEffect, useState } from 'react';
import { Form, Input, Tag, InputNumber, Button, Space } from 'antd';
import { SelectOutlined } from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstrumentStore } from '../../../stores/useInstrumentStore';
import InstrumentSelectionModal from '../../modal/InstrumentSelectionModal/InstrumentSelectionModal';
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
}) {
  const [form] = Form.useForm();
  const { user } = useAuth();
  
  // Instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState([]);
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

  // Determine if service needs instrument selection and whether it's multiple or single
  const needsInstruments = serviceType && serviceType !== 'recording';
  const multipleInstruments = serviceType === 'arrangement' || serviceType === 'arrangement_with_recording';
  
  // Get instruments based on service type
  const availableInstruments = useMemo(() => {
    if (serviceType === 'transcription') {
      return getInstrumentsByUsage('transcription');
    } else if (serviceType === 'arrangement' || serviceType === 'arrangement_with_recording') {
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
      contactEmail: allValues.contactEmail || user?.email || '',
      instrumentIds: selectedInstruments, // Thêm instrumentIds
      // Optional fields based on service type
      hasVocalist: allValues.hasVocalist || false,
      externalGuestCount: allValues.externalGuestCount || 0,
      musicOptions: allValues.musicOptions || null,
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
  
  const handleInstrumentSelect = (instrumentIds) => {
    setSelectedInstruments(multipleInstruments ? instrumentIds : [instrumentIds]);
    if (!multipleInstruments) {
      // Single selection - close modal immediately
      setInstrumentModalVisible(false);
    }
  };

  const requiredMsg = useMemo(
    () => ({ required: true, message: 'Required' }),
    []
  );

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
            rules={[requiredMsg]}
          >
            <TextArea
              rows={4}
              placeholder="Describe your request in detail..."
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
            <Input size="large" placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Contact Phone"
            name="contactPhone"
            rules={[requiredMsg]}
          >
            <Input size="large" placeholder="+84 ..." />
          </Form.Item>

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

          {serviceType && (
            <Form.Item label="Service Type">
              <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                {SERVICE_LABELS[serviceType] || serviceType}
              </Tag>
            </Form.Item>
          )}

          {/* Instrument Selection - Only for transcription, arrangement, arrangement_with_recording */}
          {needsInstruments && (
            <Form.Item 
              label={multipleInstruments ? "Select Instruments (Multiple)" : "Select Instrument"} 
              required
            >
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
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
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {selectedInstruments.map(id => {
                        const inst = instrumentsData.find(i => i.instrumentId === id);
                        return inst ? (
                          <Tag key={id} color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                            {inst.instrumentName}
                          </Tag>
                        ) : null;
                      })}
                    </Space>
                  </div>
                )}
              </Space>
            </Form.Item>
          )}
        </Form>
        <p
          className={styles.nextStep}
          style={{ marginTop: 16, textAlign: 'center', color: '#888' }}
        >
          After filling the form, please upload your files.
        </p>
      </div>

      {/* Instrument Selection Modal */}
      {needsInstruments && (
        <InstrumentSelectionModal
          visible={instrumentModalVisible}
          onCancel={() => setInstrumentModalVisible(false)}
          instruments={availableInstruments}
          loading={instrumentsLoading}
          selectedInstruments={multipleInstruments ? selectedInstruments : selectedInstruments[0]}
          onSelect={handleInstrumentSelect}
          multipleSelection={multipleInstruments}
          title={multipleInstruments ? "Select Instruments (Multiple)" : "Select One Instrument"}
        />
      )}
    </section>
  );
}
