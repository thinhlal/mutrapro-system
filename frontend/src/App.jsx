import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Common Components
import ScrollToTop from './components/common/ScrollToTop/ScrollToTop';
import ProtectedRoute from './components/HandleRoutes/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext.jsx';

// Layouts
import ManagerLayout from './layouts/ManagerLayout/ManagerLayout';
import AdminLayout from './layouts/AdminLayout/AdminLayout';
import ChatLayout from './layouts/ChatLayout/ChatLayout';
import TranscriptionLayout from './layouts/TranscriptionLayout/TranscriptionLayout';
import ArrangementLayout from './layouts/ArrangementLayout/ArrangementLayout';
import RecordingArtistLayout from './layouts/RecordingArtistLayout/RecordingArtistLayout';

// Public Pages
import HomePage from './pages/public/Home/HomePage';
import PricingPage from './pages/public/Pricing/PricingPage';
import ServicesPage from './pages/public/Services/ServicesPage';
import TranscriptionPage from './pages/public/Transcription/TranscriptionPage';

// Auth Pages
import LoginPage from './pages/auth/Login/LoginPage';
import RegisterPage from './pages/auth/Register/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmail/VerifyEmailPage';
import ResetPasswordPage from './pages/auth/ResetPassword/ResetPasswordPage';
import UnauthorizedPage from './pages/auth/Unauthorized/UnauthorizedPage';
import AuthenticatePage from './pages/auth/AuthenticatePage';

// User Pages
import ProfilePage from './pages/user/Profile/ProfilePage';
import NotificationsPage from './pages/user/Notifications/NotificationsPage';
import SubscriptionPage from './pages/user/Subscription/SubscriptionPage';
import MyRequestsPage from './pages/user/MyRequests/MyRequestsPage';
import RequestDetailPage from './pages/user/RequestDetail/RequestDetailPage';
import ContractDetailPage from './pages/user/ContractDetail/ContractDetailPage';
import ContractSignedSuccessPage from './pages/user/ContractSignedSuccess/ContractSignedSuccessPage';
import PayMilestonePage from './pages/user/PayMilestone/PayMilestonePage';
import PayDepositPage from './pages/user/PayDeposit/PayDepositPage';
import WalletPage from './pages/user/Wallet/WalletPage';
import WalletManagement from './pages/admin/WalletManagement/WalletManagement';

// Professionals Pages
import SingersPage from './pages/professionals/Singers/List/SingersPage';
import SingerDetailPage from './pages/professionals/Singers/Detail/SingerDetailPage';
import DiscoverProsPage from './pages/professionals/Discover/DiscoverProsPage';

// Services Pages
import ServiceRequestPage from './pages/services/ServiceRequest/ServiceRequestPage';
import TranscriptionQuotePage from './pages/services/quotes/Transcription/TranscriptionQuotePageSimplified';
import ArrangementQuotePage from './pages/services/quotes/Arrangement/ArrangementQuotePageSimplified';
import RecordingQuotePage from './pages/services/quotes/Recording/RecordingQuotePage';
import ReviewOrderPage from './pages/services/quotes/ReviewOrder/ReviewOrderPage';

// Work Pages
import NotationEditor from './pages/work/NotationEditor/NotationEditor';
import Tasks from './pages/work/Tasks/Task';

// Transcription Pages
import SpecialistProfile from './pages/transcription/Profile/SpecialistProfile';
import MyTasksPage from './pages/transcription/MyTasksPage/MyTasksPage';
import TranscriptionTaskDetailPage from './pages/transcription/TranscriptionTaskDetailPage/TranscriptionTaskDetailPage';

// Chat Pages (not used directly anymore, used in ChatLayout)
// import ChatRoomsPage from './pages/chat/ChatRooms/ChatRoomsPage';
// import ChatConversationPage from './pages/chat/ChatConversation/ChatConversationPage';

// Dashboard
import Dashboard from './pages/dashboard/Overview/Dashboard';

// Contracts Pages
import ContractBuilder from './pages/contracts/Builder/ContractBuilder';
import ContractsList from './pages/contracts/List/ContractsList';

// Admin Pages
import UserManagement from './pages/admin/UserManagement/UserManagement';
import NotationInstruments from './pages/admin/NotationInstruments/NotationInstruments';
import AdminProfile from './pages/admin/Profile/AdminProfile';
import ServiceRequestManagement from './pages/admin/ServiceRequestManagement/ServiceRequestManagement';
import ServiceRequestContracts from './pages/admin/ServiceRequestContracts/ServiceRequestContracts';
import SpecialistManagement from './pages/admin/SpecialistManagement/SpecialistManagement';
import SkillManagement from './pages/admin/SkillManagement/SkillManagement';
import DemoManagement from './pages/admin/DemoManagement/DemoManagement';

