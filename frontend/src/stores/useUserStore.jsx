// src/stores/useUserStore.jsx
import { create } from 'zustand';
import * as userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { decodeJWT } from '../utils/jwtUtils';

export const useUserStore = create((set, get) => ({
  // --- State ---
  userProfile: null, // Detailed user profile from users table
  loading: false,
  error: null,

  // --- Actions ---

  /**
   * Fetch user profile by userId
   */
  fetchUserProfile: async (userId) => {
    set({ loading: true, error: null });
    try {
      const response = await userService.getUserProfile(userId);
      set({
        userProfile: response.data,
        loading: false,
        error: null,
      });
      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Không thể tải thông tin người dùng',
      });
      throw error;
    }
  },

  /**
   * Fetch current logged-in user's profile
   */
  fetchMyProfile: async () => {
    const { accessToken } = useAuth.getState();
    
    if (!accessToken) {
      set({ error: 'Chưa đăng nhập' });
      throw new Error('Not authenticated');
    }

    // Get userId from token
    const decoded = decodeJWT(accessToken);
    if (!decoded || !decoded.sub) {
      set({ error: 'Invalid token' });
      throw new Error('Invalid token');
    }

    // For now, we'll need to get userId somehow
    // Since backend doesn't return userId in login response,
    // and we can't extract it from JWT (only has email),
    // we'll need to call an endpoint to get it
    // OR store it in AuthContext after successful API call
    
    // Temporary solution: we'll need the userId parameter
    throw new Error('fetchMyProfile requires userId - use fetchUserProfile(userId) instead');
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (userId, profileData) => {
    set({ loading: true, error: null });
    try {
      const response = await userService.updateUserProfile(userId, profileData);
      set({
        userProfile: response.data,
        loading: false,
        error: null,
      });
      return response.data;
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Không thể cập nhật thông tin',
      });
      throw error;
    }
  },

  /**
   * Clear user profile (on logout)
   */
  clearUserProfile: () => {
    set({
      userProfile: null,
      loading: false,
      error: null,
    });
  },

  /**
   * Set user profile directly (useful for optimistic updates)
   */
  setUserProfile: (profile) => {
    set({ userProfile: profile });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));

