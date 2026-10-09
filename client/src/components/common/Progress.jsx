import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Reusable Glass Progress bar component.
 */
const Progress = ({
  value = 0,
  max = 100,
  label,
  showValue = false,
  color = 'brand',
  height = 'h-2',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorGradients = {
    brand: 'bg-gradient-to-r from-brand-600 to-brand-400',
    teal: 'bg-gradient-to-r from-teal-600 to-teal-400',
    amber: 'bg-gradient-to-r from-amber-600 to-amber-400',
    sky: 'bg-gradient-to-r from-sky-600 to-sky-400',
  }[color] || 'bg-gradient-to-r from-brand-600 to-brand-400';

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-bold">
          {label && <span className="text-secondary">{label}</span>}
          {showValue && <span className="text-primary tabular-nums">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-surface/60 border border-glass overflow-hidden`}>
        <motion.div
          initial={shouldReduceMotion ? { width: `${percentage}%` } : { width: '0%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${colorGradients} shadow-sm`}
        />
      </div>
    </div>
  );
};

export default Progress;
