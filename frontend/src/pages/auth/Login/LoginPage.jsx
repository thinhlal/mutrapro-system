import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { OAuthConfig } from '../../../config/OAuthConfig';
import { getRoleBasedRedirectPath } from '../../../utils/roleRedirect';
import { FcGoogle } from 'react-icons/fc';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const { logIn, loading } = useAuth() || {};

  // Get the page user tried to access before being redirected to login
  const from = location.state?.from?.pathname || '/';

  // State cục bộ để quản lý email và password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (loading) return;

    // Clear previous errors
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await logIn(email, password);

      setSuccessMessage('Login successful! Redirecting...');

      // Determine redirect path based on user role
      const userRole = response?.user?.role;
      const redirectPath = getRoleBasedRedirectPath(userRole, from);

      // Redirect to role-based dashboard or requested page
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
    } catch (error) {
      // Check if error is email not verified
      if (error.errorCode === 'USER_4013') {
        setErrors({ general: 'Please verify your email before logging in' });
        // Redirect to verify email page
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else if (error.errorCode === 'AUTH_5016') {
        setErrors({
          general:
            'Account does not have a password. Please login with Google or create a password in Profile.',
        });
      } else {
        setErrors({ general: error.message || 'Incorrect email or password' });
      }
    }
  };

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

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.gradientBg} />
      <div className={styles.container}>
        <button
          type="button"
          aria-label="Quay lại trang chủ"
          className={styles.backButton}
          onClick={() => navigate('/')} // Sửa thành /
        >
          <span className={styles.backIcon}>&larr;</span>
          <span className={styles.backText}>Back</span>
        </button>
        <div className={styles.leftPane}>
          <div className={styles.brand}>MuTraPro</div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to continue your professional music composition experience.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Sign In</h2>
            <p>
              Don't have an account?{' '}
              <Link to="/register" className={styles.link}>
                {' '}
                {/* Sửa thành /register */}
                Sign up now
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

            <div className={styles.inputGroup}>
              <input
                id="email"
                name="email"
                type="email"
                placeholder=" "
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                required
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                disabled={loading}
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
                 ${errors.password ? styles.inputError : ''
                }`}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors(prev => ({ ...prev, password: '' }));
                }}
                disabled={loading}
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

            <div className={styles.optionsRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => navigate('/reset-password')}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading} // Vô hiệu hóa khi đang loading
            >
              {loading ? 'Signing in...' : 'Sign In'}
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

export default LoginPage;
