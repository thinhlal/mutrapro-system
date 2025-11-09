import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/apiConfig';
import axiosInstancePublic from '../../utils/axiosInstancePublic';
import { setItem } from '../../services/localStorageService';
import { toast } from 'react-hot-toast';
import LoadingScreen from '../../components/LoadingScreen/LoadingScreen';
import { getRoleBasedRedirectPath } from '../../utils/roleRedirect';

export default function AuthenticatePage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth() || {};
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
      const response = await axiosInstancePublic.post(
        API_ENDPOINTS.AUTH.GOOGLE_LOGIN_WITH_CODE(code),
      );
      const payload = response?.data;
      const auth = payload?.data;
      if (!auth?.accessToken) {
        throw new Error(payload?.message || 'No token response from server');
      }
      setItem('accessToken', auth.accessToken);
      setItem('user', {
        id: auth.userId,
        email: auth.email,
        role: auth.role,
        fullName: auth.fullName,
        isNoPassword: auth.isNoPassword,
      });
      if (updateUser) updateUser({
        id: auth.userId,
        email: auth.email,
        role: auth.role,
        fullName: auth.fullName,
        isNoPassword: auth.isNoPassword,
      });

      toast.success('Login successfully!');
      
      // Determine redirect path based on user role
      const redirectPath = getRoleBasedRedirectPath(auth.role);
      
      setTimeout(() => {
        navigate(redirectPath);
      }, 1000);
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
