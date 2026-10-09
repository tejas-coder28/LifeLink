import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/find-donors', label: 'Find Donors & Hospitals' },
    { to: '/about', label: 'About' },
  ];

  return (
    <>
      {/* Floating Pill Navbar Container */}
      <header
        className={`fixed inset-x-0 top-0 z-50 pointer-events-none transition-all duration-300 flex justify-center ${
          scrolled ? 'pt-2 sm:pt-3' : 'pt-3 sm:pt-5'
        } px-3 sm:px-6`}
      >
        <nav
          className={`pointer-events-auto w-full transition-all duration-300 rounded-2xl sm:rounded-full border border-glass shadow-spatial-raised backdrop-blur-2xl liquid-lens ${
            scrolled
              ? 'max-w-6xl py-2 sm:py-2.5 px-4 sm:px-6 bg-surface/90 shadow-spatial-floating'
              : 'max-w-7xl py-2.5 sm:py-3.5 px-4 sm:px-7 bg-surface/80'
          }`}
        >
          <div className="flex items-center justify-between">
            {/* LEFT: Brand Logo */}
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform duration-300">
                <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-tight text-primary leading-none font-heading">
                  Life<span className="gradient-text-brand">Link</span>
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted font-bold mt-0.5">
                  Emergency Blood Network
                </span>
              </div>
            </Link>

            {/* CENTER: Navigation Links with Liquid Active Indicator */}
            <div className="hidden lg:flex items-center justify-center space-x-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      active ? 'text-primary' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute inset-0 rounded-full bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/25 shadow-sm"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                );
              })}

              {/* Portal Dashboards */}
              {user && (
                <>
                  {isIndividual && (
                    <Link
                      to="/donor/dashboard"
                      className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        isActive('/donor') || isActive('/individual')
                          ? 'text-primary'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      {(isActive('/donor') || isActive('/individual')) && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className="absolute inset-0 rounded-full bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/25 shadow-sm"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">Donor Portal</span>
                    </Link>
                  )}
                  {isHospital && (
                    <Link
                      to="/hospital/dashboard"
                      className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        isActive('/hospital')
                          ? 'text-primary'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      {isActive('/hospital') && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className="absolute inset-0 rounded-full bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/25 shadow-sm"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">Hospital Hub</span>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        isActive('/admin')
                          ? 'text-primary'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      {isActive('/admin') && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className="absolute inset-0 rounded-full bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/25 shadow-sm"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">Admin Control</span>
                    </Link>
                  )}
                </>
              )}

              {/* Emergency CTA in nav */}
              <Link
                to="/emergency-request"
                className="emergency-pulse ml-2 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all hover:scale-105"
              >
                <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
                <span>Emergency Request</span>
              </Link>
            </div>

            {/* RIGHT: User Profile & Actions */}
            <div className="hidden lg:flex items-center justify-end space-x-3 shrink-0">
              <ThemeToggle />

              {user ? (
                <div className="flex items-center space-x-3 px-3 py-1.5 rounded-full border border-theme bg-surface/60 backdrop-blur-md">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-xs flex items-center justify-center shadow-glow-brand">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-bold text-primary leading-tight">{user.name}</div>
                    <Badge accountType={currentType} />
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors ml-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="text-xs font-bold text-secondary hover:text-rose-600 dark:hover:text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-xs px-4 py-2"
                  >
                    Register
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
        </nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true">
            {/* Scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="fixed inset-y-0 right-0 w-full sm:w-80 z-10 flex flex-col glass-modal border-l border-glass shadow-spatial-overlay"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface/90">
                <span className="text-base font-extrabold text-primary font-heading">
                  Life<span className="gradient-text-brand">Link</span>
                </span>
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
                  {navLinks.map(({ to, label }) => (
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
                    <span className="text-[10px] font-extrabold tracking-wider text-muted uppercase px-3">
                      Your Portal
                    </span>
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
              <div className="p-6 border-t border-theme bg-surface/90">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
