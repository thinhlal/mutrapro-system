import { useMemo } from 'react';
import { Form, Input, Button, message, Tag } from 'antd';
import styles from './RequestServiceForm.module.css';

const SERVICE_LABELS = {
  transcription: 'Transcription (Sound → Sheet)',
  arrangement: 'Arrangement',
  arrangement_with_recording: 'Arrangement + Recording (with Vocalist)',
  recording: 'Recording (Studio Booking)',
};

export default function RequestServiceForm({ onCreated, serviceType }) {
  const [form] = Form.useForm();

  const onFinish = async values => {
    // TODO: call API create service-request nếu có; hiện tại demo UI
    message.success('Your request has been created!');
    onCreated?.(serviceType || values.serviceType);
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
          Tell us what you need. After creating the request, you'll be prompted
          to upload the right files.
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ serviceType: serviceType || 'transcription' }}
          className={styles.form}
        >
          <Form.Item label="Full Name" name="fullName" rules={[requiredMsg]}>
            <Input size="large" placeholder="e.g., John Doe" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[requiredMsg, { type: 'email', message: 'Invalid email' }]}
          >
            <Input size="large" placeholder="you@example.com" />
          </Form.Item>

          <Form.Item label="Phone" name="phone" rules={[requiredMsg]}>
            <Input size="large" placeholder="+84 ..." />
          </Form.Item>

          {serviceType && (
            <Form.Item label="Service Type">
              <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                {SERVICE_LABELS[serviceType] || serviceType}
              </Tag>
            </Form.Item>
          )}

          <Form.Item label="Notes (optional)" name="notes">
            <Input.TextArea
              rows={3}
              placeholder="Any details we should know?"
            />
          </Form.Item>

          {/* <div className={styles.actions}>
            <Button
              className={styles.ctaBtn}
              type="primary"
              size="large"
              htmlType="submit"
            >
              Create Request
            </Button>
          </div> */}
        </Form>
      </div>
    </section>
  );
}
