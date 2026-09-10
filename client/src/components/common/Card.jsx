import React from 'react';

const Card = ({ children, className = '', hover = true, title = '', icon: Icon = null, action = null }) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-6 border border-slate-200/80 shadow-xl ${
        hover ? 'glass-panel-hover' : ''
      } ${className}`}
    >
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/60">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Icon className="w-5 h-5" />
              </div>
            )}
            {title && <h3 className="text-lg font-bold text-black tracking-tight">{title}</h3>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
