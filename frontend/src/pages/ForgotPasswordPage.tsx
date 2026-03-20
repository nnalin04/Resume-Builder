import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      setSent(true);
      // In dev mode the backend returns the link directly (SMTP not configured)
      if (res.dev_reset_link) setDevLink(res.dev_reset_link);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 font-sans px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-outfit font-bold text-xl shadow-glow">
            R
          </div>
          <span className="font-outfit font-bold text-2xl text-slate-900 tracking-tight">Resume Builder</span>
        </div>

        {sent ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-soft text-center">
            {/* Envelope icon */}
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-outfit text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              If <span className="font-semibold text-slate-700">{email}</span> is registered, we've sent a reset link.
              It expires in 30 minutes.
            </p>

            {/* Dev-only: show reset link when SMTP not configured */}
            {devLink && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-bold text-amber-700 mb-1">DEV MODE — SMTP not configured</p>
                <a href={devLink} className="text-xs text-brand-600 break-all underline">{devLink}</a>
              </div>
            )}

            <Link
              to="/login"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-outfit text-4xl font-bold text-slate-900 mb-2 tracking-tight">Forgot password?</h1>
            <p className="text-slate-500 mb-8 text-lg">
              Enter your email and we'll send you a reset link.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow bg-surface-50 text-slate-900 placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-soft hover:shadow-glow disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center mt-8 text-slate-600">
              Remember your password?{' '}
              <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
