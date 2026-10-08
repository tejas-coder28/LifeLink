import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  Building2,
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import PageTransition from '../../components/common/PageTransition';
import Button from '../../components/common/Button';

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
    <PageTransition className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row glass-modal border border-glass shadow-elevated">
        {/* Left Visual Branding Panel (Visible on Desktop / Tablet) */}
        <div
          className="md:w-5/12 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex border-r border-glass"
          style={{
            background: 'linear-gradient(135deg, rgba(7,11,20,0.95) 0%, rgba(13,22,41,0.92) 50%, rgba(20,31,54,0.95) 100%)',
          }}
        >
          {/* Decorative glowing orb */}
          <div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.7) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform bg-gradient-to-br from-brand-500 to-brand-700">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-primary font-heading">
                Life<span className="gradient-text-brand">Link</span>
              </span>
            </Link>

            <div className="space-y-3 pt-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Sparkles className="w-3 h-3 text-brand-400" />
                <span>Life-Saving Network</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black leading-tight font-heading text-primary">
                Access Your <br />
                <span className="gradient-text-brand">Emergency Portal</span>
              </h2>
              <p className="text-xs leading-relaxed text-secondary">
                Connect to real-time emergency requests, live hospital blood inventory, and automated donor matching.
              </p>
            </div>
          </div>

          <div className="space-y-3 relative z-10 pt-8 border-t border-glass">
            <div className="flex items-center space-x-3 text-xs font-semibold text-secondary">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-400" />
              <span>Encrypted Firebase Security</span>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold text-secondary">
              <HeartHandshake className="w-4 h-4 shrink-0 text-brand-400" />
              <span>Real-Time Standby Network</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 relative bg-surface/70 backdrop-blur-xl">
          {/* Mobile Top Brand Bar (Visible on 375px - 767px) */}
          <div className="md:hidden flex items-center justify-between pb-6 mb-6 border-b border-theme">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow-brand">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-primary font-heading">
                Life<span className="gradient-text-brand">Link</span>
              </span>
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Sign In
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-6 mb-6 pb-px border-b border-theme">
            <Link
              to="/login"
              className="pb-3 text-brand-500 font-extrabold text-xs sm:text-sm border-b-2 border-brand-500 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="pb-3 font-bold text-xs sm:text-sm text-secondary hover:text-primary transition-colors border-b-2 border-transparent"
            >
              Create Account
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mb-1 font-heading">
              Welcome Back
            </h1>
            <p className="text-xs text-secondary">
              Enter your credentials to manage your requests and donations.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center bg-brand-500/10 border border-brand-500/30 text-brand-400"
            >
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Google Sign In */}
          <div className="mb-5">
            <GoogleLoginButton redirect={redirect} label="Sign in with Google" />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-surface/90 text-muted font-extrabold text-[10px] tracking-wider">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-secondary"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@lifelink.com"
                  className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-3"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[10px] font-extrabold uppercase tracking-wider text-secondary"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] font-bold text-brand-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-10 text-xs sm:text-sm px-3.5 py-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-primary transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-3 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-glow-brand"
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Access Demo Accounts Selection (Local Dev Only) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-theme">
              <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2.5 text-center text-muted">
                Demo Accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => loadDemoUser('user@lifelink.com', 'user123')}
                  className="p-2 sm:p-2.5 rounded-xl text-left transition-colors bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 cursor-pointer"
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-brand-400">Donor</span>
                  <span className="text-[9px] text-muted">O− Universal</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadDemoUser('hospital@lifelink.com', 'hospital123')}
                  className="p-2 sm:p-2.5 rounded-xl text-left transition-colors bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 cursor-pointer"
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-sky-400">Hospital</span>
                  <span className="text-[9px] text-muted">Emergency Hub</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadDemoUser('admin@lifelink.com', 'admin123')}
                  className="p-2 sm:p-2.5 rounded-xl text-left transition-colors bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 cursor-pointer"
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-amber-400">Admin</span>
                  <span className="text-[9px] text-muted">Full Control</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;
