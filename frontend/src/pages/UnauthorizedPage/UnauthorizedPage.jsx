// src/pages/UnauthorizedPage/UnauthorizedPage.jsx
import { useNavigate } from 'react-router-dom';
import styles from './UnauthorizedPage.module.css';

function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>403</div>
        <h1 className={styles.title}>Không có quyền truy cập</h1>
        <p className={styles.message}>
          Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị
          viên nếu bạn cho rằng đây là lỗi.
        </p>
        <div className={styles.actions}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            Quay lại
          </button>
          <button onClick={() => navigate('/')} className={styles.homeButton}>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
