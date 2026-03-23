import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/editor';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google login not configured.');
      return;
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <div className="min-h-screen flex bg-surface-50 font-sans">
      
      {/* Left Pane - Form */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16"
      >
        <div className="max-w-md w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-outfit font-bold text-xl shadow-glow">
              R
            </div>
            <span className="font-outfit font-bold text-2xl text-slate-900 tracking-tight">Resume Builder</span>
          </div>

          <h1 className="font-outfit text-4xl font-bold text-slate-900 mb-2 tracking-tight">Welcome back</h1>
          <p className="text-slate-500 mb-8 text-lg">Sign in to your account</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <Label className="block mb-2">Email address</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-6 rounded-xl bg-surface-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Password</Label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-6 pr-11 rounded-xl bg-surface-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-4 w-full h-12 rounded-xl text-base bg-brand-600 hover:bg-brand-700 shadow-soft hover:shadow-glow">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-surface-50 text-slate-500">Or continue with</span>
                </div>
              </div>
              
              <Button variant="outline" onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl text-slate-700 font-semibold shadow-sm text-base">
                <GoogleIcon />
                Google
              </Button>
            </>
          )}

          <p className="text-center mt-10 text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Sign up free</Link>
          </p>
        </div>
      </motion.div>

      {/* Right Pane - Gradient Background */}
      <motion.div 
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative bg-brand-900 overflow-hidden text-white flex-col justify-between p-16"
      >
        {/* Abstract shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-subtle-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-subtle-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 w-full max-w-lg mx-auto top-20">
          <h2 className="font-outfit font-bold text-5xl leading-tight mb-6">Build your standout resume in minutes.</h2>
          <p className="text-brand-100 text-xl leading-relaxed">Join thousands of professionals landing their dream jobs with ATS-optimized, beautifully crafted resumes.</p>
        </div>
        
        <div className="relative z-10 w-full max-w-lg mx-auto backdrop-blur-md bg-white/10 p-8 rounded-3xl border border-white/20 shadow-glass">
          <p className="text-lg italic text-brand-50 mb-4">"The UI is so clean and importing my old PDF was magical. Landed interviews at two FAANG companies using the Minimal template!"</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-300 to-purple-400 flex items-center justify-center font-bold text-white text-lg shadow-inner">AL</div>
            <div>
              <div className="font-semibold">Alex Lee</div>
              <div className="text-brand-200 text-sm">Software Engineer</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}



function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}
