import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect from root to home */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Main routes */}
        <Route path="/home" element={<HomePage />} />

        {/* Add more routes here */}

        {/* 404 - Not Found - should be last */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
