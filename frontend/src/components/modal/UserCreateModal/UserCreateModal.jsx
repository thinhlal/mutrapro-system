import { Modal, Form, Input, Select, Switch } from 'antd';
import PropTypes from 'prop-types';

const { Option } = Select;

export default function UserCreateModal({ visible, onCancel, onSubmit, form, loading = false }) {
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  return (
    <Modal
      title="Create New User"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      okText="Create"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please input email!' },
            { type: 'email', message: 'Please enter a valid email!' },
          ]}
        >
          <Input placeholder="user@example.com" />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: 'Please input password!' },
            { min: 8, message: 'Password must be at least 8 characters!' },
          ]}
        >
          <Input.Password placeholder="Enter password (min 8 characters)" />
        </Form.Item>

        <Form.Item
          label="Full Name"
          name="fullName"
          rules={[{ required: true, message: 'Please input full name!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Role"
          name="role"
          rules={[{ required: true, message: 'Please select role!' }]}
        >
          <Select placeholder="Select role">
            <Option value="SYSTEM_ADMIN">System Admin</Option>
            <Option value="MANAGER">Manager</Option>
            <Option value="CUSTOMER">Customer</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Phone"
          name="phone"
          rules={[
            {
              pattern: /^\d{10}$/,
              message: 'Phone number must be exactly 10 digits!',
            },
          ]}
        >
          <Input placeholder="Enter 10 digit phone number" maxLength={10} />
        </Form.Item>

        <Form.Item label="Address" name="address">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item
          label="Email Verified"
          name="emailVerified"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label="Active"
          name="isActive"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

UserCreateModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  form: PropTypes.object.isRequired,
  loading: PropTypes.bool,
};

