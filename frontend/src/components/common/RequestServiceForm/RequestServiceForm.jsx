// src/pages/ServiceRequest/components/RequestServiceForm/RequestServiceForm.jsx
import { useMemo } from "react";
import { Form, Input, Radio, Button, message } from "antd";
import styles from "./RequestServiceForm.module.css";

const SERVICE_OPTIONS = [
  { label: "Transcription (Sound → Sheet)", value: "transcription" },
  { label: "Arrangement", value: "arrangement" },
  {
    label: "Arrangement + Recording (with Vocalist)",
    value: "arrangement_with_recording",
  },
  { label: "Recording (Studio Booking)", value: "recording" },
];

export default function RequestServiceForm({ onCreated }) {
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    // TODO: call API create service-request nếu có; hiện tại demo UI
    message.success("Your request has been created!");
    onCreated?.(values.serviceType);
  };

  const requiredMsg = useMemo(
    () => ({ required: true, message: "Required" }),
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
          Tell us what you need. After creating the request, you’ll be prompted
          to upload the right files.
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ serviceType: "transcription" }}
          className={styles.form}
        >
          <Form.Item label="Full Name" name="fullName" rules={[requiredMsg]}>
            <Input placeholder="e.g., John Doe" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[requiredMsg, { type: "email", message: "Invalid email" }]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item label="Phone" name="phone" rules={[requiredMsg]}>
            <Input placeholder="+84 ..." />
          </Form.Item>

          <Form.Item
            label="Service Type"
            name="serviceType"
            rules={[requiredMsg]}
          >
            <Radio.Group
              options={SERVICE_OPTIONS}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>

          <Form.Item label="Notes (optional)" name="notes">
            <Input.TextArea
              rows={3}
              placeholder="Any details we should know?"
            />
          </Form.Item>

          <div className={styles.actions}>
            <Button type="primary" size="large" htmlType="submit">
              Create Request
            </Button>
          </div>
        </Form>
      </div>
    </section>
  );
}
