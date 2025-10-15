import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop/ScrollToTop";
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
import "./App.css";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Redirect root → /home */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Main pages */}
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

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
