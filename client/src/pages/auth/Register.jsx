import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  AlertCircle,
  ShieldCheck,
  User,
  Building2,
  Mail,
  Lock,
  Phone,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import PageTransition from '../../components/common/PageTransition';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const Register = () => {
  const { register } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState('user'); // 'user' (donor) or 'hospital'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        phone,
        accountType,
      };

      if (accountType === 'user') {
        payload.bloodGroup = bloodGroup;
      }

      const res = await register(payload);
      if (res) {
        showSuccess('Account registered successfully! Welcome to LifeLink.');
        if (accountType === 'hospital') {
          navigate('/hospital/dashboard');
        } else {
          navigate('/donor/dashboard');
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row glass-modal border border-hairline shadow-elevated">
        {/* Left Visual Branding Panel (Midnight Navy Foundation) */}
        <div
          className="dark md:w-5/12 p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex border-r border-hairline bg-[#0A0F1C]"
          style={{
            background: 'linear-gradient(150deg, #0A0F1C 0%, #111A2E 45%, #18233D 75%, #0A0F1C 100%)',
          }}
        >
          {/* Harmonic orbs inside panel */}
          <div
            className="absolute -top-16 -left-10 w-72 h-72 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(43,76,140,0.30) 0%, transparent 68%)' }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(165,216,255,0.20) 0%, transparent 68%)' }}
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-15 pointer-events-none"
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
                <span className="text-[#A5D8FF]">Join the Standby Network</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black leading-tight font-heading text-white">
                Every Donor <br />
                <span className="text-white">Saves Lives</span>
              </h2>
              <p className="text-xs leading-relaxed text-[#9DAAC6]">
                Register as an individual standby donor or register your hospital to broadcast emergency requests in seconds.
              </p>
            </div>

            {/* Role summaries */}
            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-2xl bg-[#18233D]/60 border border-white/10">
                <p className="text-xs font-bold text-[#E8EEF9]">Standby Donor</p>
                <p className="text-[10px] text-[#9DAAC6] mt-0.5">Receive matched alerts within your radius when lives are at risk.</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#18233D]/60 border border-white/10">
                <p className="text-xs font-bold text-[#E8EEF9]">Hospital Medical Center</p>
                <p className="text-[10px] text-[#9DAAC6] mt-0.5">Manage blood inventory and post instant emergency broadcasts.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 relative z-10 pt-6 border-t border-hairline">
            <div className="flex items-center space-x-3 text-xs font-semibold text-[#E8EEF9]">
              <ShieldCheck className="w-4 h-4 shrink-0 text-success" />
              <span className="text-[#E8EEF9]">Verified Identity Protection</span>
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
              Register
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-6 mb-6 pb-px border-b border-hairline">
            <Link
              to="/login"
              className="pb-3 font-bold text-xs sm:text-sm text-secondary hover:text-primary transition-colors border-b-2 border-transparent"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="pb-3 text-primary font-extrabold text-xs sm:text-sm border-b-2 border-danger transition-colors"
            >
              Create Account
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight mb-1 font-heading">
              Join LifeLink
            </h1>
            <p className="text-xs text-secondary">
              Create an account to respond to emergencies or manage hospital inventory.
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

          {/* Google Quick Sign-Up */}
          <div className="mb-5">
            <GoogleLoginButton label="Sign up with Google" />
          </div>

          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-hairline" />
            <span className="shrink-0 px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Or register with email
            </span>
            <div className="flex-grow border-t border-hairline" />
          </div>

          {/* Registration Form */}
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
                      ? 'bg-info/10 border-info/50 shadow-sm'
                      : 'bg-surface/50 border-hairline hover:bg-surface/80 text-secondary'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${accountType === 'user' ? 'bg-info/20 text-info border border-info/30' : 'bg-surface text-muted border border-hairline'}`}>
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
                      ? 'bg-info/10 border-info/50 shadow-sm'
                      : 'bg-surface/50 border-hairline hover:bg-surface/80 text-secondary'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${accountType === 'hospital' ? 'bg-info/20 text-info border border-info/30' : 'bg-surface text-muted border border-hairline'}`}>
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
                  Blood Group <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        bloodGroup === bg
                          ? 'bg-surface text-primary border-info ring-1 ring-info/30 shadow-sm'
                          : 'bg-surface border-hairline hover:border-info/40 text-primary'
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
                  placeholder="+91 98765 43210"
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-3 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-glow-danger"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
};

export default Register;
