import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable GlassSwitch component.
 * Features:
 * - Fluid spatial toggle with Framer Motion spring physics
 * - Gradient track when active, glass track when inactive
 * - Accessible button with aria-checked
 */
const GlassSwitch = ({
  checked,
  onChange,
  label,
  description,
  id,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      {(label || description) && (
        <div className="flex-1 cursor-pointer select-none" onClick={() => !disabled && onChange(!checked)}>
          {label && (
            <span className="text-xs sm:text-sm font-bold text-primary block leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] sm:text-xs text-secondary block mt-0.5 leading-snug">
              {description}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
          checked
            ? 'bg-gradient-to-r from-brand-600 to-brand-500 border-brand-400/50 shadow-glow-brand'
            : 'bg-surface/80 border-glass'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-md backdrop-blur-md ${
            checked
              ? 'translate-x-5 bg-white'
              : 'translate-x-0 bg-secondary/80'
          }`}
        />
      </button>
    </div>
  );
};

export default GlassSwitch;
