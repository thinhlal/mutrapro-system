import { useMemo, useEffect } from 'react';
import { Form, Input, Tag, InputNumber } from 'antd';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './RequestServiceForm.module.css';

const { TextArea } = Input;

const SERVICE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

export default function RequestServiceForm({ onFormComplete, serviceType, formRef }) {
  const [form] = Form.useForm();
  const { user } = useAuth();

  // Expose form instance to parent via ref
  useEffect(() => {
    if (formRef) {
      formRef.current = form;
    }
  }, [form, formRef]);

  // Khi form values thay đổi, callback về parent (không submit API)
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
    };
    onFormComplete?.(formData);
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
          Tell us what you need. After filling the form, please upload your files below.
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

          <Form.Item label="Description" name="description" rules={[requiredMsg]}>
            <TextArea
              rows={4}
              placeholder="Describe your request in detail..."
            />
          </Form.Item>

          <Form.Item label="Contact Name" name="contactName" rules={[requiredMsg]}>
            <Input size="large" placeholder="Your full name" />
          </Form.Item>

          <Form.Item
            label="Contact Email"
            name="contactEmail"
            rules={[requiredMsg, { type: 'email', message: 'Invalid email' }]}
          >
            <Input size="large" placeholder="you@example.com" />
          </Form.Item>

          <Form.Item label="Contact Phone" name="contactPhone" rules={[requiredMsg]}>
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
        </Form>
        <p className={styles.nextStep} style={{ marginTop: 16, textAlign: 'center', color: '#888' }}>
          ↓ After filling the form, please upload your files below ↓
        </p>
      </div>
    </section>
  );
}
