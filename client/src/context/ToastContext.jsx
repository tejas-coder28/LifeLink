import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const showError = useCallback((msg, duration) => addToast(msg, 'error', duration), [addToast]);
  const showInfo = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]);
  const showWarning = useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, showToast: addToast, removeToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      {/* Toast Render Portal Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col space-y-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const config = {
            success: {
              bg: 'bg-white/90 dark:bg-[#141F36]/90 border-teal-500/30 text-primary shadow-glow-teal',
              icon: CheckCircle2,
              iconColor: 'text-teal-500',
            },
            error: {
              bg: 'bg-white/90 dark:bg-[#141F36]/90 border-brand-500/30 text-primary shadow-glow-brand',
              icon: AlertCircle,
              iconColor: 'text-brand-500',
            },
            warning: {
              bg: 'bg-white/90 dark:bg-[#141F36]/90 border-amber-500/30 text-primary shadow-glow-amber',
              icon: AlertTriangle,
              iconColor: 'text-amber-500',
            },
            info: {
              bg: 'bg-white/90 dark:bg-[#141F36]/90 border-violet-500/30 text-primary shadow-glow-violet',
              icon: Info,
              iconColor: 'text-violet-500',
            },
          }[toast.type] || {
            bg: 'bg-white/90 dark:bg-[#141F36]/90 border-theme text-primary shadow-card',
            icon: Info,
            iconColor: 'text-sky-500',
          };

          const IconComponent = config.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-slideUp ${config.bg}`}
            >
              <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-primary transition-colors p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
