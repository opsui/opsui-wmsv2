/**
 * Application entry point
 *
 * Enhanced with Fast Refresh support for instant HMR updates
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializePerformanceMode } from './stores/uiStore';

// ==============================================================================
// PERFORMANCE INITIALIZATION
// ==============================================================================

// Initialize performance mode before app mounts to prevent visual flash
initializePerformanceMode();

// ==============================================================================
// APP MOUNTING
// ==============================================================================

const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ==============================================================================
// HOT MODULE REPLACEMENT (HMR)
// ==============================================================================

if (import.meta.env.DEV && import.meta.hot) {
  // Accept hot updates for the App component
  import.meta.hot.accept('./App', newApp => {
    // Preserve component state during HMR
    const App = newApp?.default || newApp;
    if (App) {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
  });

  // Handle HMR errors gracefully
  import.meta.hot.accept(err => {
    if (err) {
      console.error('HMR error:', err);
      // Force full reload on HMR error
      location.reload();
    }
  });
}
