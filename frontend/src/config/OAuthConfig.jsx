import { API_CONFIG } from './apiConfig';

// Get frontend URL from environment or default to localhost for dev
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 
  (import.meta.env.DEV ? 'http://localhost:5173' : 'https://mutrapro.top');

export const OAuthConfig = {
  clientId: API_CONFIG.GOOGLE_CLIENT_ID,
  authUri: 'https://accounts.google.com/o/oauth2/v2/auth',
  redirectUri: `${FRONTEND_URL}/authenticate`,
  scope: 'openid email profile',
};
