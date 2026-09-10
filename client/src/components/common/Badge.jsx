import React from 'react';

const Badge = ({ role, status, bloodGroup, text }) => {
  if (role) {
    const roleStyles = {
      donor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      recipient: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      hospital: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${roleStyles[role] || 'bg-white text-black'}`}>
        {role}
      </span>
    );
  }

  if (status) {
    const statusStyles = {
      open: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
      matching: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      fulfilled: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      pledged: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      expired: 'bg-slate-700/50 text-black border-slate-600/30',
      critical: 'bg-rose-600/20 text-rose-300 border-rose-500/50 font-extrabold animate-bounce',
      high: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      medium: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      low: 'bg-slate-500/20 text-black border-slate-500/40',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[status] || 'bg-white text-black'}`}>
        {text || status.toUpperCase()}
      </span>
    );
  }

  if (bloodGroup) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black bg-rose-600/20 text-rose-400 border border-rose-500/40 shadow-sm">
        🩸 {bloodGroup}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-black">
      {text}
    </span>
  );
};

export default Badge;
