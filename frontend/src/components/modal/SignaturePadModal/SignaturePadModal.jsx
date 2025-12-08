import React, { useRef, useState, useEffect } from 'react';
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
const SignaturePadModal = ({
  visible,
  onCancel,
  onConfirm,
  loading = false,
}) => {
  const sigPadRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (visible && sigPadRef.current) {
      // Delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        try {
          const canvas = sigPadRef.current?.getCanvas();
          if (canvas) {
            // Force canvas to be interactive
            canvas.style.pointerEvents = 'auto';
            canvas.style.touchAction = 'none';

            // Ensure canvas context is ready
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Reset canvas state
              sigPadRef.current.clear();
              setIsEmpty(true);
            }
          }
        } catch (error) {
          console.error('Error initializing signature canvas:', error);
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [visible]);

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
      destroyOnClose={true}
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
              width: 556,
              height: 250,
            }}
            onEnd={handleEnd}
            backgroundColor="#ffffff"
            penColor="#000000"
            minWidth={2}
            maxWidth={3}
            velocityFilterWeight={0.7}
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
