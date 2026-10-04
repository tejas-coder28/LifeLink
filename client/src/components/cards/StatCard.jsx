import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const StatCard = ({ title, value, icon: Icon, description, trend, color = 'rose' }) => {
  const { isDark } = useTheme();

  const accentClass = {
    rose:    'stat-accent-rose',
    emerald: 'stat-accent-teal',
    teal:    'stat-accent-teal',
    sky:     'stat-accent-sky',
    amber:   'stat-accent-amber',
    slate:   '',
    indigo:  'stat-accent-indigo',
  }[color] || 'stat-accent-rose';

  const lightValueColor = {
    rose:    '#e11d48',
    emerald: '#0d9488',
    teal:    '#0d9488',
    sky:     '#0284c7',
    amber:   '#d97706',
    slate:   'var(--text-primary)',
    indigo:  '#4f46e5',
  }[color] || '#e11d48';

  const darkValueColor = {
    rose:    '#fb7185',
    emerald: '#5eead4',
    teal:    '#5eead4',
    sky:     '#93c5fd',
    amber:   '#fcd34d',
    slate:   'var(--text-primary)',
    indigo:  '#a5b4fc',
  }[color] || '#fb7185';

  const lightIconBg = {
    rose:    'rgba(225, 29, 72, 0.10)',
    emerald: 'rgba(13, 148, 136, 0.10)',
    teal:    'rgba(13, 148, 136, 0.10)',
    sky:     'rgba(2, 132, 199, 0.10)',
    amber:   'rgba(217, 119, 6, 0.10)',
    slate:   'rgba(15, 23, 42, 0.05)',
    indigo:  'rgba(79, 70, 229, 0.10)',
  }[color] || 'rgba(225, 29, 72, 0.10)';

  const darkIconBg = {
    rose:    'rgba(220, 38, 38, 0.15)',
    emerald: 'rgba(34, 200, 160, 0.15)',
    teal:    'rgba(34, 200, 160, 0.15)',
    sky:     'rgba(59, 158, 255, 0.15)',
    amber:   'rgba(245, 158, 11, 0.15)',
    slate:   'rgba(255, 255, 255, 0.07)',
    indigo:  'rgba(129, 140, 248, 0.15)',
  }[color] || 'rgba(220, 38, 38, 0.15)';

  const lightIconColor = {
    rose:    '#e11d48',
    emerald: '#0d9488',
    teal:    '#0d9488',
    sky:     '#0284c7',
    amber:   '#d97706',
    slate:   'var(--text-secondary)',
    indigo:  '#4f46e5',
  }[color] || '#e11d48';

  const darkIconColor = {
    rose:    '#fb7185',
    emerald: '#5eead4',
    teal:    '#5eead4',
    sky:     '#93c5fd',
    amber:   '#fcd34d',
    slate:   'var(--text-secondary)',
    indigo:  '#a5b4fc',
  }[color] || '#fb7185';

  const valueColor = isDark ? darkValueColor : lightValueColor;
  const iconBg = isDark ? darkIconBg : lightIconBg;
  const iconColor = isDark ? darkIconColor : lightIconColor;

  return (
    <div
      className={`glass-card glass-card-hover p-5 sm:p-6 flex items-start justify-between min-h-[105px] ${accentClass}`}
    >
      <div className="space-y-1 flex flex-col justify-between h-full">
        <div>
          <span
            className="text-[11px] font-extrabold uppercase tracking-wider block"
            style={{ color: 'var(--text-muted)' }}
          >
            {title}
          </span>
          <span
            className="text-2xl sm:text-3xl font-black block tracking-tight font-heading mt-1"
            style={{ color: valueColor }}
          >
            {value}
          </span>
        </div>
        {description && (
          <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
        {trend && (
          <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {trend}
          </p>
        )}
      </div>
      {Icon && (
        <div
          className="p-3 rounded-2xl shrink-0 transition-colors"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
