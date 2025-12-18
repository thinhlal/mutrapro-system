import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { OAuthConfig } from '../../../config/OAuthConfig';
import { getRoleBasedRedirectPath } from '../../../utils/roleRedirect';
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
                 ${errors.password ? styles.inputError : ''}`}
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
              <label className={styles.checkboxLabel}></label>
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

export default LoginPage;
