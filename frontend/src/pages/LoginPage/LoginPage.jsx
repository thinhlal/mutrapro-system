import { useState } from 'react'; // Import useState
import { Link, useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../../contexts/AuthContext'; // Import Zustand store
import { Toaster, toast } from 'react-hot-toast'; // Import toast để thông báo

function LoginPage() {
  const navigate = useNavigate();
  // Lấy action `login` và state `loading` từ Zustand store
  const { login, loading } = useAuth();

  // State cục bộ để quản lý email và password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Không làm gì nếu đang loading

    try {
      // Gọi action login từ Zustand store
      //
      await login(email, password);

      // Nếu thành công (không có lỗi)
      toast.success('Đăng nhập thành công!');

      // Chuyển hướng đến trang dashboard hoặc trang chính sau khi đăng nhập
      // Dựa theo file `src/stores/myFilesStore.jsx` của bạn, có vẻ '/my-drive' là trang chính
      navigate('/my-drive'); 
      
    } catch (error) {
      // Lỗi sẽ được ném từ store (đã được xử lý trong authService)
      //
      toast.error(error.message || 'Email hoặc mật khẩu không chính xác');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Component để hiển thị toast */}
      <Toaster position="top-right" />

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
          <h1 className={styles.title}>Chào mừng trở lại</h1>
          <p className={styles.subtitle}>
            Đăng nhập để tiếp tục trải nghiệm soạn nhạc chuyên nghiệp.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Đăng nhập</h2>
            <p>
              Chưa có tài khoản?{' '}
              <Link to="/register" className={styles.link}> {/* Sửa thành /register */}
                Đăng ký ngay
              </Link>
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input
                id="email"
                name="email"
                type="email"
                placeholder=" "
                className={styles.input}
                required
                autoComplete="email"
                value={email} // Thêm value
                onChange={(e) => setEmail(e.target.value)} // Thêm onChange
                disabled={loading} // Vô hiệu hóa khi đang loading
              />
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
            </div>

            <div className={styles.inputGroup}>
              <input
                id="password"
                name="password"
                type="password"
                placeholder=" "
                className={styles.input}
                required
                autoComplete="current-password"
                value={password} // Thêm value
                onChange={(e) => setPassword(e.target.value)} // Thêm onChange
                disabled={loading} // Vô hiệu hóa khi đang loading
              />
              <label htmlFor="password" className={styles.label}>
                Mật khẩu
              </label>
            </div>

            <div className={styles.optionsRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Ghi nhớ tôi</span>
              </label>
              <button type="button" className={styles.textButton}>
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading} // Vô hiệu hóa khi đang loading
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <div className={styles.divider}>
              <span>hoặc</span>
            </div>

            <div className={styles.socialRow}>
              <button type="button" className={styles.socialButton}>
                <GoogleIcon />
                <span>Tiếp tục với Google</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;