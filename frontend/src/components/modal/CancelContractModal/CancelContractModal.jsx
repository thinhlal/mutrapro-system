import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const CancelContractModal = ({ visible, onCancel, onConfirm, loading }) => {
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
      message.error('Lỗi khi xác nhận hủy contract');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Hủy Contract
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Xác nhận hủy"
      cancelText="Đóng"
      okButtonProps={{ danger: true }}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}>
          Bạn có chắc chắn muốn hủy contract này không?
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Sau khi hủy, contract sẽ chuyển sang trạng thái <strong>CANCELED_BY_CUSTOMER</strong> và 
          manager sẽ nhận được thông báo về việc hủy này.
        </p>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Lý do hủy"
          rules={[
            { required: true, message: 'Vui lòng nhập lý do hủy contract' },
            { min: 10, message: 'Lý do hủy phải có ít nhất 10 ký tự' },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Vui lòng nhập lý do hủy contract (tối thiểu 10 ký tự)..."
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CancelContractModal;

