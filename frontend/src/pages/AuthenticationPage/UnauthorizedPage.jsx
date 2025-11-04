import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './UnauthorizedPage.css';
import { AuthContext } from '../../contexts/AuthContext';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { logOut, user } = useContext(AuthContext);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogin = () => {
    if (user) {
      logOut();
    }
    navigate('/login');
  };

  return (
    <div className="unauthorized-wrapper">
      <div className="unauthorized-container">
        <div className="unauthorized-content">
          <div className="unauthorized-icon">
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                fill="#ff4757"
              />
              <path d="M15 9H9v6h6V9z" fill="white" />
            </svg>
          </div>

          <h1 className="unauthorized-title">Không Có Quyền Truy Cập</h1>

          <p className="unauthorized-message">
            Xin lỗi, bạn không có quyền truy cập vào trang này. Vui lòng kiểm
            tra quyền của bạn hoặc liên hệ quản trị viên.
          </p>

          <div className="unauthorized-details">
            <p>Điều này có thể xảy ra vì:</p>
            <ul>
              <li>Bạn chưa đăng nhập vào hệ thống</li>
              <li>Tài khoản của bạn không có quyền truy cập trang này</li>
              <li>Phiên làm việc của bạn đã hết hạn</li>
              <li>Trang này chỉ dành cho quản trị viên</li>
            </ul>
          </div>

          <div className="unauthorized-actions">
            <button className="btn btn-primary" onClick={handleLogin}>
              Đăng Nhập
            </button>
            <button className="btn btn-secondary" onClick={handleGoHome}>
              Về Trang Chủ
            </button>
            <button className="btn btn-outline" onClick={handleGoBack}>
              Quay Lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
