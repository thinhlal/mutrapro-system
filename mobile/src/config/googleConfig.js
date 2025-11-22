// Google OAuth Configuration for Mobile
import { API_CONFIG } from './apiConfig';

export const GoogleConfig = {
  // Từ backend/frontend config
  clientId: API_CONFIG.GOOGLE_CLIENT_ID || '807495098527-cngsfgsl7aep23ht0u0t26e99ofohc7u.apps.googleusercontent.com',
  
  // Expo AuthSession endpoints
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  
  // Scopes cần thiết
  scopes: ['openid', 'email', 'profile'],
};

// Note: Expo AuthSession sẽ tự động generate redirectUri
// dựa trên app scheme và Expo client

