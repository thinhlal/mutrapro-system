import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Common Components
import ScrollToTop from "./components/common/ScrollToTop/ScrollToTop";

// Layouts
import CoordinatorLayout from "./layouts/CoordinatorLayout/CoordinatorLayout";

// Customer Pages
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import PricingPage from "./pages/PricingPage/PricingPage";
import SingersPage from "./pages/SingersPage/SingersPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import ServicesPage from "./pages/ServicesPage/ServicesPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import NotationEditor from "./pages/NotationEditor/NotationEditor";
import ServiceRequestPage from "./pages/ServiceRequestPage/ServiceRequestPage";
import DiscoverProsPage from "./pages/DiscoverProsPage/DiscoverProsPage";
import SingerDetailPage from "./pages/SingerDetailPage/SingerDetailPage";
import TranscriptionPage from "./pages/TranscriptionPage/TranscriptionPage";
import TranscriptionQuotePage from "./pages/TranscriptionQuote/TranscriptionQuotePage";
import ReviewOrderPage from "./pages/ReviewOrderPage/ReviewOrderPage";
import RecordingQuotePage from "./pages/RecordingQuotePage/RecordingQuotePage";
import ArrangementQuotePage from "./pages/ArrangementQuotePage/ArrangementQuotePage";

// Coordinator Pages
import Tasks from "./pages/Task/Task";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContractBuilder from "./pages/ContractBuilder/ContractBuilder";
import ContractsList from "./pages/ContractsList/ContractsList";

import "./App.css";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* --- CUSTOMER ROUTES --- */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/transcription" element={<TranscriptionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<RegisterPage />} />
        <Route path="/soundtosheet" element={<ServiceRequestPage />} />
        <Route path="/editor" element={<NotationEditor />} />
        <Route path="/discover-pros" element={<DiscoverProsPage />} />
        <Route path="/pros/singers/:gender" element={<SingersPage />} />
        <Route path="/pros/singer/:id" element={<SingerDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* --- QUOTE ROUTES --- */}
        <Route
          path="/transcription/quote"
          element={<TranscriptionQuotePage />}
        />
        <Route path="/arrangement/quote" element={<ArrangementQuotePage />} />
        <Route path="/recording/quote" element={<RecordingQuotePage />} />
        <Route path="/checkout/review" element={<ReviewOrderPage />} />

        {/* --- COORDINATOR ROUTES --- */}
        <Route path="/coordinator" element={<CoordinatorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contact-builder" element={<ContractBuilder />} />
          <Route path="contracts-list" element={<ContractsList />} />
          <Route path="task" element={<Tasks />} />
        </Route>

        {/* --- FALLBACK ROUTE --- */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
