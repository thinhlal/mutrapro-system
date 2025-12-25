import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
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
import PayRevisionFeePage from './pages/user/PayRevisionFee/PayRevisionFeePage';
import WalletPage from './pages/user/Wallet/WalletPage';
import TopupPaymentPage from './pages/user/TopupPayment/TopupPaymentPage';
import PaymentSuccessPage from './pages/user/PaymentSuccess/PaymentSuccessPage';
import WalletManagement from './pages/admin/WalletManagement/WalletManagement';

// Professionals Pages
import SingersPage from './pages/professionals/Singers/List/SingersPage';
import SingerDetailPage from './pages/professionals/Singers/Detail/SingerDetailPage';
import DiscoverProsPage from './pages/professionals/Discover/DiscoverProsPage';

// Services Pages
import ServiceRequestPage from './pages/services/ServiceRequest/ServiceRequestPage';
import TranscriptionQuotePage from './pages/services/quotes/Transcription/TranscriptionQuotePageSimplified';
import ArrangementQuotePage from './pages/services/quotes/Arrangement/ArrangementQuotePage';
import ReviewOrderPage from './pages/services/quotes/ReviewOrder/ReviewOrderPage';
// Recording Flow
import RecordingFlowController from './pages/services/ServiceRequest/RecordingFlow/RecordingFlowController';
import VocalistSelectionPage from './pages/services/ServiceRequest/RecordingFlow/pages/VocalistSelectionPage';
import InstrumentalistSelectionPage from './pages/services/ServiceRequest/RecordingFlow/pages/InstrumentalistSelectionPage';
import EquipmentSelectionPage from './pages/services/ServiceRequest/RecordingFlow/pages/EquipmentSelectionPage';

// Work Pages
import SmoosicEditorPage from './pages/work/SmoosicEditorPage/SmoosicEditorPage';
import Tasks from './pages/work/Tasks/Task';

// Transcription Pages
import SpecialistProfile from './pages/transcription/Profile/SpecialistProfile';
import MyTasksPage from './pages/transcription/MyTasksPage/MyTasksPage';
import SpecialistTaskDetailPage from './pages/specialist/TaskDetailPage/SpecialistTaskDetailPage';

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
import EquipmentManagement from './pages/admin/EquipmentManagement/EquipmentManagement';
import AdminProfile from './pages/admin/Profile/AdminProfile';
import AdminServiceRequestManagement from './pages/admin/ServiceRequestManagement/AdminServiceRequestManagement';
import ServiceRequestContracts from './pages/admin/ServiceRequestContracts/ServiceRequestContracts';
import SpecialistManagement from './pages/admin/SpecialistManagement/SpecialistManagement';
import SkillManagement from './pages/admin/SkillManagement/SkillManagement';
import DemoManagement from './pages/admin/DemoManagement/DemoManagement';
import PricingMatrixManagement from './pages/admin/PricingMatrixManagement/PricingMatrixManagement';
import ReviewManagement from './pages/admin/ReviewManagement/ReviewManagement';
import StudioManagement from './pages/admin/StudioManagement/StudioManagement';

// Manager Pages
import ManagerProfile from './pages/manager/Profile/ManagerProfile';
import ManagerContractDetailPage from './pages/manager/ContractDetail/ManagerContractDetailPage';
import ContractsManagement from './pages/manager/ContractsList/ContractsManagement';
import MilestonesPage from './pages/manager/Milestones/MilestonesPage';
import TaskProgressManagement from './pages/manager/TaskProgress/TaskProgressManagement';
import TaskAssignmentWorkspace from './pages/manager/TaskAssignmentWorkspace/TaskAssignmentWorkspace';
import MilestoneDetailPage from './pages/manager/MilestoneDetail/MilestoneDetailPage';
import TaskDetailPage from './pages/manager/TaskDetail/TaskDetailPage';
import ManagerChatPage from './pages/manager/Chat/ManagerChatPage';
import RevisionRequestsManagement from './pages/manager/RevisionRequests/RevisionRequestsManagement';
import StudioBookingPage from './pages/manager/StudioBooking/StudioBookingPage';
import StudioBookingsManagement from './pages/manager/StudioBookings/StudioBookingsManagement';
import StudioBookingDetailPage from './pages/manager/StudioBookings/StudioBookingDetailPage';
import WithdrawalRequestsManagement from './pages/manager/WithdrawalRequests/WithdrawalRequestsManagement';
import ServiceRequestManagement from './pages/manager/ServiceRequestManagement/ServiceRequestManagement';

