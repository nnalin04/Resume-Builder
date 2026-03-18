import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message + '\n' + err.stack };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#c00' }}>
          <b>App crash</b><br />
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Splash while auth loads ──────────────────────────────────────────────────

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#94a3b8', fontSize: 15 }}>Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/editor" element={<Dashboard />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
