import { Link, useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css";

function LoginPage() {
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
          <h1 className={styles.title}>Chào mừng trở lại</h1>
          <p className={styles.subtitle}>
            Đăng nhập để tiếp tục trải nghiệm chuyển soạn nhạc chuyên nghiệp.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Đăng nhập</h2>
            <p>
              Chưa có tài khoản? {" "}
              <Link to="/sign-up" className={styles.link}>
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

            <button type="submit" className={styles.submitButton}>
              Đăng nhập
            </button>

            <div className={styles.divider}>
              <span>hoặc</span>
            </div>

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

export default LoginPage;
