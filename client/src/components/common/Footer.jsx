import React from 'react';
import { HeartHandshake, ShieldCheck, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer
      className="pt-16 pb-8 mt-20 bg-surface border-t border-theme backdrop-blur-xl transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* BRAND COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-white"
                style={{
                  background: 'linear-gradient(135deg, #DC2626, #b91c1c)',
                  boxShadow: '0 0 20px rgba(220,38,38,0.35)',
                }}
              >
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-primary tracking-tight font-heading">
                Life<span className="gradient-text-brand">Link</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-secondary">
              Connecting blood donors, hospitals, and patients through real-time smart matching and intelligent donor coordination.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4
              className="font-extrabold mb-4 text-xs uppercase tracking-wider text-primary"
            >
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/" className="transition-colors text-secondary hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/find-donors" className="transition-colors text-secondary hover:text-primary">
                  Find Donors & Hospitals
                </Link>
              </li>
              <li>
                <Link to="/emergency-request" className="font-bold transition-colors text-rose-600 dark:text-rose-400 hover:underline">
                  Emergency Blood Request
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors text-secondary hover:text-primary">
                  About LifeLink
                </Link>
              </li>
            </ul>
          </div>

          {/* PORTALS */}
          <div>
            <h4 className="font-extrabold mb-4 text-xs uppercase tracking-wider text-primary">
              Role Portals
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/login" className="transition-colors text-secondary hover:text-primary">
                  Donor Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors text-secondary hover:text-primary">
                  Hospital Hub
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors text-secondary hover:text-primary">
                  Admin Control
                </Link>
              </li>
              <li>
                <Link to="/register" className="transition-colors text-secondary hover:text-primary">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* EMERGENCY SUPPORT */}
          <div>
            <h4 className="font-extrabold mb-4 text-xs uppercase tracking-wider text-primary">
              24/7 Emergency Support
            </h4>
            <p className="text-xs mb-4 text-secondary">
              Need blood urgently for a surgical or trauma case? Broadcast a request now and nearby donors will be alerted immediately.
            </p>
            <Link
              to="/emergency-request"
              className="btn-primary inline-flex text-xs px-4 py-2.5"
            >
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Request Blood Now</span>
            </Link>
          </div>
        </div>

        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs border-t border-theme text-muted"
        >
          <p>© {new Date().getFullYear()} LifeLink Emergency Blood Platform. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0 text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Secure &amp; Private
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