// Admin Pages (Copied from Manager pages)
import AdminChatLayout from './layouts/AdminChatLayout/AdminChatLayout';
import AdminChatConversationPage from './pages/admin/Chat/AdminChatConversationPage';
import AdminContractsManagement from './pages/admin/ContractsList/AdminContractsManagement';
import AdminMilestonesPage from './pages/admin/Milestones/AdminMilestonesPage';
import AdminTaskProgressManagement from './pages/admin/TaskProgress/AdminTaskProgressManagement';
import AdminRevisionRequestsManagement from './pages/admin/RevisionRequests/AdminRevisionRequestsManagement';
import AdminStudioBookingsManagement from './pages/admin/StudioBookings/AdminStudioBookingsManagement';
import AdminMilestoneDetailPage from './pages/admin/MilestoneDetail/AdminMilestoneDetailPage';
import AdminTaskDetailPage from './pages/admin/TaskDetail/AdminTaskDetailPage';
import AdminStudioBookingPage from './pages/admin/StudioBooking/AdminStudioBookingPage';
import AdminStudioBookingDetailPage from './pages/admin/StudioBookings/AdminStudioBookingDetailPage';
import AdminTaskAssignmentWorkspace from './pages/admin/TaskAssignmentWorkspace/AdminTaskAssignmentWorkspace';
import AdminContractDetailPage from './pages/admin/ContractDetail/AdminContractDetailPage';
import AdminChatRoomsManagement from './pages/admin/ChatRooms/AdminChatRoomsManagement';
import MyStudioBookings from './pages/recordingArtist/MyStudioBookings/MyStudioBookings';
import RecordingArtistStudioBookingDetailPage from './pages/recordingArtist/StudioBookingDetail/StudioBookingDetailPage';
import MySlotsPage from './pages/recordingArtist/MySlots/MySlotsPage';

// AI Transcription Pages
import KlangTranscriptionPanel from './pages/ai-transcription/KlangTranscriptionPanel.jsx';
import TranscriptionProcessPage from './pages/ai-transcription/TranscriptionProcessPage.jsx';
import './App.css';
import MilestoneDeliveriesPage from './pages/user/MilestoneDeliveries/MilestoneDeliveriesPage.jsx';

const RECORDING_FLOW_STORAGE_KEYS = [
  'recordingFlowData',
  'recordingFlowVocalistCallback',
  'recordingFlowInstrumentalistCallback',
  'recordingFlowEquipmentCallback',
];

