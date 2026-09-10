import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  HeartHandshake, 
  Activity, 
  User, 
  LogOut, 
  Building2, 
  ShieldCheck, 
  Menu, 
  X,
  Search,
  ChevronRight
} from 'lucide-react';
import Badge from './Badge';

const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/#how-it-works') return location.hash === '#how-it-works';
    if (path === '/') return location.pathname === '/' && !location.hash;
    return location.pathname === path;
  };

  const NavLink = ({ to, children, highlighted }) => {
    const active = isActive(to);
    
    if (highlighted) {
      return (
        <Link
          to={to}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
            active 
              ? 'bg-rose-100 text-rose-600 border border-rose-200' 
              : 'text-rose-600 border border-transparent hover:bg-rose-50'
          }`}
        >
          {children}
        </Link>
      );
    }
    
    return (
      <a
        href={to}
        onClick={() => setMobileMenuOpen(false)}
        className={`text-sm font-medium transition-colors hover:text-rose-600 ${
          active ? 'text-rose-600 font-semibold' : 'text-slate-600'
        }`}
      >
        {children}
      </a>
    );
  };

  return (
    <>
      <nav 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200 py-3' 
            : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* LEFT: Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-md shadow-rose-600/20 group-hover:scale-105 transition-transform duration-300">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  Life<span className="text-rose-600">Link</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-0.5">
                  Smart Donor Network
                </span>
              </div>
            </Link>

            {/* CENTER: Navigation */}
            <div className="hidden lg:flex items-center justify-center space-x-8">
              <NavLink to="/#how-it-works">How It Works</NavLink>
              <NavLink to="/find-donors">Find Donors</NavLink>
              
              {/* Role-Specific Portal Links */}
              {user && (
                <>
                  {role === 'donor' && <NavLink to="/donor/dashboard">Donor Hub</NavLink>}
                  {role === 'recipient' && <NavLink to="/recipient/dashboard">Dashboard</NavLink>}
                  {role === 'hospital' && <NavLink to="/hospital/dashboard">Hospital Portal</NavLink>}
                  {role === 'admin' && <NavLink to="/admin/dashboard">Admin Command</NavLink>}
                </>
              )}
              
              <NavLink to="/emergency-request" highlighted={true}>
                <Activity className="w-4 h-4 mr-1.5 animate-pulse" />
                Emergency Request
              </NavLink>
            </div>

            {/* RIGHT: Auth */}
            <div className="hidden lg:flex items-center justify-end space-x-4">
              {user ? (
                <div className="flex items-center space-x-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</div>
                    <Badge role={user.role} />
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-50 rounded-full transition-colors ml-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-full transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 px-5 py-2.5 rounded-full shadow-md shadow-rose-600/20 transition-all transform hover:-translate-y-0.5"
                  >
                    Register Now
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-80 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-lg font-bold text-slate-900">Menu</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-6 space-y-6">
          <div className="flex flex-col space-y-4">
            <a href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600 hover:text-rose-600 flex items-center justify-between">
              How It Works <ChevronRight className="w-4 h-4" />
            </a>
            <a href="/find-donors" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600 hover:text-rose-600 flex items-center justify-between">
              Find Donors <ChevronRight className="w-4 h-4" />
            </a>
            <Link to="/emergency-request" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-rose-600 bg-rose-50 px-4 py-3 rounded-xl flex items-center justify-between">
              <span className="flex items-center"><Activity className="w-5 h-5 mr-2" /> Emergency Request</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {user && (
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Your Portal</span>
              {role === 'donor' && <Link to="/donor/dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 font-medium hover:text-rose-600">Donor Hub</Link>}
              {role === 'recipient' && <Link to="/recipient/dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 font-medium hover:text-rose-600">Recipient Dashboard</Link>}
              {role === 'hospital' && <Link to="/hospital/dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 font-medium hover:text-rose-600">Hospital Dashboard</Link>}
              {role === 'admin' && <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 font-medium hover:text-rose-600">Admin Panel</Link>}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-rose-600 bg-white rounded-full shadow-sm">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-white bg-rose-600 rounded-xl font-bold shadow-md">
                Register Now
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-slate-700 bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-50">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
