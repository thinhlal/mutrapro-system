import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { GoogleConfig } from '../config/googleConfig';
import axiosInstancePublic from '../utils/axiosInstancePublic';
import { API_ENDPOINTS } from '../config/apiConfig';

// Enable WebBrowser to dismiss automatically after auth
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook để xử lý Google OAuth
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GoogleConfig.clientId,
    scopes: GoogleConfig.scopes,
    // Expo sẽ tự động generate redirectUri
    redirectUri: makeRedirectUri({
      scheme: 'mutrapro', // Từ app.json
      path: 'authenticate',
    }),
  });

  return { request, response, promptAsync };
};

/**
 * Gọi backend API với authorization code từ Google
 * @param {string} code - Authorization code từ Google
 * @returns {Promise<{accessToken: string, user: object}>}
 */
export const authenticateWithGoogle = async (code) => {
  try {
    // Gọi backend API giống như web
    const response = await axiosInstancePublic.post(
      `${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}?code=${code}`
    );
    
    const payload = response?.data;
    const auth = payload?.data;
    
    if (!auth?.accessToken) {
      throw new Error(payload?.message || 'No token response from server');
    }
    
    const accessToken = auth.accessToken;
    const user = {
      id: auth.userId,
      email: auth.email,
      role: auth.role,
      fullName: auth.fullName,
      isNoPassword: auth.isNoPassword === true,
    };
    
    return { accessToken, user };
  } catch (error) {
    console.error('Google authentication error:', error);
    throw error.response?.data || { message: 'Error logging in with Google' };
  }
};

