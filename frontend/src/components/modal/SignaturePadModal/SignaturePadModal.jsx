import React, { useRef, useState } from 'react';
import { Modal, Button, Space, Alert } from 'antd';
import { ClearOutlined, CheckOutlined } from '@ant-design/icons';
import SignatureCanvas from 'react-signature-canvas';
import styles from './SignaturePadModal.module.css';

/**
 * SignaturePadModal - Modal for drawing customer signature
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onCancel - Callback when user cancels
 * @param {function} onConfirm - Callback with signature data URL when user confirms
 * @param {boolean} loading - Whether signature is being processed
 */
const SignaturePadModal = ({ visible, onCancel, onConfirm, loading = false }) => {
  const sigPadRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

  const handleConfirm = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      // Get signature as data URL (base64 encoded PNG)
      const signatureDataURL = sigPadRef.current.toDataURL('image/png');
      onConfirm(signatureDataURL);
    }
  };

  const handleCancel = () => {
    handleClear();
    onCancel();
  };

  return (
    <Modal
      title="Draw Your Signature"
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={null}
      centered
      maskClosable={!loading}
      keyboard={!loading}
      closable={!loading}
    >
      <div className={styles.container}>
        <Alert
          message="Please sign below"
          description="Draw your signature in the box below using your mouse or touchscreen. This signature will be used to electronically sign the contract."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div className={styles.canvasWrapper}>
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              className: styles.signatureCanvas,
            }}
            onEnd={handleEnd}
            backgroundColor="#ffffff"
            penColor="#000000"
          />
        </div>

        <div className={styles.hint}>
          Sign above using your mouse or touchscreen
        </div>

        <Space className={styles.actions}>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={isEmpty || loading}
          >
            Clear
          </Button>
          <Button onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleConfirm}
            disabled={isEmpty || loading}
            loading={loading}
          >
            Confirm Signature
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default SignaturePadModal;

