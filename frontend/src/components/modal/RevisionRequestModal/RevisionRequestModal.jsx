import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';

const { TextArea } = Input;

const RevisionRequestModal = ({ open, onCancel, onConfirm, loading }) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onConfirm(values.reason);
      form.resetFields();
    } catch (error) {
      if (error.errorFields) {
        // Validation errors - already handled by Form
        return;
      }
      toast.error('Error sending revision request for contract', { duration: 5000, position: 'top-center' });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  return (
    <Modal
      title="Request Contract Revision"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Send Request"
      cancelText="Cancel"
      width={600}
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        Please describe the changes you want to make to this contract.
        The manager will create a new version based on your request.
      </p>
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Revision Request Reason"
          rules={[
            {
              required: true,
              message: 'Please enter the revision request reason',
            },
            { min: 10, message: 'Reason must be at least 10 characters' },
          ]}
        >
          <TextArea
            rows={6}
            placeholder="Example: I want to change the SLA from 7 days to 10 days, and increase the number of free revisions from 1 to 2..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

RevisionRequestModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default RevisionRequestModal;
