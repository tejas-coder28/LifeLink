import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Reusable GlassCheckbox component.
 * Features:
 * - Liquid glass border and subtle sheen
 * - Animated checkmark on selection
 * - Accessible native input hidden behind custom styling
 */
const GlassCheckbox = ({
  checked,
  onChange,
  label,
  id,
  disabled = false,
  className = '',
}) => {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${
            checked
              ? 'bg-gradient-to-br from-brand-500 to-brand-600 border-brand-400 text-white shadow-glow-brand'
              : 'bg-surface/60 border-glass group-hover:border-brand-500/40 text-transparent'
          }`}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 25 }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </motion.div>
          )}
        </div>
      </div>
      {label && (
        <span className="text-xs sm:text-sm font-semibold text-primary group-hover:text-primary transition-colors">
          {label}
        </span>
      )}
    </label>
  );
};

export default GlassCheckbox;
