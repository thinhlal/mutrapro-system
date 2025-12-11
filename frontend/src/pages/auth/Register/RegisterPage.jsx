import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { OAuthConfig } from '../../../config/OAuthConfig';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Handle input change
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field and general error when user types
    if (errors[name] || errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Please enter first name';
    } else if (formData.firstName.trim().length > 8) {
      newErrors.firstName = 'Max is 8 characters';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Please enter last name';
    } else if (formData.lastName.trim().length > 8) {
      newErrors.lastName = 'Max is 8 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter password';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'Please agree to terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Google OAuth (reuse login logic)
  const handleGoogleLogin = () => {
    try {
      const targetUrl =
        `${OAuthConfig.authUri}?` +
        `client_id=${OAuthConfig.clientId}&` +
        `redirect_uri=${encodeURIComponent(OAuthConfig.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(OAuthConfig.scope)}`;
      window.location.href = targetUrl;
    } catch (error) {
      console.error('Google login error:', error);
      setErrors({ general: 'Google login error' });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (loading) return;

    // Clear previous success message
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      // Prepare register data according to backend RegisterRequest
      const registerData = {
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        address: formData.address || null,
        role: 'CUSTOMER', // Default role
      };

      await register(registerData);

      setSuccessMessage(
        'Registration successful! Please check your email to verify your account. Redirecting...'
      );

      // Redirect to verify email page after 2 seconds
      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
      }, 2000);
    } catch (error) {
      const errorMessage =
        error.message || error.data?.message || 'Registration failed';
      setErrors({ general: errorMessage });
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.gradientBg} />
      <div className={styles.container}>
        <button
          type="button"
          aria-label="Quay lại trang chủ"
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          <span className={styles.backIcon}>&larr;</span>
          <span className={styles.backText}>Back</span>
        </button>
        <div className={styles.leftPane}>
          <div className={styles.brand}>MuTraPro</div>
          <h1 className={styles.title}>Create New Account</h1>
          <p className={styles.subtitle}>
            Join the community of professional musicians and composers.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Sign Up</h2>
            <p>
              Already have an account?{' '}
              <Link to="/login" className={styles.link}>
                Sign in
              </Link>
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {successMessage && (
              <div className={styles.successMessage}>{successMessage}</div>
            )}

            {errors.general && (
              <div className={styles.errorMessage}>{errors.general}</div>
            )}

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder=" "
                  className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                <label htmlFor="firstName" className={styles.label}>
                  First Name
                </label>
                {errors.firstName && (
                  <span className={styles.errorText}>{errors.firstName}</span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder=" "
                  className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                <label htmlFor="lastName" className={styles.label}>
                  Last Name
                </label>
                {errors.lastName && (
                  <span className={styles.errorText}>{errors.lastName}</span>
                )}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <input
                id="email"
                name="email"
                type="email"
                placeholder=" "
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="email"
              />
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              {errors.email && (
                <span className={styles.errorText}>{errors.email}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                className={`${styles.input} ${styles.passwordInput}
                 ${errors.password ? styles.inputError : ''}`}
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="new-password"
              />
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(prev => !prev)}
                disabled={loading}
              >
                {showPassword ? (
                  <VisibilityOffIcon fontSize="small" />
                ) : (
                  <VisibilityIcon fontSize="small" />
                )}
              </button>
              {errors.password && (
                <span className={styles.errorText}>{errors.password}</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder=" "
                className={`${styles.input} ${styles.passwordInput}
                ${errors.confirmPassword ? styles.inputError : ''}`}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="new-password"
              />
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(prev => !prev)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <VisibilityOffIcon fontSize="small" />
                ) : (
                  <VisibilityIcon fontSize="small" />
                )}
              </button>
              {errors.confirmPassword && (
                <span className={styles.errorText}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="agreeToTerms"
                className={styles.checkbox}
                checked={formData.agreeToTerms}
                onChange={handleChange}
                disabled={loading}
                required
              />
              <span>I agree to the terms and conditions</span>
            </label>
            {errors.agreeToTerms && (
              <span className={styles.errorText}>{errors.agreeToTerms}</span>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Create Account'}
            </button>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <div className={styles.socialRow}>
              <button
                type="button"
                className={styles.socialButton}
                onClick={handleGoogleLogin}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '8px' }}
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
