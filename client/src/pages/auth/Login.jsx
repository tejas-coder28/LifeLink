import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HeartHandshake, LogIn, AlertCircle, ShieldCheck, Mail, Lock, User, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user) {
        if (redirect === '/') {
          switch (user.role) {
            case 'donor': navigate('/donor/dashboard'); break;
            case 'recipient': navigate('/recipient/dashboard'); break;
            case 'hospital': navigate('/hospital/dashboard'); break;
            case 'admin': navigate('/admin/dashboard'); break;
            default: navigate('/');
          }
        } else {
          navigate(redirect);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoUser = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
        
        {/* Left Side - Visual/Branding */}
        <div className="md:w-5/12 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center space-x-2 group cursor-pointer mb-12">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">LifeLink</span>
            </Link>
            
            <h2 className="text-3xl font-extrabold leading-tight mb-6">
              Welcome back to the <br/><span className="text-rose-400">Smart Donor Network</span>.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Sign in to access your role-based portal. Hospitals, donors, and recipients seamlessly connect here to save lives every day.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Secure HIPAA Compliant Portal</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                <HeartHandshake className="w-5 h-5 text-rose-400" />
                <span>Join 10,000+ Active Donors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 bg-white relative">
          
          {/* Tabs */}
          <div className="flex items-center space-x-6 mb-10 border-b border-slate-200 pb-px">
            <Link to="/login" className="pb-4 border-b-2 border-rose-600 text-slate-900 font-bold text-sm">
              Sign In
            </Link>
            <Link to="/register" className="pb-4 border-b-2 border-transparent text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
              Create Account
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Sign In</h1>
            <p className="text-sm text-slate-500">Enter your credentials to securely access your portal.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm flex items-center font-medium">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="donor@lifelink.com"
                  className="w-full pl-11 bg-slate-50 text-slate-900 text-sm px-4 py-3.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 bg-slate-50 text-slate-900 text-sm px-4 py-3.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
            </button>
          </form>

          {/* Demo Login Quick Selection */}
          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
              Quick Access Demo Roles
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={() => loadDemoUser('donor1@lifelink.com', 'donor123')} className="px-3 py-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-left transition-colors group">
                <span className="font-bold text-xs text-rose-600 block">Donor</span>
                <span className="text-[10px] text-slate-500 group-hover:text-rose-500">O- Universal</span>
              </button>
              <button onClick={() => loadDemoUser('recipient@lifelink.com', 'recipient123')} className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-left transition-colors group">
                <span className="font-bold text-xs text-indigo-600 block">Recipient</span>
                <span className="text-[10px] text-slate-500 group-hover:text-indigo-500">Needs Blood</span>
              </button>
              <button onClick={() => loadDemoUser('hospital@lifelink.com', 'hospital123')} className="px-3 py-2 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 rounded-lg text-left transition-colors group">
                <span className="font-bold text-xs text-sky-600 block">Hospital</span>
                <span className="text-[10px] text-slate-500 group-hover:text-sky-500">Inventory</span>
              </button>
              <button onClick={() => loadDemoUser('admin@lifelink.com', 'admin123')} className="px-3 py-2 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-lg text-left transition-colors group">
                <span className="font-bold text-xs text-amber-600 block">Admin</span>
                <span className="text-[10px] text-slate-500 group-hover:text-amber-500">System AI</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
