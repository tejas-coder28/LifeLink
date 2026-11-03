import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable GlassSelect component.
 * Features:
 * - Liquid glass container with backdrop blur and border
 * - Consistent label with optional required mark
 * - Custom styled ChevronDown indicator
 * - Proper color-scheme and explicit option styling readable in both light and dark modes
 * - Error message display
 */
const GlassSelect = ({
  label,
  id,
  options = [],
  children,
  error,
  className = '',
  required = false,
  placeholder,
  value,
  onChange,
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
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`glass-select w-full appearance-none py-2.5 pl-3.5 pr-10 text-xs sm:text-sm font-medium cursor-pointer transition-all ${
            error
              ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30'
              : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          style={{
            colorScheme: 'light dark',
            ...rest.style,
          }}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className="bg-surface text-muted">
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return (
                  <option
                    key={optValue}
                    value={optValue}
                    className="bg-surface text-primary py-1"
                  >
                    {optLabel}
                  </option>
                );
              })
            : children}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
        </div>
      </div>
      {error && (
        <p className="text-[11px] font-semibold text-brand-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default GlassSelect;
