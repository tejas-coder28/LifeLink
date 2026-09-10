import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HeartHandshake, UserPlus, AlertCircle, ShieldCheck, Mail, Lock, User, Phone, Briefcase, ArrowRight } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('donor');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register({ name, email, password, role, phone });
      if (user) {
        switch (user.role) {
          case 'donor': navigate('/donor/dashboard'); break;
          case 'recipient': navigate('/recipient/dashboard'); break;
          case 'hospital': navigate('/hospital/dashboard'); break;
          case 'admin': navigate('/admin/dashboard'); break;
          default: navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
        
        {/* Left Side - Visual/Branding */}
        <div className="md:w-5/12 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
          <div className="absolute top-0 left-0 -ml-16 -mt-16 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-0 -mr-16 -mb-16 w-64 h-64 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center space-x-2 group cursor-pointer mb-12">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">LifeLink</span>
            </Link>
            
            <h2 className="text-3xl font-extrabold leading-tight mb-6">
              Join the future of <br/><span className="text-rose-400">Emergency Response</span>.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Create an account to instantly plug into the region's smartest blood donation network. Your participation can save a life today.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Verified End-to-End Encryption</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                <HeartHandshake className="w-5 h-5 text-rose-400" />
                <span>AI-Powered Smart Matching</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 bg-white relative">
          
          {/* Tabs */}
          <div className="flex items-center space-x-6 mb-10 border-b border-slate-200 pb-px">
            <Link to="/login" className="pb-4 border-b-2 border-transparent text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="pb-4 border-b-2 border-rose-600 text-slate-900 font-bold text-sm">
              Create Account
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Register</h1>
            <p className="text-sm text-slate-500">Join LifeLink as a donor, recipient, or medical partner.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex items-center font-medium">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full pl-10 bg-slate-50 text-slate-900 text-sm px-3.5 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@lifelink.com"
                    className="w-full pl-10 bg-slate-50 text-slate-900 text-sm px-3.5 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 chars"
                    className="w-full pl-10 bg-slate-50 text-slate-900 text-sm px-3.5 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Phone (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full pl-10 bg-slate-50 text-slate-900 text-sm px-3.5 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Account Role</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 bg-slate-50 text-slate-900 text-sm px-3.5 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium appearance-none"
                >
                  <option value="donor">Blood Donor</option>
                  <option value="recipient">Patient / Recipient</option>
                  <option value="hospital">Medical Facility</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
              {!loading && <UserPlus className="w-4 h-4 ml-1" />}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Register;
