import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import { setItem, getItem, removeItem } from '../services/localStorageService';
import websocketService from '../services/websocketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  // Initialize user from localStorage
  useEffect(() => {
    const userData = getItem('user');
    if (userData) {
      try {
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        removeItem('user');
      }
    }
    setInitialized(true);
  }, []);

  // Handle auto logout when refresh token fails
  useEffect(() => {
    const handleAutoLogout = async () => {
      // Disconnect WebSocket trước khi auto logout
      websocketService.disconnect();
      
      // Delay để hiển thị loading animation
      await new Promise(resolve => setTimeout(resolve, 500));
      removeItem('user');
      removeItem('accessToken');
      setUser(null);
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:logout', handleAutoLogout);

    return () => {
      window.removeEventListener('auth:logout', handleAutoLogout);
    };
  }, [navigate]);

  const logIn = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      const token = response?.accessToken;
      const user = response?.user;

      if (token) {
        setItem('accessToken', token);
        // Connect WebSocket với token mới sau khi login thành công
        await websocketService.connect(token);
      }
      if (user) {
        setItem('user', user);
        setUser(user);
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  // Update user info (for profile updates)
  const updateUser = updatedUserData => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    setItem('user', newUserData);
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Disconnect WebSocket trước khi logout
      websocketService.disconnect();
      
      await authService.logout(getItem('accessToken'));
    } catch (_) {
      // bỏ qua lỗi logout để đảm bảo client state được dọn sạch
    } finally {
      removeItem('accessToken');
      removeItem('user');
      setUser(null);
      setLoading(false);
      navigate('/login', { replace: true });
    }
  };

  const register = async registerData => {
    setLoading(true);
    try {
      const response = await authService.register(registerData);
      return response;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialized,
        isAuthenticated: !!user,
        logIn,
        logout,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
