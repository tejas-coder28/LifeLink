import React from 'react';

/**
 * Reusable GlassInput component.
 * Features:
 * - Label with optional required asterisk
 * - Leading icon support
 * - Clean glass styling with brand focus ring
 * - Error state message
 */
const GlassInput = ({
  label,
  id,
  type = 'text',
  icon: Icon,
  error,
  className = '',
  required = false,
  ...rest
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-secondary uppercase tracking-wider"
        >
          {label} {required && <span className="text-brand-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          type={type}
          required={required}
          className={`glass-input w-full py-2.5 px-3.5 text-xs sm:text-sm font-medium ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30'
              : ''
          } ${className}`}
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

export default GlassInput;
