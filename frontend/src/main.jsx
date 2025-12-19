import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Import styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'antd/dist/reset.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>
);
