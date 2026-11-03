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
  color = 'info',
  height = 'h-2',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorGradients = {
    brand: 'bg-danger',
    danger: 'bg-danger',
    success: 'bg-success',
    teal: 'bg-success',
    emerald: 'bg-success',
    warning: 'bg-warning',
    amber: 'bg-warning',
    info: 'bg-info',
    sky: 'bg-info',
    silver: 'bg-muted/40',
  }[color] || 'bg-info';

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-bold">
          {label && <span className="text-secondary">{label}</span>}
          {showValue && <span className="text-primary tabular-nums">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-surface/60 border border-hairline overflow-hidden`}>
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
