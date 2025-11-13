import React from 'react';
import { Modal, Alert } from 'antd';
import PropTypes from 'prop-types';

const ViewCancellationReasonModal = ({
  open,
  onCancel,
  reason,
  isCanceled = true,
}) => {
  return (
    <Modal
      title={isCanceled ? 'Lý do hủy Contract' : 'Lý do yêu cầu sửa Contract'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Alert
        message={isCanceled ? 'Contract đã bị hủy' : 'Contract cần chỉnh sửa'}
        description={
          <div style={{ marginTop: 12 }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>
              {isCanceled ? 'Lý do hủy:' : 'Lý do yêu cầu sửa:'}
            </strong>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: '4px',
                whiteSpace: 'pre-line',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {reason || 'Không có lý do được cung cấp'}
            </div>
          </div>
        }
        type={isCanceled ? 'error' : 'warning'}
        showIcon
      />
    </Modal>
  );
};

ViewCancellationReasonModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  reason: PropTypes.string,
  isCanceled: PropTypes.bool,
};

export default ViewCancellationReasonModal;
