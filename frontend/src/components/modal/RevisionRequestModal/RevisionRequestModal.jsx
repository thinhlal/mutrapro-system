import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import PropTypes from 'prop-types';
import { requestChangeContract } from '../../../services/contractService';

const { TextArea } = Input;

const RevisionRequestModal = ({ open, onCancel, onSuccess, contractId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await requestChangeContract(contractId, values.reason);

      if (response?.status === 'success') {
        message.success('Revision request sent successfully');
        form.resetFields();
        onSuccess?.();
        onCancel?.();
      }
    } catch (error) {
      if (error.errorFields) {
        // Validation errors
        return;
      }
      console.error('Error requesting revision:', error);
      message.error(error?.message || 'Failed to request revision');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  return (
    <Modal
      title="Yêu cầu chỉnh sửa Contract"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Gửi yêu cầu"
      cancelText="Hủy"
      width={600}
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        Vui lòng mô tả những thay đổi bạn muốn thực hiện cho contract này.
        Manager sẽ tạo một phiên bản mới dựa trên yêu cầu của bạn.
      </p>
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Lý do yêu cầu chỉnh sửa"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa',
            },
            { min: 10, message: 'Lý do phải có ít nhất 10 ký tự' },
          ]}
        >
          <TextArea
            rows={6}
            placeholder="Ví dụ: Tôi muốn thay đổi SLA từ 7 ngày thành 10 ngày, và tăng số lần revision miễn phí từ 1 lên 2..."
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
  onSuccess: PropTypes.func,
  contractId: PropTypes.string.isRequired,
};

export default RevisionRequestModal;
