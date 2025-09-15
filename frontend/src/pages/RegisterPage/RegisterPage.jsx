import { Link, useNavigate } from "react-router-dom";
import styles from "./RegisterPage.module.css";

function RegisterPage() {
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.gradientBg} />
      <div className={styles.container}>
        <button
          type="button"
          aria-label="Quay lại trang chủ"
          className={styles.backButton}
          onClick={() => navigate("/home")}
        >
          <span className={styles.backIcon}>&larr;</span>
          <span className={styles.backText}>Back</span>
        </button>
        <div className={styles.leftPane}>
          <div className={styles.brand}>MuTraPro</div>
          <h1 className={styles.title}>Tạo tài khoản mới</h1>
          <p className={styles.subtitle}>
            Gia nhập cộng đồng nhạc sĩ và biên soạn viên chuyên nghiệp.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Đăng ký</h2>
            <p>
              Đã có tài khoản? {" "}
              <Link to="/login" className={styles.link}>
                Đăng nhập
              </Link>
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <input id="firstName" name="firstName" type="text" placeholder=" " className={styles.input} required />
                <label htmlFor="firstName" className={styles.label}>Họ</label>
              </div>
              <div className={styles.inputGroup}>
                <input id="lastName" name="lastName" type="text" placeholder=" " className={styles.input} required />
                <label htmlFor="lastName" className={styles.label}>Tên</label>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <input id="email" name="email" type="email" placeholder=" " className={styles.input} required autoComplete="email" />
              <label htmlFor="email" className={styles.label}>Email</label>
            </div>

            <div className={styles.inputGroup}>
              <input id="password" name="password" type="password" placeholder=" " className={styles.input} required autoComplete="new-password" />
              <label htmlFor="password" className={styles.label}>Mật khẩu</label>
            </div>

            <div className={styles.inputGroup}>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder=" " className={styles.input} required autoComplete="new-password" />
              <label htmlFor="confirmPassword" className={styles.label}>Xác nhận mật khẩu</label>
            </div>

            <label className={styles.checkboxLabel}>
              <input type="checkbox" className={styles.checkbox} required />
              <span>Tôi đồng ý với điều khoản và chính sách</span>
            </label>

            <button type="submit" className={styles.submitButton}>Tạo tài khoản</button>

            <div className={styles.divider}><span>hoặc</span></div>

            <div className={styles.socialRow}>
              <button type="button" className={styles.socialButton}>
                <img src="/vite.svg" alt="Google" />
                <span>Tiếp tục với Google</span>
              </button>
              <button type="button" className={styles.socialButton}>
                <img src="/vite.svg" alt="Facebook" />
                <span>Tiếp tục với Facebook</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
