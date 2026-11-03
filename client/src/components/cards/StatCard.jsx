import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import AnimatedCounter from '../common/AnimatedCounter';

const StatCard = ({ title, value, icon: Icon, description, trend, critical = false, color }) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  // Crimson is strictly reserved for critical / emergency metrics (e.g. shortages)
  const isCritical = critical || (typeof title === 'string' && /shortage|critical|emergency/i.test(title));

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -3, transition: { duration: 0.2 } }}
      className={`glass-card p-5 sm:p-6 flex items-start justify-between min-h-[110px] ${
        isCritical ? 'border-t-2 border-t-danger shadow-glow-danger/20' : ''
      }`}
    >
      <div className="space-y-1 flex flex-col justify-between h-full">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider block text-muted">
            {title}
          </span>
          <span
            className={`text-2xl sm:text-3xl font-black block tracking-tight font-heading mt-1 ${
              isCritical ? 'text-danger' : 'text-primary'
            }`}
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
          className={`p-3 rounded-2xl shrink-0 transition-colors shadow-sm border ${
            isCritical
              ? 'bg-danger/10 text-danger border-danger/30'
              : 'bg-info/10 text-info border-info/20'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
