import styles from './ResetPasswordPage.module.css';

import React, { useState, useEffect } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import { API_ENDPOINTS } from '../../../config/apiConfig';

import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';

import axiosInstancePublic from '../../../utils/axiosInstancePublic';

import { toast } from 'react-hot-toast';

import MailOutlineIcon from '@mui/icons-material/MailOutline';

import LockIcon from '@mui/icons-material/Lock';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import LoadingScreen from '../../../components/LoadingScreen/LoadingScreen';

function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1: forgot password, 2: reset password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Check for token in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const resetToken = urlParams.get('token');
    const resetEmail = urlParams.get('email');
    if (resetToken) {
      setToken(resetToken);
      if (resetEmail) {
        setEmail(resetEmail);
      }
      setStep(2);
    }
  }, [location]);

  const validateEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = password => {
    return password.length >= 8;
  };

  const handleForgotPassword = async e => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    setLoading(true);

    // Validation
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstancePublic.post(
        `${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}?email=${encodeURIComponent(email)}`
      );

      if (response.data.statusCode === 200) {
        setMessage(
          'Reset link sent! Please check your email to reset your password.'
        );
        setMessageType('success');
        toast.success('Reset link sent to your email!');
        // Optional: automatically move to step 2 after a delay
        // setTimeout(() => setStep(2), 3000);
      } else {
        setMessage(response.data.message || 'An error occurred');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage(
          'An error occurred while sending the email. Please try again.'
        );
      }
      setMessageType('error');
      toast.error('Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async e => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    setLoading(true);

    // Validation
    const newErrors = {};
    if (!token) {
      newErrors.token = 'Reset token is required';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstancePublic.post(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        {
          email, // Include email in request
          token,
          newPassword,
          confirmPassword,
        }
      );

      if (response.data.statusCode === 200) {
        setMessage('Password reset successfully! Redirecting to login...');
        setMessageType('success');
        toast.success('Password reset successfully!');
        // Redirect to login after success
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage(response.data.message || 'An error occurred');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage(
          'An error occurred while resetting your password. Please try again.'
        );
      }
      setMessageType('error');
      toast.error('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      <div
        className={`${styles.step} ${step >= 1 ? styles.active : ''} ${
          step > 1 ? styles.completed : ''
        }`}
      ></div>
      <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}></div>
    </div>
  );

  const renderForgotPasswordForm = () => (
    <div className={styles.resetPasswordCard}>
      {renderStepIndicator()}
      <div className={styles.header}>
        <div className={styles.icon}>
          <MailOutlineIcon style={{ fontSize: '32px', color: 'white' }} />
        </div>
        <h1>Forgot Password?</h1>
        <p className={styles.subtitle}>
          Don't worry! Enter your email address and we'll send you a link to
          reset your password.
        </p>
      </div>

      {message && (
        <div
          className={
            messageType === 'success'
              ? styles.successMessage
              : styles.errorMessage
          }
        >
          {messageType === 'success' && (
            <CheckCircleIcon
              style={{ fontSize: '20px', verticalAlign: 'middle' }}
            />
          )}
          {message}
        </div>
      )}

      <form
        onSubmit={handleForgotPassword}
        className={styles.resetPasswordForm}
      >
        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            className={errors.email ? styles.inputError : ''}
          />
          {errors.email && (
            <div className={styles.errorText}>{errors.email}</div>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? (
            <div className={styles.buttonLoading}>
              <div className={styles.spinner}></div>
              <div>Sending...</div>
            </div>
          ) : (
            'Send Reset Link'
          )}
        </button>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => navigate('/login')}
          disabled={loading}
        >
          Back to Login
        </button>
      </form>
    </div>
  );

  const renderResetPasswordForm = () => (
    <div className={styles.resetPasswordCard}>
      {renderStepIndicator()}
      <div className={styles.header}>
        <div className={styles.icon}>
          <LockIcon style={{ fontSize: '32px', color: 'white' }} />
        </div>
        <h1>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your new password. Password must be at least 8 characters long.
        </p>
      </div>

      {message && (
        <div
          className={
            messageType === 'success'
              ? styles.successMessage
              : styles.errorMessage
          }
        >
          {messageType === 'success' && (
            <CheckCircleIcon
              style={{ fontSize: '20px', verticalAlign: 'middle' }}
            />
          )}
          {message}
        </div>
      )}

      <form onSubmit={handleResetPassword} className={styles.resetPasswordForm}>
        {/* Only show token input if no token in URL (manual entry) */}
        {!token && (
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Enter reset token from email"
              value={token}
              onChange={e => setToken(e.target.value)}
              disabled={loading}
              className={errors.token ? styles.inputError : ''}
            />
            {errors.token && (
              <div className={styles.errorText}>{errors.token}</div>
            )}
          </div>
        )}

        <div className={styles.inputGroup}>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={loading}
              className={errors.newPassword ? styles.inputError : ''}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.newPassword && (
            <div className={styles.errorText}>{errors.newPassword}</div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.passwordWrapper}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
              className={errors.confirmPassword ? styles.inputError : ''}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className={styles.errorText}>{errors.confirmPassword}</div>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? (
            <div className={styles.buttonLoading}>
              <div className={styles.spinner}></div>
              <div>Resetting...</div>
            </div>
          ) : (
            'Reset Password'
          )}
        </button>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setStep(1)}
          disabled={loading}
        >
          Go Back
        </button>
      </form>
    </div>
  );

  if (loading && messageType === 'success' && step === 2) {
    return (
      <LoadingScreen
        message="Redirecting to login..."
        subMessage="Password reset successfully"
      />
    );
  }

  return (
    <div className={styles.resetPasswordContainer}>
      <div className={styles.backgroundOverlay}></div>

      <div className={styles.backButton} onClick={() => navigate('/login')}>
        <KeyboardReturnIcon /> Back to Login
      </div>

      {step === 1 ? renderForgotPasswordForm() : renderResetPasswordForm()}
    </div>
  );
}

export default ResetPasswordPage;
