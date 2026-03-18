import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/editor', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-50 font-sans">
      
      {/* Left Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 animate-fade-in-up">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-outfit font-bold text-xl shadow-glow">
              R
            </div>
            <span className="font-outfit font-bold text-2xl text-slate-900 tracking-tight">Resume Builder</span>
          </div>

          <h1 className="font-outfit text-4xl font-bold text-slate-900 mb-2 tracking-tight">Create your account</h1>
          <p className="text-slate-500 mb-8 text-lg">Start building your resume for free.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Lee"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow bg-surface-50 text-slate-900 placeholder-slate-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow bg-surface-50 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow bg-surface-50 text-slate-900 placeholder-slate-400"
              />
            </div>

            <button type="submit" disabled={loading} className="mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-soft hover:shadow-glow disabled:opacity-70 disabled:cursor-not-allowed">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-center mt-10 text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Right Pane - Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden text-white flex-col justify-between p-16">
        {/* Abstract shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-500 rounded-full mix-blend-screen filter blur-[120px] opacity-60 animate-subtle-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-subtle-pulse" style={{ animationDelay: '1.5s' }}></div>
        
        <div className="relative z-10 w-full max-w-lg mx-auto top-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-brand-100 text-sm font-medium mb-6">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            New AI-Powered Templates
          </div>
          <h2 className="font-outfit font-bold text-5xl leading-tight mb-6">Unlock your career potential.</h2>
          <ul className="space-y-4 text-slate-300 text-lg">
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span>Automated structural analysis</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span>Premium, ATS-friendly templates</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-6 h-6 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span>AI suggestions for Bullet Points</span>
            </li>
          </ul>
        </div>
        
      </div>
    </div>
  );
}
