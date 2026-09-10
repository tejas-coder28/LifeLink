import React from 'react';
import { HeartHandshake, ShieldCheck, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          
          {/* LIFELINK COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">LifeLink</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Smart blood donation & emergency donor matching engine powered by AI narrative intelligence and location-based proximity scoring.
            </p>
          </div>

          {/* PLATFORM COLUMN */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/find-donors" className="text-slate-400 hover:text-white transition-colors">Find Donors</Link></li>
              <li><Link to="/emergency-request" className="text-slate-400 hover:text-rose-400 transition-colors">Emergency Request</Link></li>
              <li><a href="/#how-it-works" className="text-slate-400 hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* ROLES & ACCESS COLUMN */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Roles & Access</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/login" className="text-slate-400 hover:text-white transition-colors">Donor Portal</Link></li>
              <li><Link to="/login" className="text-slate-400 hover:text-white transition-colors">Recipient Hub</Link></li>
              <li><Link to="/login" className="text-slate-400 hover:text-white transition-colors">Hospital Verification</Link></li>
              <li><Link to="/login" className="text-slate-400 hover:text-white transition-colors">Admin Dashboard</Link></li>
            </ul>
          </div>

          {/* SUPPORT COLUMN */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/emergency-request" className="text-rose-400 font-semibold hover:text-rose-300 transition-colors">Emergency Help</Link></li>
              <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="#" className="text-slate-400 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
          <p>© {new Date().getFullYear()} LifeLink Inc. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-1.5 text-slate-400" /> Secure Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
