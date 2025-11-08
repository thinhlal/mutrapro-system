import styles from './VerifyEmailPage.module.css';

import React, { useState, useEffect, useRef } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import axiosInstancePublic from '../../../utils/axiosInstancePublic';

import { API_CONFIG, API_ENDPOINTS } from '../../../config/apiConfig';

import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';

import LoadingScreen from '../../../components/LoadingScreen/LoadingScreen';

import { toast } from 'react-hot-toast';

import MailOutlineIcon from '@mui/icons-material/MailOutline';

import SecurityIcon from '@mui/icons-material/Security';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function VerifyEmailPage() {
  const [verificationCode, setVerificationCode] = useState([
    '',

    '',

    '',

    '',

    '',

    '',
  ]);

  const [loading, setLoading] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [isVerified, setIsVerified] = useState(false);

  const [timer, setTimer] = useState(0);

  const [canResend, setCanResend] = useState(true);

  const [codeExpiry, setCodeExpiry] = useState(0); // Will be calculated from localStorage

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const email = searchParams.get('email');

  // Refs for OTP inputs

  const inputRefs = useRef([]);

  // Flag to prevent multiple API calls

  const hasRequestedCode = useRef(false);

  // Flag to prevent multiple verification attempts

  const isVerifying = useRef(false);

  // Store expiry timestamp to fix countdown drift when tab is inactive
  const expiryTimestampRef = useRef(null);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    } else if (!hasRequestedCode.current) {
      hasRequestedCode.current = true;

      // Check verification status first (không tạo code mới)

      const checkVerificationStatus = async () => {
        try {
          const response = await axiosInstancePublic.get(
            `${API_ENDPOINTS.USER.VERIFICATION_STATUS}?email=${encodeURIComponent(email)}`
          );

          if (response.data.statusCode === 200 && response.data.data) {
            const result = response.data.data;

            console.log('Verification status:', result);

            if (result.emailVerified) {
              // Email đã verified, redirect về login

              setErrorMessage('Email already verified. You can login now.');

              setTimeout(() => navigate('/login'), 1000);

              return;
            }

            if (result.hasActiveCode && result.remainingSeconds > 0) {
              // Có code active, chỉ set countdown mà không gửi email mới

              setCodeExpiry(result.remainingSeconds);
              expiryTimestampRef.current =
                Date.now() + result.remainingSeconds * 1000;

              setErrorMessage(''); // Clear loading message

              console.log('Using existing verification code, no email sent');
            } else {
              // Không có code active hoặc đã hết hạn, tạo code mới

              await requestNewVerificationCode();
            }
          }
        } catch (err) {
          console.error('Error checking verification status:', err);

          // Fallback: tạo code mới nếu API check status fail

          await requestNewVerificationCode();
        }
      };

      // Function để request code mới (chỉ khi cần thiết)

      const requestNewVerificationCode = async () => {
        try {
          const response = await axiosInstancePublic.post(
            `${API_ENDPOINTS.USER.RESEND_VERIFICATION}?email=${encodeURIComponent(email)}`
          );

          if (response.data.statusCode === 200 && response.data.data) {
            const apiResult = response.data.data;

            console.log('New verification code requested:', apiResult);

            const remainingSeconds = apiResult.remainingSeconds || 15 * 60;
            setCodeExpiry(remainingSeconds);
            expiryTimestampRef.current = Date.now() + remainingSeconds * 1000;

            setErrorMessage(''); // Clear loading message
          }
        } catch (err) {
          if (err.response?.data?.message === 'Email already verified') {
            setErrorMessage('Email already verified. You can login now.');

            setTimeout(() => navigate('/login'), 2000);
          } else {
            setErrorMessage(
              'Failed to get verification code. Please try resending.'
            );
          }
        }
      };

      checkVerificationStatus();
    }
  }, [email, navigate]);

  useEffect(() => {
    let interval;

    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer => timer - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [timer]);

  // Code expiry countdown - calculate from timestamp to avoid drift when tab is inactive
  useEffect(() => {
    let expiryInterval;

    if (codeExpiry > 0 && !isVerified && expiryTimestampRef.current) {
      expiryInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(
          0,
          Math.floor((expiryTimestampRef.current - now) / 1000)
        );

        if (remaining <= 0) {
          setErrorMessage(
            'Verification code has expired. Please request a new code.'
          );

          setCodeExpiry(0);
        } else {
          setCodeExpiry(remaining);
        }
      }, 1000);
    }

    return () => clearInterval(expiryInterval);
  }, [codeExpiry, isVerified]);

  // Format time for display (MM:SS)

  const formatTime = seconds => {
    const minutes = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...verificationCode];

    newCode[index] = value;

    setVerificationCode(newCode);

    setErrorMessage('');

    // Auto focus next input

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all fields are filled (only if not already loading/verifying)

    if (
      newCode.every(digit => digit !== '') &&
      newCode.join('').length === 6 &&
      !loading &&
      !isVerified &&
      !isVerifying.current
    ) {
      setTimeout(() => handleVerifyCode(null, newCode.join('')), 100);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace

    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle arrow keys

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = e => {
    e.preventDefault();

    const pastedData = e.clipboardData

      .getData('text')

      .replace(/\D/g, '')

      .slice(0, 6);

    if (
      pastedData.length === 6 &&
      !loading &&
      !isVerified &&
      !isVerifying.current
    ) {
      const newCode = pastedData.split('');

      setVerificationCode(newCode);

      setErrorMessage('');

      setTimeout(() => handleVerifyCode(null, pastedData), 100);
    }
  };

  const handleVerifyCode = async (e, codeToVerify = null) => {
    if (e) e.preventDefault();

    // Prevent duplicate calls

    if (isVerified || isVerifying.current) return;

    isVerifying.current = true;

    setErrorMessage('');

    const code = codeToVerify || verificationCode.join('');

    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');

      isVerifying.current = false;

      return;
    }

    try {
      console.log('Verifying email with code:', code);

      const response = await axiosInstancePublic.post(
        `${API_ENDPOINTS.USER.VERIFY_EMAIL}?code=${code}&email=${encodeURIComponent(email)}`
      );

      if (response.data.statusCode === 200) {
        setIsVerified(true);

        toast.success('Email verified successfully! Redirecting to login...');

        setLoading(true);

        setTimeout(() => {
          navigate('/login');
        }, 1000);
      }
    } catch (err) {
      setIsVerified(false); // Reset on error

      console.error('Verification error:', err);

      // Check if error response exists
      if (err.response?.data) {
        const errorData = err.response.data;

        // Handle specific error messages
        if (errorData.message === 'Invalid verification code') {
          setErrorMessage('Invalid code. Please check and try again.');
        } else if (errorData.message === 'Token expired') {
          setErrorMessage(
            'Verification code has expired. Please request a new code.'
          );
        } else if (errorData.message === 'Email already verified') {
          setErrorMessage('Email already verified. You can login now.');

          setTimeout(() => navigate('/login'), 1000);
        } else if (errorData.message) {
          setErrorMessage(errorData.message);
        } else {
          setErrorMessage('Invalid verification code. Please try again.');
        }
      } else {
        setErrorMessage('An error occurred. Please try again.');
      }

      // Clear the code on error

      setVerificationCode(['', '', '', '', '', '']);

      inputRefs.current[0]?.focus();
    } finally {
      isVerifying.current = false;
    }
  };

  const handleResendCode = async () => {
    if (!canResend || !email) return;

    setResendLoading(true);

    setErrorMessage('');

    try {
      const response = await axiosInstancePublic.post(
        `${API_ENDPOINTS.USER.RESEND_VERIFICATION}?email=${email}`
      );

      if (response.data.statusCode === 200) {
        // Only show toast, don't set successMessage to avoid button state change

        toast.success('New verification code sent to your email!');

        // Use expiry time from API response

        const apiResult = response.data.data;

        console.log('Manual resend verification code:', apiResult);

        const remainingSeconds =
          apiResult && apiResult.remainingSeconds
            ? apiResult.remainingSeconds
            : 15 * 60;
        setCodeExpiry(remainingSeconds);
        expiryTimestampRef.current = Date.now() + remainingSeconds * 1000;

        setCanResend(false);

        setTimer(60); // 60 seconds cooldown

        setErrorMessage(''); // Clear any existing error

        setVerificationCode(['', '', '', '', '', '']); // Clear current code

        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      if (err.response?.data?.message === 'Email already verified') {
        setErrorMessage('Email already verified. You can login now.');

        setTimeout(() => navigate('/login'), 2000);
      } else {
        setErrorMessage(
          'Failed to resend verification code. Please try again later.'
        );
      }

      console.error('Resend error:', err);
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Verifying..."
        subMessage="Please wait while we verify your email"
      />
    );
  }

  return (
    <div className={styles.verifyEmailMain}>
      <div className={styles.backgroundOverlay}></div>

      <div className={styles.backButton} onClick={() => navigate('/login')}>
        <KeyboardReturnIcon /> Back to Login
      </div>

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>
              {isVerified ? (
                <CheckCircleIcon style={{ fontSize: '32px', color: 'white' }} />
              ) : (
                <SecurityIcon style={{ fontSize: '32px', color: 'white' }} />
              )}
            </div>

            <h1>Email Verification</h1>

            <p className={styles.subtitle}>
              <MailOutlineIcon
                style={{ fontSize: '16px', verticalAlign: 'middle' }}
              />
              We sent a 6-digit verification code to
              <br />
              <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className={styles.form}>
            <div className={styles.codeInputContainer}>
              <label>Enter verification code</label>

              <div className={styles.otpInputGroup} onPaste={handlePaste}>
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => (inputRefs.current[index] = el)}
                    type="text"
                    value={digit}
                    onChange={e =>
                      handleInputChange(
                        index,

                        e.target.value.replace(/\D/g, '')
                      )
                    }
                    onKeyDown={e => handleKeyDown(index, e)}
                    className={`${styles.otpInput} ${digit ? styles.filled : ''} ${errorMessage ? styles.error : ''} ${isVerified ? styles.success : ''}`}
                    maxLength="1"
                    autoFocus={index === 0}
                    autoComplete="off"
                  />
                ))}
              </div>

              <div className={styles.codeHint}>
                <SecurityIcon
                  style={{
                    fontSize: '14px',

                    marginRight: '4px',

                    verticalAlign: 'middle',
                  }}
                />
                Code expires in {formatTime(codeExpiry)}
              </div>
            </div>

            {errorMessage && (
              <div className={`${styles.message} ${styles.errorMessage}`}>
                <span className={styles.messageIcon}>⚠️</span>

                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className={`${styles.verifyButton} ${isVerified ? styles.success : ''}`}
              disabled={
                isVerifying.current || verificationCode.some(digit => !digit)
              }
            >
              {isVerifying.current ? (
                <div className={styles.buttonLoading}>
                  <div className={styles.spinner}></div>
                  Verifying...
                </div>
              ) : isVerified ? (
                <div className={styles.buttonLoading}>
                  <CheckCircleIcon style={{ fontSize: '18px' }} />
                  Verified!
                </div>
              ) : (
                'Verify Email'
              )}
            </button>

            <div className={styles.resendSection}>
              <p>Didn't receive the code?</p>

              <button
                type="button"
                className={`${styles.resendButton} ${!canResend ? styles.disabled : ''}`}
                onClick={handleResendCode}
                disabled={!canResend || resendLoading}
              >
                {resendLoading ? (
                  <div className={styles.buttonLoading}>
                    <div className={`${styles.spinner} ${styles.small}`}></div>
                    Sending...
                  </div>
                ) : timer > 0 ? (
                  `Resend in ${timer}s`
                ) : (
                  'Resend Code'
                )}
              </button>
            </div>
          </form>

          <div className={styles.footer}>
            <p>
              By verifying your email, you agree to our{' '}
              <a href="#" className={styles.link}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className={styles.link}>
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
