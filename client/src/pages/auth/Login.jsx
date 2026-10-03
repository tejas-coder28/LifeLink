import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { HeartHandshake, LogIn, AlertCircle, ShieldCheck, Mail, Lock, User, ArrowRight, Building2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user) {
        showSuccess(`Welcome back, ${user.name}!`);
        if (redirect === '/') {
          const type = user.accountType || user.role;
          switch (type) {
            case 'hospital': navigate('/hospital/dashboard'); break;
            case 'admin': navigate('/admin/dashboard'); break;
            case 'user':
            case 'individual':
            case 'donor':
            case 'recipient':
            default: navigate('/donor/dashboard'); break;
          }
        } else {
          navigate(redirect);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Invalid email or password';
      setError(errMsg);
      showError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoUser = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 py-8">
      <div
        className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-200/80 dark:border-white/10 shadow-2xl"
      >
        {/* Left Visual Branding Panel */}
        <div
          className="md:w-5/12 p-10 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex"
          style={{
            background: 'linear-gradient(135deg, #0F1729 0%, #182235 50%, #1E2D44 100%)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Decorative orb */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.8) 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center space-x-2 group cursor-pointer">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"
                style={{ background: 'linear-gradient(135deg, #DC2626, #b91c1c)', boxShadow: '0 0 20px rgba(220,38,38,0.40)' }}
              >
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-white font-heading">
                Life<span className="gradient-text-brand">Link</span>
              </span>
            </Link>

            <div className="space-y-3 pt-6">
              <h2 className="text-2xl font-black leading-tight font-heading">
                Access Your <br />
                <span className="gradient-text-brand">Emergency Portal</span>
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Connect to real-time blood requests, hospital inventory, and smart donor matching.
              </p>
            </div>
          </div>

          <div
            className="space-y-3 relative z-10 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center space-x-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: '#5eead4' }} />
              <span>Secure &amp; Private</span>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <HeartHandshake className="w-4 h-4 shrink-0" style={{ color: '#fb7185' }} />
              <span>Active Donor Network</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div
          className="w-full md:w-7/12 p-8 sm:p-12 relative bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl"
        >
          <div
            className="flex items-center space-x-6 mb-8 pb-px border-b border-slate-200/80 dark:border-white/10"
          >
            <Link to="/login" className="pb-3 text-rose-600 dark:text-white font-extrabold text-sm border-b-2 border-rose-600">
              Sign In
            </Link>
            <Link to="/register" className="pb-3 font-bold text-sm transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-b-2 border-transparent">
              Create Account
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-primary tracking-tight mb-1 font-heading">Sign In</h1>
            <p className="text-xs text-secondary">Enter your email and password to access your dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@lifelink.com"
                  className="glass-input w-full pl-10 text-xs px-3.5 py-3"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <Link to="/forgot-password" className="text-[10px] font-bold hover:underline" style={{ color: '#fb7185' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-10 text-xs px-3.5 py-3"
                />
                {/* Show / Hide password toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-3.5 rounded-xl text-xs justify-center"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Access Demo Accounts Selection (Local Dev Only) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-white/10">
              <p className="text-[10px] font-extrabold uppercase tracking-wider mb-3 text-center text-muted">
                Quick Access — Demo Accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => loadDemoUser('user@lifelink.com', 'user123')}
                  className="px-2.5 py-2.5 rounded-xl text-left transition-colors bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25"
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-rose-600 dark:text-rose-400">User</span>
                  <span className="text-[9px] text-muted">Universal O-</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadDemoUser('hospital@lifelink.com', 'hospital123')}
                  className="px-2.5 py-2.5 rounded-xl text-left transition-colors bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/25"
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-sky-600 dark:text-sky-400">Hospital</span>
                  <span className="text-[9px] text-muted">Inventory</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadDemoUser('admin@lifelink.com', 'admin123')}
                  className="px-2.5 py-2.5 rounded-xl text-left transition-colors bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25"
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-amber-600 dark:text-amber-400">Admin</span>
                  <span className="text-[9px] text-muted">AI Insights</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
