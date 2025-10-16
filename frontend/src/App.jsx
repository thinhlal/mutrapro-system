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
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import TranscriptionPage from "./pages/TranscriptionPage/TranscriptionPage";
import ServicesPage from "./pages/ServicesPage/ServicesPage";
import PricingPage from "./pages/PricingPage/PricingPage";
import FromSoundToSheet from "./pages/FromSoundToSheet/FromSoundToSheet";
import NotationEditor from "./pages/NotationEditor/NotationEditor";
import DiscoverProsPage from "./pages/DiscoverProsPage/DiscoverProsPage";
import SingersPage from "./pages/SingersPage/SingersPage";
import SingerDetailPage from "./pages/SingerDetailPage/SingerDetailPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

// Coordinator Pages
import Dashboard from "./pages/Dashboard/Dashboard";
import Tasks from "./pages/Task/Task";

import "./App.css";
import ContractBuilder from "./pages/ContractBuilder/ContractBuilder";

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
        <Route path="/soundtosheet" element={<FromSoundToSheet />} />
        <Route path="/editor" element={<NotationEditor />} />
        <Route path="/discover-pros" element={<DiscoverProsPage />} />
        <Route path="/pros/singers/:gender" element={<SingersPage />} />
        <Route path="/pros/singer/:id" element={<SingerDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* --- COORDINATOR ROUTES --- */}
        <Route path="/coordinator" element={<CoordinatorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contact-builder" element={<ContractBuilder />} />
          <Route path="task" element={<Tasks />} />
        </Route>

        {/* --- FALLBACK ROUTE --- */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
