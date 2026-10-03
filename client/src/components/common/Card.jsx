import React from 'react';

const Card = ({ children, title, subtitle, icon: Icon, action, className = '', hover = true }) => {
  const hasPadding = /\bp(?:[xytb]|\b)-\d+/.test(className);
  const paddingClass = hasPadding ? '' : 'p-5 sm:p-6';

  return (
    <div
      className={`glass-card ${
        hover ? 'glass-card-hover' : ''
      } ${paddingClass} ${className}`}
    >
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-theme">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400"
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-bold text-primary leading-tight font-heading">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs mt-0.5 text-secondary">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
