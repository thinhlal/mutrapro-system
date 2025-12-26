import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authService from '../services/authService';
import { STORAGE_KEYS } from '../config/constants';
import { getItem, setItem, removeItem } from '../utils/storage';
import websocketService from '../services/websocketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize user from AsyncStorage 
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userData = await getItem(STORAGE_KEYS.USER_DATA);
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login function
   * @param {string} email 
   * @param {string} password 
   */
  const logIn = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      const { accessToken, user } = response;

      if (accessToken) {
        await setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        
        // Connect WebSocket with token after login success
        try {
          await websocketService.connect(accessToken);
          console.log('✅ [Mobile] WebSocket connected after login');
        } catch (wsError) {
          console.error('[Mobile] WebSocket connection failed:', wsError);
          // Don't fail login if WebSocket fails
        }
      }
      if (user) {
        await setItem(STORAGE_KEYS.USER_DATA, user);
        setUser(user);
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout function
   */
  const logout = async () => {
    setLoading(true);
    try {
      // Disconnect WebSocket before logout
      websocketService.disconnect();
      console.log('✅ [Mobile] WebSocket disconnected before logout');
      
      const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      // Ignore logout errors to ensure client state is cleaned
      console.error('Logout error:', error);
    } finally {
      await removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await removeItem(STORAGE_KEYS.USER_DATA);
      setUser(null);
      setLoading(false);
    }
  };

  /**
   * Register function
   * @param {object} registerData 
   */
  const register = async (registerData) => {
    setLoading(true);
    try {
      const response = await authService.register(registerData);
      return response;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user info (for profile updates)
   * @param {object} updatedUserData 
   */
  const updateUser = async (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    await setItem(STORAGE_KEYS.USER_DATA, newUserData);
  };

  const value = {
    user,
    loading,
    initialized,
    isAuthenticated: !!user,
    logIn,
    logout,
    register,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use AuthContext
 */
// Used when the user edits profile
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

