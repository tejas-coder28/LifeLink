import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import AnimatedCounter from '../common/AnimatedCounter';

const StatCard = ({ title, value, icon: Icon, description, trend, color = 'rose' }) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();

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
    rose:    '#F43F5E',
    emerald: '#2DD4BF',
    teal:    '#2DD4BF',
    sky:     '#0284C7',
    amber:   '#D97706',
    slate:   'var(--text-primary)',
    indigo:  '#8B5CF6',
  }[color] || '#F43F5E';

  const darkValueColor = {
    rose:    '#FB7185',
    emerald: '#2DD4BF',
    teal:    '#2DD4BF',
    sky:     '#38BDF8',
    amber:   '#FBBF24',
    slate:   'var(--text-primary)',
    indigo:  '#A78BFA',
  }[color] || '#FB7185';

  const lightIconBg = {
    rose:    'rgba(244, 63, 94, 0.10)',
    emerald: 'rgba(45, 212, 191, 0.12)',
    teal:    'rgba(45, 212, 191, 0.12)',
    sky:     'rgba(56, 189, 248, 0.10)',
    amber:   'rgba(245, 158, 11, 0.10)',
    slate:   'rgba(15, 23, 42, 0.05)',
    indigo:  'rgba(139, 92, 246, 0.10)',
  }[color] || 'rgba(244, 63, 94, 0.10)';

  const darkIconBg = {
    rose:    'rgba(244, 63, 94, 0.18)',
    emerald: 'rgba(45, 212, 191, 0.18)',
    teal:    'rgba(45, 212, 191, 0.18)',
    sky:     'rgba(56, 189, 248, 0.18)',
    amber:   'rgba(245, 158, 11, 0.18)',
    slate:   'rgba(255, 255, 255, 0.07)',
    indigo:  'rgba(139, 92, 246, 0.18)',
  }[color] || 'rgba(244, 63, 94, 0.18)';

  const lightIconColor = {
    rose:    '#F43F5E',
    emerald: '#0D9488',
    teal:    '#0D9488',
    sky:     '#0284C7',
    amber:   '#D97706',
    slate:   'var(--text-secondary)',
    indigo:  '#7C3AED',
  }[color] || '#F43F5E';

  const darkIconColor = {
    rose:    '#FDA4AF',
    emerald: '#2DD4BF',
    teal:    '#2DD4BF',
    sky:     '#7DD3FC',
    amber:   '#FCD34D',
    slate:   'var(--text-secondary)',
    indigo:  '#C4B5FD',
  }[color] || '#FDA4AF';

  const valueColor = isDark ? darkValueColor : lightValueColor;
  const iconBg = isDark ? darkIconBg : lightIconBg;
  const iconColor = isDark ? darkIconColor : lightIconColor;

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -3, transition: { duration: 0.2 } }}
      className={`glass-card p-5 sm:p-6 flex items-start justify-between min-h-[110px] ${accentClass}`}
    >
      <div className="space-y-1 flex flex-col justify-between h-full">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider block text-muted">
            {title}
          </span>
          <span
            className="text-2xl sm:text-3xl font-black block tracking-tight font-heading mt-1"
            style={{ color: valueColor }}
          >
            <AnimatedCounter value={value} />
          </span>
        </div>
        {description && (
          <p className="text-[11px] font-medium mt-1 text-secondary">
            {description}
          </p>
        )}
        {trend && (
          <p className="text-[10px] font-bold mt-0.5 text-muted">
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
    </motion.div>
  );
};

export default StatCard;
