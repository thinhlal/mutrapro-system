import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Common Components
import ScrollToTop from './components/common/ScrollToTop/ScrollToTop';
import ProtectedRoute from './components/HandleRoutes/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext.jsx';

// Layouts
import CoordinatorLayout from './layouts/CoordinatorLayout/CoordinatorLayout';
import AdminLayout from './layouts/AdminLayout/AdminLayout';

// Customer Pages
import HomePage from './pages/HomePage/HomePage';
import LoginPage from './pages/LoginPage/LoginPage';
import PricingPage from './pages/PricingPage/PricingPage';
import SingersPage from './pages/SingersPage/SingersPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import NotificationsPage from './pages/NotificationsPage/NotificationsPage';
import SubscriptionPage from './pages/SubscriptionPage/SubscriptionPage';
import ServicesPage from './pages/ServicesPage/ServicesPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import NotationEditor from './pages/NotationEditor/NotationEditor';
import ServiceRequestPage from './pages/ServiceRequestPage/ServiceRequestPage';
import DiscoverProsPage from './pages/DiscoverProsPage/DiscoverProsPage';
import SingerDetailPage from './pages/SingerDetailPage/SingerDetailPage';
import TranscriptionPage from './pages/TranscriptionPage/TranscriptionPage';
import TranscriptionQuotePage from './pages/TranscriptionQuote/TranscriptionQuotePage';
import ReviewOrderPage from './pages/ReviewOrderPage/ReviewOrderPage';
import RecordingQuotePage from './pages/RecordingQuotePage/RecordingQuotePage';
import ArrangementQuotePage from './pages/ArrangementQuotePage/ArrangementQuotePage';
import UnauthorizedPage from './pages/UnauthorizedPage/UnauthorizedPage';
import VerifyEmailPage from './pages/VerifyEmailPage/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import AuthenticatePage from './pages/AuthenticationPage/AuthenticatePage';

// Coordinator Pages
import Tasks from './pages/Task/Task';
import Dashboard from './pages/Dashboard/Dashboard';
import ContractBuilder from './pages/ContractBuilder/ContractBuilder';
import ContractsList from './pages/ContractsList/ContractsList';

// Admin Pages
import UserManagement from './pages/UserManagement/UserManagement';
import NotationInstruments from './pages/NotationInstruments/NotationInstruments';
import AdminProfile from './pages/AdminProfile/AdminProfile';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/transcription" element={<TranscriptionPage />} />
          <Route path="/detail-service" element={<ServiceRequestPage />} />
          <Route path="/pros/singers/:gender" element={<SingersPage />} />
          <Route path="/pros/singer/:id" element={<SingerDetailPage />} />

          {/* --- AUTH ROUTES --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-up" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/authenticate" element={<AuthenticatePage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* --- PROTECTED CUSTOMER ROUTES (All authenticated users) --- */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/notifications"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/subscription"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <NotationEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/request-service"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <DiscoverProsPage />
              </ProtectedRoute>
            }
          />

          {/* --- PROTECTED QUOTE ROUTES (All authenticated users) --- */}
          <Route
            path="/transcription/quote"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <TranscriptionQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/arrangement/quote"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <ArrangementQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recording/quote"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <RecordingQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/review"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}
              >
                <ReviewOrderPage />
              </ProtectedRoute>
            }
          />

          {/* --- COORDINATOR ROUTES (PROTECTED) --- */}
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute allowedRoles={['SERVICE_COORDINATOR', 'SYSTEM_ADMIN']}>
                <CoordinatorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contact-builder" element={<ContractBuilder />} />
            <Route path="contracts-list" element={<ContractsList />} />
            <Route path="task" element={<Tasks />} />
          </Route>

          {/* --- ADMIN ROUTES (PROTECTED) --- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route
              path="notation-instruments"
              element={<NotationInstruments />}
            />
            <Route path="contracts" element={<ContractsList />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="settings" element={<Dashboard />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* --- FALLBACK ROUTE --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
