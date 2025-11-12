import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
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
      message.error('Lỗi khi xác nhận hủy contract');
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
      okText={`Xác nhận ${actionText}`}
      cancelText="Đóng"
      okButtonProps={{ danger: true }}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8 }}>
          Bạn có chắc chắn muốn {actionText} contract này không?
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          {isManager && isDraft ? (
            <>
              Sau khi hủy, contract DRAFT sẽ chuyển sang trạng thái{' '}
              <strong>CANCELED_BY_MANAGER</strong>.
            </>
          ) : isManager ? (
            <>
              Sau khi thu hồi, contract sẽ chuyển sang trạng thái{' '}
              <strong>CANCELED_BY_MANAGER</strong> và customer sẽ nhận được
              thông báo về việc thu hồi này.
            </>
          ) : (
            <>
              Sau khi hủy, contract sẽ chuyển sang trạng thái{' '}
              <strong>CANCELED_BY_CUSTOMER</strong> và manager sẽ nhận được
              thông báo về việc hủy này.
            </>
          )}
        </p>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label={`Lý do ${actionText}`}
          rules={[
            {
              required: true,
              message: `Vui lòng nhập lý do ${actionText} contract`,
            },
            {
              min: 10,
              message: `Lý do ${actionText} phải có ít nhất 10 ký tự`,
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder={`Vui lòng nhập lý do ${actionText} contract (tối thiểu 10 ký tự)...`}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CancelContractModal;
