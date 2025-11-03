// src/utils/jwtUtils.jsx

/**
 * Decode JWT token without verification (for frontend use only)
 * Backend will verify the token
 */
export const decodeJWT = (token) => {
  try {
    if (!token) return null;
    
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }
    
    // Decode the payload (middle part)
    const payload = parts[1];
    
    // Replace URL-safe characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode base64
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Get time until token expires (in milliseconds)
 */
export const getTokenExpiryTime = (token) => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return 0;
    
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    return Math.max(0, expirationTime - currentTime);
  } catch (error) {
    console.error('Error getting token expiry time:', error);
    return 0;
  }
};

/**
 * Extract user information from JWT token
 */
export const getUserFromToken = (token) => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded) return null;
    
    return {
      email: decoded.sub, // subject contains email
      role: decoded.scope, // scope contains role
      exp: decoded.exp,
      iat: decoded.iat,
      jti: decoded.jti, // JWT ID
    };
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
};

