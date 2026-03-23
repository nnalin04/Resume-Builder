import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#22c55e' : '#ef4444',
      color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 14,
      fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}

// ─── Subscription badge ───────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free', ACTIVE: 'Active', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
};
const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  FREE:      { bg: '#f1f5f9', color: '#64748b' },
  ACTIVE:    { bg: '#dcfce7', color: '#16a34a' },
  EXPIRED:   { bg: '#fee2e2', color: '#dc2626' },
  CANCELLED: { bg: '#fef3c7', color: '#b45309' },
};

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
      padding: '24px 28px', marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, color: '#0f172a', background: '#f8fafc',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName]         = useState(user?.name ?? '');
  const [phone, setPhone]       = useState(user?.phone ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [bio, setBio]           = useState(user?.bio ?? '');
  const [linkedin, setLinkedin] = useState(user?.linkedin ?? '');
  const [github, setGithub]     = useState(user?.github ?? '');
  const [website, setWebsite]   = useState(user?.website ?? '');

  // UI states
  const [saving, setSaving]           = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);

  // Email verification states
  const [sendingOtp, setSendingOtp]   = useState(false);
  const [otpSent, setOtpSent]         = useState(false);
  const [otp, setOtp]                 = useState('');
  const [verifying, setVerifying]     = useState(false);
  const [emailVerified, setEmailVerified] = useState(user?.email_verified ?? false);

  // Sync form when user loads
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? '');
      setLocation(user.location ?? '');
      setBio(user.bio ?? '');
      setLinkedin(user.linkedin ?? '');
      setGithub(user.github ?? '');
      setWebsite(user.website ?? '');
      setEmailVerified(user.email_verified);
    }
  }, [user]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await api.auth.uploadAvatar(file);
      await refreshUser();
      showToast('Profile photo updated');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.auth.updateProfile({ name, phone, location, bio, linkedin, github, website });
      await refreshUser();
      showToast('Changes saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      await api.auth.sendEmailVerification();
      setOtpSent(true);
      showToast('Verification code sent to your email');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to send code', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (otp.trim().length !== 6) { showToast('Enter the 6-digit code', 'error'); return; }
    setVerifying(true);
    try {
      await api.auth.verifyEmail(otp.trim());
      setEmailVerified(true);
      setOtpSent(false);
      setOtp('');
      await refreshUser();
      showToast('Email verified!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Incorrect code', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  // ─── Derived values ─────────────────────────────────────────────────────────

  const planBadge = PLAN_COLORS[user.subscription_status] ?? PLAN_COLORS.FREE;
  const planLabel = user.subscription_plan
    ? `${user.subscription_plan.charAt(0).toUpperCase()}${user.subscription_plan.slice(1)}`
    : PLAN_LABELS[user.subscription_status] ?? user.subscription_status;

  const FREE_LIMIT = 3;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/editor')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 500, padding: '6px 0' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to editor
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Profile</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* ─── A) Avatar section ─────────────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar with hover overlay */}
            <div
              style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => !avatarLoading && avatarInputRef.current?.click()}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
            >
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt=""
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(0,0,0,0.45)',
                opacity: (avatarHover || avatarLoading) ? 1 : 0, transition: 'opacity 0.15s',
              }}>
                {avatarLoading ? (
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{user.name}</div>
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>{user.email}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Click photo to change</div>
            </div>
          </div>
        </Card>

        {/* ─── B) Account status banner ──────────────────────────────────── */}
        <Card>
          <SectionTitle>Subscription</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: planBadge.bg, color: planBadge.color,
            }}>
              {user.subscription_status === 'ACTIVE' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              )}
              {planLabel}
            </span>

            {user.subscription_status === 'FREE' && (
              <div style={{ fontSize: 13, color: '#64748b' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.free_downloads_used}</span>
                {' of '}
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{FREE_LIMIT}</span>
                {' free downloads used'}
                <span style={{ margin: '0 8px', color: '#e2e8f0' }}>·</span>
                <a href="/pricing" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Upgrade →</a>
              </div>
            )}

            {user.subscription_status === 'ACTIVE' && user.subscription_expiry && (
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Renews {new Date(user.subscription_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}

            {user.subscription_plan === 'lifetime' && (
              <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>Lifetime access ∞</div>
            )}
          </div>
        </Card>

        {/* ─── C) Personal information form ──────────────────────────────── */}
        <Card>
          <SectionTitle>Personal Information</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldRow label="Full Name">
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={100} />
              </FieldRow>
            </div>
            <FieldRow label="Phone">
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" maxLength={30} />
            </FieldRow>
            <FieldRow label="Location">
              <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" maxLength={80} />
            </FieldRow>
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldRow label={`Bio (${bio.length}/200)`}>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="A short bio about yourself"
                  maxLength={200}
                />
              </FieldRow>
            </div>
            <FieldRow label="LinkedIn URL">
              <input style={inputStyle} value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" maxLength={200} />
            </FieldRow>
            <FieldRow label="GitHub URL">
              <input style={inputStyle} value={github} onChange={e => setGithub(e.target.value)} placeholder="https://github.com/you" maxLength={200} />
            </FieldRow>
            <div style={{ gridColumn: '1 / -1' }}>
              <FieldRow label="Website">
                <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" maxLength={200} />
              </FieldRow>
            </div>
          </div>

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                background: saving ? '#a5b4fc' : '#6366f1', color: '#fff',
                border: 'none', borderRadius: 10, padding: '10px 24px',
                fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Card>

        {/* ─── D) Account & Security ─────────────────────────────────────── */}
        <Card>
          <SectionTitle>Account & Security</SectionTitle>

          {/* Email row */}
          <div style={{ paddingBottom: 16, borderBottom: '1px solid #f1f5f9', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>Email address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: '#0f172a' }}>{user.email}</span>
                  {emailVerified ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      Verified
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>
                      Unverified
                    </span>
                  )}
                </div>
              </div>
              {!emailVerified && !otpSent && (
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', background: 'none', border: '1px solid #e0e7ff', borderRadius: 8, padding: '6px 14px', cursor: sendingOtp ? 'wait' : 'pointer' }}
                >
                  {sendingOtp ? 'Sending…' : 'Send verification email'}
                </button>
              )}
            </div>

            {/* OTP input — shown after sending */}
            {otpSent && !emailVerified && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  style={{ ...inputStyle, width: 140, letterSpacing: 4, fontWeight: 700, fontSize: 18, textAlign: 'center', padding: '8px 12px' }}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                />
                <button
                  onClick={handleVerifyEmail}
                  disabled={verifying || otp.length !== 6}
                  style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: otp.length === 6 ? '#6366f1' : '#a5b4fc', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: otp.length === 6 ? 'pointer' : 'default' }}
                >
                  {verifying ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 4px' }}
                >
                  Resend
                </button>
              </div>
            )}
          </div>

          {/* Password row — LOCAL auth only */}
          {user.auth_provider === 'LOCAL' && (
            <div style={{ paddingBottom: 16, borderBottom: '1px solid #f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>Password</div>
                <div style={{ fontSize: 14, color: '#0f172a', letterSpacing: 3 }}>••••••••</div>
              </div>
              <a
                href={`/forgot-password`}
                style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textDecoration: 'none', border: '1px solid #e0e7ff', borderRadius: 8, padding: '6px 14px' }}
              >
                Change password
              </a>
            </div>
          )}

          {/* Auth provider row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>Sign-in method</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.auth_provider === 'GOOGLE' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span style={{ fontSize: 14, color: '#0f172a' }}>Google account</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span style={{ fontSize: 14, color: '#0f172a' }}>Email & password</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ─── E) Danger zone ────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Session</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Sign out</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>You'll be redirected to the home page</div>
            </div>
            <button
              onClick={handleSignOut}
              style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
