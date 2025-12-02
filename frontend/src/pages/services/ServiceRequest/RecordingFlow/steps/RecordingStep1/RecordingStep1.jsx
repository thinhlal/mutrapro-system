// RecordingStep1.jsx - Form thông tin chính và upload audio
import { useState, useCallback } from 'react';
import { Form, Input, Card, Upload, message, Space } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../../../../contexts/AuthContext';
import styles from './RecordingStep1.module.css';

const { TextArea } = Input;
const { Dragger } = Upload;

export default function RecordingStep1({ data, onComplete }) {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [files, setFiles] = useState(data?.files || []);
  const [submitting, setSubmitting] = useState(false);

  const beforeUpload = useCallback(() => false, []);

  const onChange = async ({ fileList }) => {
    const fileObjs = fileList.map(it => it.originFileObj).filter(Boolean);
    setFiles(fileObjs);
  };

  const clearAll = () => {
    setFiles([]);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (files.length === 0) {
        message.warning(
          'Please upload at least one audio file or reference file.'
        );
        return;
      }

      setSubmitting(true);

      const stepData = {
        ...values,
        files,
        contactEmail: values.contactEmail || user?.email || '',
      };

      onComplete(stepData);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Step 1: Basic Information & Audio Upload
        </h2>
        <p className={styles.description}>
          Please fill in your information and upload audio files or reference
          materials.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          contactName: data?.contactName || user?.fullName || '',
          contactEmail: data?.contactEmail || user?.email || '',
          contactPhone: data?.contactPhone || '',
          title: data?.title || '',
          description: data?.description || '',
          externalGuestCount: data?.externalGuestCount || 0,
        }}
        className={styles.form}
      >
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input size="large" placeholder="e.g., Record Song ABC" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[
            { required: true, message: 'Please enter a description' },
            {
              min: 10,
              message: 'Description must be at least 10 characters long',
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Describe your recording request in detail..."
            showCount
          />
        </Form.Item>

        <Form.Item
          label="Contact Name"
          name="contactName"
          rules={[{ required: true, message: 'Please enter your name' }]}
        >
          <Input size="large" placeholder="Your full name" />
        </Form.Item>

        <Form.Item
          label="Contact Email"
          name="contactEmail"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Invalid email' },
          ]}
        >
          <Input size="large" placeholder="you@example.com" readOnly disabled />
        </Form.Item>

        <Form.Item
          label="Contact Phone"
          name="contactPhone"
          rules={[
            { required: true, message: 'Please enter your phone number' },
          ]}
        >
          <Input size="large" placeholder="+84 ..." />
        </Form.Item>

        <Form.Item
          label="External Guest Count"
          name="externalGuestCount"
          tooltip="Number of external guests you will bring (free limit applies)"
        >
          <Input type="number" size="large" min={0} placeholder="0" />
        </Form.Item>
      </Form>

      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>
          Upload Audio Files or Reference Materials
        </h3>
        <p className={styles.sectionDescription}>
          Upload audio files, lyrics, notation, or other reference materials to
          help the session run smoothly.
        </p>

        {files.length === 0 && (
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
            <p className="ant-upload-text">Drag & drop files here</p>
            <p className="ant-upload-hint">
              Audio files, lyrics, notation, or reference materials
            </p>
          </Dragger>
        )}

        {files.length > 0 && (
          <div className={styles.fileList}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {files.map((f, idx) => (
                <div className={styles.fileItem} key={idx}>
                  <Space>
                    <FileTextOutlined />
                    <span>{f.name}</span>
                    <span className={styles.fileSize}>
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </Space>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={clearAll}
                  className={styles.clearButton}
                >
                  <DeleteOutlined /> Remove all
                </button>
              </div>
            </Space>
          </div>
        )}
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={styles.nextButton}
        >
          {submitting ? 'Processing...' : 'Next: Select Vocalist'}
        </button>
      </div>
    </Card>
  );
}
