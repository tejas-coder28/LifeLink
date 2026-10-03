import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';
import {
  HeartHandshake, UserPlus, AlertCircle, ShieldCheck,
  Mail, Lock, User, Phone, Briefcase, ArrowRight, Eye, EyeOff, Droplet
} from 'lucide-react';

/* ── Shared field wrapper ──────────────────────────────────────────────── */
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {label}
    </label>
    {children}
  </div>
);

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
          case 'user': case 'individual': case 'donor': case 'recipient':
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
    <div className="min-h-[80vh] flex items-center justify-center p-4 py-8">
      <div
        className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-200/80 dark:border-white/10 shadow-2xl"
      >
        {/* ── Left Branding Panel ── */}
        <div
          className="md:w-5/12 p-10 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex"
          style={{
            background: 'linear-gradient(135deg, #0F1729 0%, #182235 50%, #1E2D44 100%)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Teal decorative orb */}
          <div
            className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(34,200,160,0.8) 0%, transparent 70%)' }}
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
                Join the Emergency <br />
                <span className="gradient-text-teal">Response Network</span>
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Create your account to respond to blood emergencies, manage hospital inventory, or broadcast urgent requests.
              </p>
            </div>

            {/* Role cards */}
            <div className="space-y-2 pt-2">
              {[
                { label: 'Donor / Individual', desc: 'Donate blood & respond to emergency requests', color: '#fb7185', bg: 'rgba(220,38,38,0.12)' },
                { label: 'Hospital / Medical Center', desc: 'Manage blood bank, post requests, find donors', color: '#93c5fd', bg: 'rgba(59,158,255,0.12)' },
              ].map(({ label, desc, color, bg }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: bg, border: `1px solid ${color}25` }}>
                  <p className="text-xs font-bold" style={{ color }}>{label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="space-y-3 relative z-10 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center space-x-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: '#5eead4' }} />
              <span>Verified Identity Protection</span>
            </div>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div
          className="w-full md:w-7/12 p-8 sm:p-12 relative bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl"
        >
          {/* Tab nav */}
          <div
            className="flex items-center space-x-6 mb-8 pb-px border-b border-slate-200/80 dark:border-white/10"
          >
            <Link to="/login" className="pb-3 font-bold text-sm transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-b-2 border-transparent">
              Sign In
            </Link>
            <Link to="/register" className="pb-3 text-rose-600 dark:text-white font-extrabold text-sm border-b-2 border-rose-600">
              Create Account
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-primary tracking-tight mb-1 font-heading">Create Account</h1>
            <p className="text-xs text-secondary">Select your role and fill in your details to get started.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                    <User className="h-4 w-4" />
                  </div>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera" className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
                </div>
              </Field>

              <Field label="Email Address">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@lifelink.com" className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Password">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <input type={showPassword ? 'text' : 'password'} required minLength={6}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters" className="glass-input w-full pl-10 pr-10 text-xs px-3.5 py-3" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Phone Number (Optional)">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                    <Phone className="h-4 w-4" />
                  </div>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210" className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
                </div>
              </Field>
            </div>

            {/* Role selector — visual cards */}
            <Field label="Account Role">
              <div className="grid grid-cols-2 gap-3 mt-1">
                {[
                  { value: 'user', label: 'Blood Donor', sub: 'Individual / Recipient', color: '#fb7185', bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.35)' },
                  { value: 'hospital', label: 'Hospital', sub: 'Medical Center / Blood Bank', color: '#93c5fd', bg: 'rgba(59,158,255,0.15)', border: 'rgba(59,158,255,0.35)' },
                ].map(({ value, label, sub, color, bg, border }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccountType(value)}
                    className="p-4 rounded-xl text-left transition-all"
                    style={accountType === value
                      ? { background: bg, border: `2px solid ${border}`, boxShadow: `0 0 16px ${color}25` }
                      : { background: 'var(--surface-glass)', border: '2px solid var(--border)' }
                    }
                  >
                    <span className="text-xs font-extrabold block" style={{ color: accountType === value ? color : 'var(--text-primary)' }}>{label}</span>
                    <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>{sub}</span>
                  </button>
                ))}
              </div>
            </Field>

            {accountType === 'user' && (
              <Field label="Blood Group *">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: '#fb7185' }}>
                    <Droplet className="h-4 w-4" />
                  </div>
                  <select
                    required
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="glass-select w-full pl-10 text-xs px-3.5 py-3"
                  >
                    <option value="" disabled>Select your blood group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg} className="bg-slate-900 text-white">
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4 py-3.5 rounded-xl text-xs justify-center"
            >
              <span>{loading ? 'Creating account...' : 'Complete Registration'}</span>
              {!loading && <UserPlus className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
