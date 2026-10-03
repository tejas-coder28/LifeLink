import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  HeartHandshake,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import Badge from './Badge';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { user, accountType, role, logout } = useAuth();
  const currentType = accountType || role;
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
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
    return location.pathname.startsWith(path);
  };

  const isIndividual = currentType === 'user' || currentType === 'individual' || currentType === 'donor' || currentType === 'recipient';
  const isHospital = currentType === 'hospital';
  const isAdmin = currentType === 'admin';

  const navLinkBase = 'text-xs font-bold transition-all duration-150';
  const navLinkActive = 'text-primary font-extrabold';
  const navLinkInactive = 'text-secondary hover:text-primary';

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-navbar py-3 shadow-elevated'
            : 'glass-navbar py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">

            {/* LEFT: Logo & Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform duration-300">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-primary leading-none font-heading">
                  Life<span className="gradient-text-brand">Link</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted font-bold mt-0.5">
                  Emergency Blood Network
                </span>
              </div>
            </Link>

            {/* CENTER: Navigation Links */}
            <div className="hidden lg:flex items-center justify-center space-x-7">
              <Link
                to="/"
                className={`${navLinkBase} ${isActive('/') ? navLinkActive : navLinkInactive}`}
              >
                Home
              </Link>
              <Link
                to="/find-donors"
                className={`${navLinkBase} ${isActive('/find-donors') ? navLinkActive : navLinkInactive}`}
              >
                Find Donors & Hospitals
              </Link>
              <Link
                to="/about"
                className={`${navLinkBase} ${isActive('/about') ? navLinkActive : navLinkInactive}`}
              >
                About
              </Link>

              {/* Portal Dashboards */}
              {user && (
                <>
                  {isIndividual && (
                    <Link
                      to="/donor/dashboard"
                      className={`${navLinkBase} ${isActive('/donor') || isActive('/individual') ? navLinkActive : navLinkInactive}`}
                    >
                      Donor Portal
                    </Link>
                  )}
                  {isHospital && (
                    <Link
                      to="/hospital/dashboard"
                      className={`${navLinkBase} ${isActive('/hospital') ? navLinkActive : navLinkInactive}`}
                    >
                      Hospital Hub
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      className={`${navLinkBase} ${isActive('/admin') ? navLinkActive : navLinkInactive}`}
                    >
                      Admin Control
                    </Link>
                  )}
                </>
              )}

              {/* Emergency CTA in nav */}
              <Link
                to="/emergency-request"
                className="emergency-pulse flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all"
              >
                <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>Emergency Request</span>
              </Link>
            </div>

            {/* RIGHT: User Profile & Actions */}
            <div className="hidden lg:flex items-center justify-end space-x-3">
              {/* Theme Toggle Button */}
              <ThemeToggle />

              {user ? (
                <div
                  className="flex items-center space-x-3 px-3 py-1.5 rounded-2xl border border-theme bg-surface-glass"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-xs flex items-center justify-center shadow-glow-brand">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-bold text-primary leading-tight">{user.name}</div>
                    <Badge accountType={currentType} />
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ml-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-xs font-bold text-secondary hover:text-rose-600 dark:hover:text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-xs px-5 py-2.5"
                  >
                    Register Now
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu controls */}
            <div className="lg:hidden flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-80 z-[70] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col glass-modal`}
        style={{ transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
          <span className="text-base font-extrabold text-primary font-heading">LifeLink</span>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-6 space-y-6">
          <div className="flex flex-col space-y-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/find-donors', label: 'Find Donors & Hospitals' },
              { to: '/about', label: 'About LifeLink' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-secondary hover:text-rose-600 dark:hover:text-white flex items-center justify-between py-3 px-3 rounded-xl hover:bg-surface transition-colors"
              >
                <span>{label}</span>
                <ChevronRight className="w-4 h-4 text-muted" />
              </Link>
            ))}

            <Link
              to="/emergency-request"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-extrabold text-rose-600 dark:text-rose-400 flex items-center justify-between py-3 px-3 rounded-xl border border-rose-500/30 mt-2 bg-rose-500/10"
            >
              <span className="flex items-center">
                <Activity className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400 animate-pulse" />
                Emergency Blood Request
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {user && (
            <div className="pt-6 space-y-1 border-t border-theme">
              <span className="text-[10px] font-extrabold tracking-wider text-muted uppercase px-3">Your Portal</span>
              {isIndividual && (
                <Link
                  to="/donor/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-bold text-secondary hover:text-primary py-2.5 px-3 rounded-xl hover:bg-surface transition-colors"
                >
                  Donor Portal
                </Link>
              )}
              {isHospital && (
                <Link
                  to="/hospital/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-bold text-secondary hover:text-primary py-2.5 px-3 rounded-xl hover:bg-surface transition-colors"
                >
                  Hospital Hub
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-bold text-secondary hover:text-primary py-2.5 px-3 rounded-xl hover:bg-surface transition-colors"
                >
                  Admin Control Panel
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          className="p-6 border-t border-theme bg-surface"
        >
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black flex items-center justify-center shadow-glow-brand">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">{user.name}</div>
                  <Badge accountType={currentType} />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-muted hover:text-red-600 dark:hover:text-red-400 rounded-xl border border-theme hover:border-red-500/30 transition-colors cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-2.5">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary w-full text-center text-xs py-3 justify-center"
              >
                Register Account
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-secondary w-full text-center text-xs py-3 justify-center"
              >
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