// Manager Pages
import ManagerProfile from './pages/manager/Profile/ManagerProfile';
import ManagerContractDetailPage from './pages/manager/ContractDetail/ManagerContractDetailPage';
import ContractsManagement from './pages/manager/ContractsList/ContractsManagement';
import TaskAssignmentManagement from './pages/manager/TaskAssignment/TaskAssignmentManagement';
import TaskAssignmentWorkspace from './pages/manager/TaskAssignmentWorkspace/TaskAssignmentWorkspace';

import './App.css';


function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Toaster position="top-center" />
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/introduction" element={<TranscriptionPage />} />
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
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-requests"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <MyRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-requests/:requestId"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <RequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-contracts"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <ContractsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <ContractDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/signed-success"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <ContractSignedSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/pay-deposit"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <PayDepositPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/pay-milestone"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <PayMilestonePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/subscription"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'SYSTEM_ADMIN']}
              >
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'CUSTOMER',
                  'MANAGER',
                  'SYSTEM_ADMIN',
                  'TRANSCRIPTION',
                ]}
              >
                <NotationEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/request-service"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <DiscoverProsPage />
              </ProtectedRoute>
            }
          />
          {/* --- CHAT ROUTES --- */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <ChatLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <ChatLayout />
              </ProtectedRoute>
            }
          />

          {/* --- PROTECTED QUOTE ROUTES (All authenticated users) --- */}
          <Route
            path="/services/quotes/transcription"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <TranscriptionQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services/quotes/arrangement"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <ArrangementQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services/quotes/recording"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <RecordingQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/review"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <ReviewOrderPage />
              </ProtectedRoute>
            }
          />

          {/* --- MANAGER ROUTES (PROTECTED) --- */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'SYSTEM_ADMIN']}>
                <ManagerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="service-requests"
              element={<ServiceRequestManagement />}
            />
            <Route
              path="service-requests/:requestId/contracts"
              element={<ServiceRequestContracts />}
            />
            <Route
              path="service-requests/:requestId/contracts"
              element={<ServiceRequestContracts />}
            />
            <Route path="contract-builder" element={<ContractBuilder />} />
            <Route
              path="contracts/:contractId/edit"
              element={<ContractBuilder />}
            />
            <Route path="contracts" element={<ContractsManagement />} />
            <Route
              path="contracts/:contractId"
              element={<ManagerContractDetailPage />}
            />
            <Route path="task-assignments" element={<TaskAssignmentManagement />} />
            <Route
              path="task-assignments/:contractId/new"
              element={<TaskAssignmentWorkspace />}
            />
            <Route
              path="task-assignments/:contractId/edit/:assignmentId"
              element={<TaskAssignmentWorkspace />}
            />
            <Route path="task" element={<Tasks />} />
            <Route path="profile" element={<ManagerProfile />} />
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
            <Route path="wallets" element={<WalletManagement />} />
            <Route
              path="service-requests"
              element={<ServiceRequestManagement />}
            />
            <Route
              path="notation-instruments"
              element={<NotationInstruments />}
            />
            <Route path="specialists" element={<SpecialistManagement />} />
            <Route path="skills" element={<SkillManagement />} />
            <Route path="demos" element={<DemoManagement />} />
            <Route path="contracts" element={<ContractsManagement />} />
            <Route
              path="contracts/:contractId"
              element={<ManagerContractDetailPage />}
            />
            <Route path="tasks" element={<Tasks />} />
            <Route path="settings" element={<Dashboard />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* --- TRANSCRIPTION ROUTES (PROTECTED) --- */}
          <Route
            path="/transcription"
            element={
              <ProtectedRoute allowedRoles={['TRANSCRIPTION', 'SYSTEM_ADMIN']}>
                <TranscriptionLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="edit-tool" replace />} />
            <Route path="edit-tool" element={<NotationEditor />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
            <Route path="my-tasks/:taskId" element={<TranscriptionTaskDetailPage />} />
            <Route path="profile" element={<SpecialistProfile />} />
          </Route>

          {/* --- ARRANGEMENT ROUTES (PROTECTED) --- */}
          <Route
            path="/arrangement"
            element={
              <ProtectedRoute allowedRoles={['ARRANGEMENT', 'SYSTEM_ADMIN']}>
                <ArrangementLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<SpecialistProfile />} />
          </Route>

          {/* --- RECORDING ARTIST ROUTES (PROTECTED) --- */}
          <Route
            path="/recording-artist"
            element={
              <ProtectedRoute allowedRoles={['RECORDING_ARTIST', 'SYSTEM_ADMIN']}>
                <RecordingArtistLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<SpecialistProfile />} />
          </Route>

          {/* --- FALLBACK ROUTE --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
