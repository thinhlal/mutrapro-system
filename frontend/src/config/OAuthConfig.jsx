import { API_CONFIG } from './apiConfig';

export const OAuthConfig = {
  clientId: API_CONFIG.GOOGLE_CLIENT_ID,
  authUri: 'https://accounts.google.com/o/oauth2/v2/auth',
  redirectUri: `http://localhost:5173/authenticate`,
  scope: 'openid email profile',
};
