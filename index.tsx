import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (reason?.message || (typeof reason === 'string' ? reason : '') || '').toLowerCase();
  if (
    msg.includes('refresh token') ||
    msg.includes('auth session missing') ||
    msg.includes('jwt') ||
    msg.includes('invalid_grant') ||
    msg.includes('not_found') ||
    msg.includes('invalid refresh')
  ) {
    console.warn("Caught unhandled auth rejection:", msg);
    event.preventDefault();
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error("Error clearing auth keys:", e);
    }
    if (!window.location.hash.includes('/login')) {
       window.location.hash = '#/login';
    }
  }
});

window.addEventListener('error', (event) => {
  const msg = (event.message || (event.error && event.error.message) || '').toLowerCase();
  if (
    msg.includes('refresh token') ||
    msg.includes('auth session missing') ||
    msg.includes('jwt') ||
    msg.includes('invalid_grant') ||
    msg.includes('not_found') ||
    msg.includes('invalid refresh')
  ) {
    console.warn("Caught unhandled auth error:", msg);
    event.preventDefault();
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
    return true;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
