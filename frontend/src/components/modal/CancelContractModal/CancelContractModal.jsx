import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import toast from 'react-hot-toast';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const CancelContractModal = ({
  visible,
  onCancel,
  onConfirm,
  loading,
  isManager = false,
  isDraft = false,
}) => {
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
      toast.error('Error when confirming cancel contract', { duration: 5000, position: 'top-center' });
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Xác định action type dựa vào isManager và isDraft
  const actionType = isManager ? (isDraft ? 'cancel' : 'revoke') : 'cancel';
  const actionText = actionType === 'revoke' ? 'thu hồi' : 'hủy';
  const actionTextCapitalized = actionType === 'revoke' ? 'Thu hồi' : 'Hủy';

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined
            style={{ color: '#ff4d4f', marginRight: 8 }}
          />
          {actionTextCapitalized} Contract
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={`Confirm ${actionText}`}
      cancelText="Close"
      okButtonProps={{ danger: true }}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}>
          Are you sure you want to {actionText} this contract?
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          {isManager && isDraft ? (
            <>
              After canceling, contract DRAFT will be changed to the status{' '}
              <strong>CANCELED_BY_MANAGER</strong>.
            </>
          ) : isManager ? (
            <>
              After revoking, contract will be changed to the status{' '}
              <strong>CANCELED_BY_MANAGER</strong> and customer will receive a notification about this revocation.
            </>
          ) : (
            <>
              After canceling, contract will be changed to the status{' '}
              <strong>CANCELED_BY_CUSTOMER</strong> and manager will receive a notification about this cancellation.
            </>
          )}
        </p>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label={`Reason for ${actionText} contract`}
          rules={[
            {
              required: true,
              message: `Please enter the reason for ${actionText} contract`,
            },
            {
              min: 10,
              message: `The reason for ${actionText} contract must be at least 10 characters`,
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder={`Please enter the reason for ${actionText} contract (minimum 10 characters)...`}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CancelContractModal;
