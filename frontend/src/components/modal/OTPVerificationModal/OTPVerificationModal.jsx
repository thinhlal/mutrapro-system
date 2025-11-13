import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Alert, Typography, Statistic } from 'antd';
import { LockOutlined, ReloadOutlined, CheckOutlined } from '@ant-design/icons';
import styles from './OTPVerificationModal.module.css';

const { Text } = Typography;
const { Countdown } = Statistic;

/**
 * OTPVerificationModal - Modal for entering OTP code
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onCancel - Callback when user cancels
 * @param {function} onVerify - Callback with OTP code when user verifies
 * @param {function} onResend - Callback when user requests to resend OTP
 * @param {boolean} loading - Whether OTP is being verified
 * @param {string} error - Error message if any
 * @param {number} expiresAt - OTP expiration timestamp (milliseconds)
 * @param {number} maxAttempts - Maximum OTP attempts allowed
 * @param {string} email - Email address OTP was sent to
 */
const OTPVerificationModal = ({
  visible,
  onCancel,
  onVerify,
  onResend,
  loading = false,
  error = null,
  expiresAt,
  maxAttempts = 3,
  email = '',
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Reset OTP when modal opens/closes
  useEffect(() => {
    if (visible) {
      setOtpCode('');
      setIsExpired(false);
    }
  }, [visible]);

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtpCode(value);
    }
  };

  const handleVerify = () => {
    if (otpCode.length === 6) {
      onVerify(otpCode);
    }
  };

  const handleResend = () => {
    setOtpCode('');
    setIsExpired(false);
    onResend();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && otpCode.length === 6 && !loading) {
      handleVerify();
    }
  };

  const handleExpire = () => {
    setIsExpired(true);
  };

  return (
    <Modal
      title={
        <Space>
          <LockOutlined />
          <span>Verify OTP Code</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={480}
      footer={null}
      centered
      maskClosable={!loading}
      keyboard={!loading}
      closable={!loading}
    >
      <div className={styles.container}>
        <Alert
          message="Enter OTP Code"
          description={
            <div>
              We've sent a 6-digit verification code to{' '}
              <strong>{email || 'your email address on file'}</strong>. Please enter it
              below to complete the signature. You have {maxAttempts} attempts.
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {error && (
          <Alert
            message="Verification Failed"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {expiresAt && !isExpired && (
          <div className={styles.countdown}>
            <Text type="secondary">Code expires in: </Text>
            <Countdown
              value={expiresAt}
              format="mm:ss"
              onFinish={handleExpire}
              valueStyle={{ fontSize: 16, color: '#1890ff' }}
            />
          </div>
        )}

        {isExpired && (
          <Alert
            message="OTP Expired"
            description="Your OTP code has expired. Please request a new one."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div className={styles.inputWrapper}>
          <Input
            placeholder="Enter 6-digit OTP"
            value={otpCode}
            onChange={handleOtpChange}
            onKeyPress={handleKeyPress}
            maxLength={6}
            size="large"
            disabled={loading || isExpired}
            className={styles.otpInput}
            autoFocus
          />
          <div className={styles.hint}>
            {otpCode.length}/6 digits entered
          </div>
        </div>

        <Space className={styles.actions}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleResend}
            disabled={loading}
          >
            Resend OTP
          </Button>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleVerify}
            disabled={otpCode.length !== 6 || loading || isExpired}
            loading={loading}
          >
            Verify & Sign
          </Button>
        </Space>

        <div className={styles.footer}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>Note:</strong> By verifying this OTP and signing, you agree to the terms of the contract.
            The signed contract will have the same legal validity as a paper contract.
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default OTPVerificationModal;

