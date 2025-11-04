// src/components/HandleRoutes/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ProtectedRoute Component
 * Protects routes that require authentication and specific roles
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {Array<string>} props.allowedRoles - Array of roles that can access this route (e.g., ['CUSTOMER', 'ADMIN'])
 * @param {string} props.redirectTo - Path to redirect if not authorized (default: '/login')
 */
const ProtectedRoute = ({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}) => {
  const auth = useAuth();
  if (!auth) return null;
  const { isAuthenticated, user, initialized } = auth;
  const location = useLocation();

  // Chờ khởi tạo trạng thái auth (load từ localStorage) để tránh redirect sớm khi F5
  if (!initialized) {
    return null; // hoặc spinner nhẹ nếu muốn
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    // Save the attempted location so we can redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Authenticated but doesn't have required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to unauthorized page or home
    return <Navigate to="/unauthorized" replace />;
  }

  // Authenticated and authorized
  return children;
};

export default ProtectedRoute;
