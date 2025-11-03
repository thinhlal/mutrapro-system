import React from 'react';
import './LoadingScreen.css';

function LoadingScreen({ message = 'Loading...', subMessage = '' }) {
  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="loading-text">
          <p className="loading-message">{message}</p>
          {subMessage && <p className="loading-sub-message">{subMessage}</p>}
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
