import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { API_CONFIG, API_ENDPOINTS } from '../../configs/apiConfig';
import axiosInstance from '../../utils/axiosInstance';
import { toast } from 'react-toastify';
import axios from 'axios';
import LoadingScreen from '../../components/LoadingScreen/LoadingScreen';

export default function AuthenticatePage() {
  const navigate = useNavigate();
  const { logIn } = useContext(AuthContext);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasAuthenticated = useRef(false);

  useEffect(() => {
    if (hasAuthenticated.current) {
      return;
    }

    const codeRegex = /code=([^&]+)/;
    const isMatch = window.location.href.match(codeRegex);

    if (isMatch) {
      const code = isMatch[1];
      hasAuthenticated.current = true;
      authenticateUser(code);
    } else {
      setError('Not found code in URL');
      setIsLoading(false);
      console.error('Not found code in URL');
    }
  }, []);

  const authenticateUser = async code => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}?code=${code}`
      );

      const data = response.data;
      if (!data.success || !data.result?.token) {
        throw new Error(data.message || 'No token response from server');
      }

      const token = data.result.token;
      localStorage.setItem('token', token);

      const profileResponse = await axiosInstance.get(
        API_ENDPOINTS.USER.PROFILE
      );

      const profileData = profileResponse.data;
      const userData = profileData.result;
      userData.role = userData.role?.toUpperCase?.() || 'USER';

      logIn(userData);
      toast.success(`Welcome back, ${userData.name || 'user'}!`);
      setTimeout(() => {
        navigate('/');
      }, 100);
    } catch (err) {
      console.error('Authentication Error: ', err);
      setError(err.response?.data?.message || err.message);
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '100%',
          }}
        >
          <h3
            style={{
              color: '#dc3545',
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            Lỗi Xác Thực
          </h3>
          <p
            style={{
              color: '#6c757d',
              marginBottom: '30px',
              fontSize: '16px',
              lineHeight: '1.5',
            }}
          >
            {error}
          </p>
          <button
            onClick={() => {
              hasAuthenticated.current = false;
              navigate('/login');
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#656ed3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              width: '100%',
            }}
            onMouseOver={e => (e.target.style.backgroundColor = '#5a63c7')}
            onMouseOut={e => (e.target.style.backgroundColor = '#656ed3')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingScreen
        message="Verifying..."
        subMessage="Please wait while we process your login"
        backgroundColor="#f8f9fa"
        width={200}
      />
    );
  }

  return null;
}
