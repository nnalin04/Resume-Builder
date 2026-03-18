import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      navigate('/login?error=no_code', { replace: true });
      return;
    }

    api.auth.googleCallback(code)
      .then(resp => {
        localStorage.setItem('auth_token', resp.token);
        return refreshUser();
      })
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=google_failed', { replace: true }));
  }, [navigate, refreshUser]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <p style={{ color: '#64748b', fontSize: 15 }}>Completing sign-in…</p>
    </div>
  );
}
