// src/pages/UnauthorizedPage/UnauthorizedPage.jsx
import { useNavigate } from 'react-router-dom';
import styles from './UnauthorizedPage.module.css';

function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>403</div>
        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.message}>
          You do not have permission to access this page. Please contact the
          administrator if you believe this is an error.
        </p>
        <div className={styles.actions}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            Go Back
          </button>
          <button onClick={() => navigate('/')} className={styles.homeButton}>
            Home Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
