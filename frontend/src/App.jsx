import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import TranscriptionPage from "./pages/TranscriptionPage/TranscriptionPage";
import ServicesPage from "./pages/ServicesPage/ServicesPage";
import PricingPage from "./pages/PricingPage/PricingPage";
import "./App.css";

function App() {
  return (
    <Router>
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

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