function RecordingFlowStorageWatcher() {
  const location = useLocation();

  useEffect(() => {
    const isRecordingFlowPath = location.pathname.startsWith('/recording-flow');
    const isDetailPageFromFlow =
      location.pathname.startsWith('/pros/singer/') && location.state?.fromFlow;

    // Don't clear if still in flow or viewing detail page from flow
    if (!isRecordingFlowPath && !isDetailPageFromFlow) {
      // Clear flow-related session storage when user leaves the flow routes
      RECORDING_FLOW_STORAGE_KEYS.forEach(key =>
        sessionStorage.removeItem(key)
      );
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    // Cleanup when app unmounts (e.g. tab close or full reload)
    return () => {
      RECORDING_FLOW_STORAGE_KEYS.forEach(key =>
        sessionStorage.removeItem(key)
      );
    };
  }, []);

  return null;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <RecordingFlowStorageWatcher />
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
          {/* Recording Flow Routes */}
          <Route
            path="/recording-flow"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <RecordingFlowController />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recording-flow/vocalist-selection"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <VocalistSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recording-flow/instrumentalist-selection"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <InstrumentalistSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recording-flow/equipment-selection"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <EquipmentSelectionPage />
              </ProtectedRoute>
            }
          />

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
            path="/ai-transcription"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <KlangTranscriptionPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-transcription/process"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <TranscriptionProcessPage />
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
            path="/contracts/:contractId/pay-revision-fee"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'SYSTEM_ADMIN']}>
                <PayRevisionFeePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:contractId/milestones/:milestoneId/deliveries"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <MilestoneDeliveriesPage />
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
              <ProtectedRoute allowedRoles={['CUSTOMER', 'SYSTEM_ADMIN']}>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/topup/:orderId?"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <TopupPaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/success/:orderId"
            element={
              <ProtectedRoute
                allowedRoles={['CUSTOMER', 'MANAGER', 'SYSTEM_ADMIN']}
              >
                <PaymentSuccessPage />
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
                  'ARRANGEMENT',
                ]}
              >
                <SmoosicEditorPage />
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
          {/* --- CHAT ROUTES (CUSTOMER ONLY) --- */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <ChatLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <ChatLayout />
              </ProtectedRoute>
            }
          />

          {/* --- ADMIN CHAT ROUTES --- */}
          <Route
            path="/admin/chat"
            element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                <AdminChatLayout />
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
              path="service-requests/:requestId"
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
            <Route path="milestone-assignments" element={<MilestonesPage />} />
            <Route path="task-progress" element={<TaskProgressManagement />} />
            <Route
              path="milestone-assignments/:contractId/new"
              element={<TaskAssignmentWorkspace />}
            />
            <Route
              path="milestone-assignments/:contractId/edit/:assignmentId"
              element={<TaskAssignmentWorkspace />}
            />
            <Route
              path="milestone-assignments/:contractId/milestone/:milestoneId"
              element={<MilestoneDetailPage />}
            />
            <Route
              path="studio-booking/:contractId/:milestoneId"
              element={<StudioBookingPage />}
            />
            <Route
              path="studio-bookings"
              element={<StudioBookingsManagement />}
            />
            <Route
              path="studio-bookings/:bookingId"
              element={<StudioBookingDetailPage />}
            />
            <Route
              path="tasks/:contractId/:assignmentId"
              element={<TaskDetailPage />}
            />
            <Route path="profile" element={<ManagerProfile />} />
            <Route
              path="revision-requests"
              element={<RevisionRequestsManagement />}
            />
            <Route
              path="withdrawal-requests"
              element={<WithdrawalRequestsManagement />}
            />
            <Route path="chat" element={<ManagerChatPage />} />
            <Route path="chat/:roomId" element={<ManagerChatPage />} />
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
              path="withdrawal-requests"
              element={<WithdrawalRequestsManagement />}
            />
            <Route
              path="service-requests"
              element={<AdminServiceRequestManagement />}
            />
            <Route
              path="service-requests/:requestId"
              element={<ServiceRequestContracts />}
            />
            <Route
              path="notation-instruments"
              element={<NotationInstruments />}
            />
            <Route path="equipment" element={<EquipmentManagement />} />
            <Route
              path="pricing-matrix"
              element={<PricingMatrixManagement />}
            />
            <Route path="studios" element={<StudioManagement />} />
            <Route path="specialists" element={<SpecialistManagement />} />
            <Route path="skills" element={<SkillManagement />} />
            <Route path="demos" element={<DemoManagement />} />
            <Route path="contract-builder" element={<ContractBuilder />} />
            <Route
              path="contracts/:contractId/edit"
              element={<ContractBuilder />}
            />
            <Route path="contracts" element={<AdminContractsManagement />} />
            <Route
              path="contracts/:contractId"
              element={<AdminContractDetailPage />}
            />
            <Route path="milestone-assignments" element={<AdminMilestonesPage />} />
            <Route
              path="milestone-assignments/:contractId/new"
              element={<AdminTaskAssignmentWorkspace />}
            />
            <Route
              path="milestone-assignments/:contractId/edit/:assignmentId"
              element={<AdminTaskAssignmentWorkspace />}
            />
            <Route
              path="milestone-assignments/:contractId/milestone/:milestoneId"
              element={<AdminMilestoneDetailPage />}
            />
            <Route path="task-progress" element={<AdminTaskProgressManagement />} />
            <Route
              path="tasks/:contractId/:assignmentId"
              element={<AdminTaskDetailPage />}
            />
            <Route
              path="studio-booking/:contractId/:milestoneId"
              element={<AdminStudioBookingPage />}
            />
            <Route path="revision-requests" element={<AdminRevisionRequestsManagement />} />
            <Route path="studio-bookings" element={<AdminStudioBookingsManagement />} />
            <Route
              path="studio-bookings/:bookingId"
              element={<AdminStudioBookingDetailPage />}
            />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reviews" element={<ReviewManagement />} />
            <Route path="settings" element={<Dashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="chat-rooms" element={<AdminChatRoomsManagement />} />
            <Route path="chat/:roomId" element={<AdminChatConversationPage />} />
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
            <Route path="edit-tool" element={<SmoosicEditorPage />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
            <Route
              path="my-tasks/:taskId"
              element={<SpecialistTaskDetailPage />}
            />
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
            <Route index element={<Navigate to="my-tasks" replace />} />
            <Route path="my-tasks" element={<MyTasksPage />} />
            <Route
              path="my-tasks/:taskId"
              element={<SpecialistTaskDetailPage />}
            />
            <Route path="profile" element={<SpecialistProfile />} />
          </Route>

          {/* --- RECORDING ARTIST ROUTES (PROTECTED) --- */}
          <Route
            path="/recording-artist"
            element={
              <ProtectedRoute
                allowedRoles={['RECORDING_ARTIST', 'SYSTEM_ADMIN']}
              >
                <RecordingArtistLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="studio-bookings" replace />} />
            <Route path="studio-bookings" element={<MyStudioBookings />} />
            <Route
              path="studio-bookings/:bookingId"
              element={<RecordingArtistStudioBookingDetailPage />}
            />
            <Route path="my-slots" element={<MySlotsPage />} />
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
