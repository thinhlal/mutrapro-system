import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';

/**
 * Utility để in ra redirect URI cho debugging
 * Chạy trong app để xem redirect URI thực tế
 */
export const logRedirectUri = () => {
  const redirectUri = makeRedirectUri({
    scheme: 'mutrapro',
    path: 'authenticate',
  });
  
  console.log('='.repeat(50));
  console.log('🔗 REDIRECT URI INFO:');
  console.log('='.repeat(50));
  console.log('Redirect URI:', redirectUri);
  console.log('App Scheme:', Constants.expoConfig?.scheme || 'mutrapro');
  console.log('App Name:', Constants.expoConfig?.name);
  console.log('App Slug:', Constants.expoConfig?.slug);
  console.log('='.repeat(50));
  console.log('\n📋 Copy redirect URI này và thêm vào Google Cloud Console!');
  console.log('\n');
  
  return redirectUri;
};

