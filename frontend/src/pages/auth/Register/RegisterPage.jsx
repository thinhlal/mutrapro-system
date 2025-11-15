import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
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
              <button type="button" className={styles.socialButton}>
                <FcGoogle size={20} />
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
