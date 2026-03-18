import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const ran = useRef(false);
  const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const orderId = new URLSearchParams(window.location.search).get('order_id');
    if (!orderId) {
      navigate('/editor', { replace: true });
      return;
    }

    api.payments.verify(orderId)
      .then(result => {
        setStatus(result.status === 'SUCCESS' ? 'success' : result.status === 'PENDING' ? 'pending' : 'failed');
        if (result.status === 'SUCCESS') return refreshUser();
      })
      .catch(() => setStatus('failed'));
  }, [navigate, refreshUser]);

  const messages = {
    verifying: { icon: '⏳', title: 'Verifying payment…', sub: 'Please wait a moment.', color: '#64748b' },
    success: { icon: '✅', title: 'Payment successful!', sub: 'Your plan is now active. Enjoy unlimited downloads.', color: '#16a34a' },
    pending: { icon: '⏳', title: 'Payment pending', sub: 'We\'ll activate your plan once confirmed. Check back in a few minutes.', color: '#d97706' },
    failed: { icon: '❌', title: 'Payment failed', sub: 'Your card was not charged. Please try again.', color: '#dc2626' },
  };

  const m = messages[status];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,.1)', padding: '48px 36px', textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{m.icon}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: m.color, margin: '0 0 8px' }}>{m.title}</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px' }}>{m.sub}</p>
        <button
          onClick={() => navigate('/editor')}
          style={{ padding: '11px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Back to Resume Builder
        </button>
      </div>
    </div>
  );
}
