import React from 'react';

/**
 * Reusable GlassTextarea component.
 * Features:
 * - Liquid glass backdrop blur, subtle inner glow
 * - Label with optional required mark
 * - Theme-aware text and placeholder colors
 * - Error state message
 */
const GlassTextarea = ({
  label,
  id,
  rows = 3,
  error,
  className = '',
  required = false,
  disabled = false,
  ...rest
}) => {
  return (
    <div className="space-y-1.5 w-full text-left">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-secondary uppercase tracking-wider"
        >
          {label} {required && <span className="text-brand-500">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          required={required}
          disabled={disabled}
          className={`glass-input w-full py-2.5 px-3.5 text-xs sm:text-sm font-medium transition-all resize-y ${
            error
              ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30'
              : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          style={{
            colorScheme: 'light dark',
            ...rest.style,
          }}
          {...rest}
        />
      </div>
      {error && (
        <p className="text-[11px] font-semibold text-brand-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default GlassTextarea;
