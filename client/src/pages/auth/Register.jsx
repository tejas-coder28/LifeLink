import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';
import {
  HeartHandshake,
  UserPlus,
  AlertCircle,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  Droplet,
  Sparkles,
  Building2
} from 'lucide-react';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import PageTransition from '../../components/common/PageTransition';
import Button from '../../components/common/Button';

const Register = () => {
  const { register } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState('user');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (accountType === 'user' && !bloodGroup) {
      const errMsg = 'Please select your blood group';
      setError(errMsg);
      showError(errMsg);
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name,
        email,
        password,
        accountType,
        phone,
        bloodGroup: accountType === 'user' ? bloodGroup : undefined,
      });
      if (user) {
        showSuccess('Account registered successfully!');
        const type = user.accountType || user.role;
        switch (type) {
          case 'hospital': navigate('/hospital/dashboard'); break;
          case 'admin':    navigate('/admin/dashboard'); break;
          case 'user':
          case 'individual':
          case 'donor':
          case 'recipient':
          default: navigate('/donor/dashboard'); break;
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed';
      setError(errMsg);
      showError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row glass-modal border border-glass shadow-elevated">
        {/* Left Branding Panel (Desktop / Tablet) */}
        <div
          className="md:w-5/12 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex border-r border-glass"
          style={{
            background: 'linear-gradient(135deg, rgba(7,11,20,0.95) 0%, rgba(13,22,41,0.92) 50%, rgba(20,31,54,0.95) 100%)',
          }}
        >
          {/* Teal decorative orb */}
          <div
            className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.7) 0%, transparent 70%)' }}
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Join the Standby Network</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black leading-tight font-heading text-primary">
                Every Donor <br />
                <span className="gradient-text-brand">Saves Lives</span>
              </h2>
              <p className="text-xs leading-relaxed text-secondary">
                Register as an individual standby donor or register your hospital to broadcast emergency requests in seconds.
              </p>
            </div>

            {/* Role summaries */}
            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <p className="text-xs font-bold text-brand-400">Standby Donor</p>
                <p className="text-[10px] text-secondary mt-0.5">Receive matched alerts within your radius when lives are at risk.</p>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <p className="text-xs font-bold text-sky-400">Hospital Medical Center</p>
                <p className="text-[10px] text-secondary mt-0.5">Manage blood inventory and post instant emergency broadcasts.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 relative z-10 pt-6 border-t border-glass">
            <div className="flex items-center space-x-3 text-xs font-semibold text-secondary">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-400" />
              <span>Verified Identity Protection</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 relative bg-surface/70 backdrop-blur-xl">
          {/* Mobile Top Brand Bar (375px - 767px) */}
          <div className="md:hidden flex items-center justify-between pb-6 mb-6 border-b border-theme">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow-brand">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-primary font-heading">
                Life<span className="gradient-text-brand">Link</span>
              </span>
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Register
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-6 mb-6 pb-px border-b border-theme">
            <Link
              to="/login"
              className="pb-3 font-bold text-xs sm:text-sm text-secondary hover:text-primary transition-colors border-b-2 border-transparent"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="pb-3 text-brand-500 font-extrabold text-xs sm:text-sm border-b-2 border-brand-500 transition-colors"
            >
              Create Account
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mb-1 font-heading">
              Create an Account
            </h1>
            <p className="text-xs text-secondary">
              Join the LifeLink emergency network. All data is securely encrypted.
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
            <GoogleLoginButton redirect="/" label="Sign up with Google" />
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-surface/90 text-muted font-extrabold text-[10px] tracking-wider">
                Or fill registration details
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type Selector */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-2 text-secondary">
                I am registering as:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAccountType('user')}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-3 ${
                    accountType === 'user'
                      ? 'bg-brand-500/15 border-brand-500/50 shadow-glow-brand'
                      : 'bg-surface/50 border-theme hover:bg-surface/80 text-secondary'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${accountType === 'user' ? 'bg-brand-500 text-white' : 'bg-surface text-muted'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-primary">Donor / Individual</span>
                    <span className="text-[10px] text-muted">Personal account</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('hospital')}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-3 ${
                    accountType === 'hospital'
                      ? 'bg-sky-500/15 border-sky-500/50 shadow-card'
                      : 'bg-surface/50 border-theme hover:bg-surface/80 text-secondary'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${accountType === 'hospital' ? 'bg-sky-500 text-white' : 'bg-surface text-muted'}`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-primary">Hospital</span>
                    <span className="text-[10px] text-muted">Medical facility</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-secondary">
                {accountType === 'hospital' ? 'Hospital / Center Name' : 'Full Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={accountType === 'hospital' ? 'City General Hospital' : 'John Doe'}
                  className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-3"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-secondary">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-3"
                />
              </div>
            </div>

            {/* Blood Group for Donors */}
            {accountType === 'user' && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-2 text-secondary">
                  Blood Group <span className="text-brand-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        bloodGroup === bg
                          ? 'bg-brand-500 text-white border-brand-500 shadow-glow-brand'
                          : 'bg-surface/60 border-theme hover:bg-surface text-secondary'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label htmlFor="reg-phone" className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-secondary">
                Contact Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-3"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-secondary">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
              Complete Registration
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
};

export default Register;
