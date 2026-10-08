import React from 'react';

/**
 * Reusable GlassCard component.
 * Features:
 * - Translucent background with backdrop-blur-xl and 1px glass border
 * - Top edge inner highlight for subtle depth
 * - Optional hover lift with responsive shadow glow
 * - Consistent header with icon, title, subtitle, and action slot
 */
const GlassCard = ({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className = '',
  hover = true,
  glow = false,
  padding = 'p-5 sm:p-6',
  ...rest
}) => {
  return (
    <div
      className={`glass-card ${
        hover ? 'glass-card-hover' : ''
      } ${
        glow ? 'shadow-glow-brand' : ''
      } ${padding} ${className}`}
      {...rest}
    >
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-theme">
          <div className="flex items-center space-x-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/20 text-brand-500">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-bold text-primary leading-tight font-heading truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs mt-0.5 text-secondary truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0 ml-3">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default GlassCard;
