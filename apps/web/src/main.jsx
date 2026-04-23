import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import { ConfirmProvider } from './ConfirmContext';
import App from './App';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
