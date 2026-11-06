import React, { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  AlertCircle,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import PageTransition from '../../components/common/PageTransition';

const Login = () => {
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState(null);

  const submitButtonRef = useRef(null);

  const handleSelectDemo = (roleKey, demoEmail, demoPassword) => {
    setActiveRole(roleKey);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    submitButtonRef.current?.focus();
  };

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row glass-modal border border-hairline shadow-elevated">
        {/* Left Visual Branding Panel (Midnight Navy Foundation with subtle harmonic glows) */}
        <div
          className="dark md:w-5/12 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex border-r border-hairline bg-[#0A0F1C]"
          style={{
            background: 'linear-gradient(150deg, #0A0F1C 0%, #111A2E 45%, #18233D 75%, #0A0F1C 100%)',
          }}
        >
          {/* Harmonic orbs inside panel */}
          <div
            className="absolute -top-16 -left-10 w-72 h-72 rounded-full opacity-60 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(43,76,140,0.30) 0%, transparent 68%)' }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-45 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(165,216,255,0.20) 0%, transparent 68%)' }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(209,52,56,0.12) 0%, transparent 68%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-glow-danger group-hover:scale-105 transition-transform bg-danger text-white">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <span className="text-xl font-black tracking-tight text-white font-heading">
                Life<span className="text-[#E5484D]">Link</span>
              </span>
            </Link>

            <div className="space-y-3 pt-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#1D6FD6]/20 border border-[#60A5FA]/30 text-[#A5D8FF] shadow-sm">
                <Sparkles className="w-3 h-3 text-[#A5D8FF]" />
                <span className="text-[#A5D8FF]">Life-Saving Network</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black leading-tight font-heading text-white">
                Access Your <br />
                <span className="text-white">Emergency Portal</span>
              </h2>
              <p className="text-xs leading-relaxed text-[#9DAAC6]">
                Connect to real-time emergency requests, live hospital blood inventory, and automated donor matching.
              </p>
            </div>
          </div>

          <div className="space-y-3 relative z-10 pt-8 border-t border-hairline">
            <div className="flex items-center space-x-3 text-xs font-semibold text-white">
              <ShieldCheck className="w-4 h-4 shrink-0 text-success" />
              <span className="text-[#E8EEF9]">Encrypted Firebase Security</span>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold text-[#E8EEF9]">
              <HeartHandshake className="w-4 h-4 shrink-0 text-[#60A5FA]" />
              <span className="text-[#E8EEF9]">Real-Time Standby Network</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 relative bg-surface backdrop-blur-xl">
          {/* Mobile Top Brand Bar */}
          <div className="md:hidden flex items-center justify-between pb-6 mb-6 border-b border-hairline">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-danger shadow-glow-danger">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-primary font-heading">
                Life<span className="text-danger">Link</span>
              </span>
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-info/10 text-info border border-info/30">
              Sign In
            </span>
          </div>

          {/* Tab Navigation (Crimson reserved for active pill) */}
          <div className="flex items-center space-x-6 mb-6 pb-px border-b border-hairline">
            <Link
              to="/login"
              className="pb-3 text-primary font-extrabold text-xs sm:text-sm border-b-2 border-danger transition-colors"
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
              className="mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center bg-danger/10 border border-danger/30 text-danger"
            >
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-danger" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Google Sign In */}
          <div className="mb-5">
            <GoogleLoginButton redirect={redirect} label="Sign in with Google" />
          </div>

          {/* Divider */}
          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-hairline" />
            <span className="shrink-0 px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Or continue with email
            </span>
            <div className="flex-grow border-t border-hairline" />
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
                  className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-3 caret-info transition-all duration-150"
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
                  className="text-[10px] font-bold text-info hover:underline"
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
                  className="glass-input w-full pl-10 pr-10 text-xs sm:text-sm px-3.5 py-3 caret-info transition-all duration-150"
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

            <button
              ref={submitButtonRef}
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-3 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-glow-danger"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Quick Access Demo Accounts Selection */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-hairline">
              <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2.5 text-center text-muted">
                Demo Accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDemo('donor', 'user@lifelink.com', 'user123')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer hover:scale-[1.02] ${
                    activeRole === 'donor'
                      ? 'border-info shadow-sm bg-info/15'
                      : 'border-hairline bg-surface/60 hover:border-info/40'
                  }`}
                  style={{ backdropFilter: 'blur(16px)' }}
                  aria-pressed={activeRole === 'donor'}
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-primary">
                    Donor
                  </span>
                  <span className="text-[9px] text-muted">O− Universal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemo('hospital', 'hospital@lifelink.com', 'hospital123')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer hover:scale-[1.02] ${
                    activeRole === 'hospital'
                      ? 'border-success shadow-sm bg-success/15'
                      : 'border-hairline bg-surface/60 hover:border-success/40'
                  }`}
                  style={{ backdropFilter: 'blur(16px)' }}
                  aria-pressed={activeRole === 'hospital'}
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-primary">
                    Hospital
                  </span>
                  <span className="text-[9px] text-muted">Emergency Hub</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDemo('admin', 'admin@lifelink.com', 'admin123')}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer hover:scale-[1.02] ${
                    activeRole === 'admin'
                      ? 'border-warning shadow-sm bg-warning/15'
                      : 'border-hairline bg-surface/60 hover:border-warning/40'
                  }`}
                  style={{ backdropFilter: 'blur(16px)' }}
                  aria-pressed={activeRole === 'admin'}
                >
                  <span className="font-extrabold text-[11px] block leading-tight text-primary">
                    Admin
                  </span>
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
