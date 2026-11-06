import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

// Global handler references for non-React callers (e.g. Axios interceptors)
let globalAddToast = null;
let globalRemoveToast = null;

export const emitToast = (message, type = 'info', duration = 4000, id = null) => {
  if (globalAddToast) {
    globalAddToast(message, type, duration, id);
  }
};

export const dismissToast = (id) => {
  if (globalRemoveToast) {
    globalRemoveToast(id);
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timerMapRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    if (timerMapRef.current.has(id)) {
      clearTimeout(timerMapRef.current.get(id));
      timerMapRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    timerMapRef.current.forEach((timerId) => clearTimeout(timerId));
    timerMapRef.current.clear();
    setToasts([]);
  }, []);

  /**
   * Add a toast with de-duplication:
   * - If a toast with the same type and message (or customId) is already visible,
   *   do not add another — refresh its auto-dismiss timer instead.
   * - Limit visible toasts to 3 maximum, dropping the oldest.
   */
  const addToast = useCallback((msgOrObj, type = 'info', duration = 4000, customId = null) => {
    let message = msgOrObj;
    let toastType = type;
    let toastDuration = duration;
    let toastId = customId;

    if (typeof msgOrObj === 'object' && msgOrObj !== null) {
      message = msgOrObj.message;
      toastType = msgOrObj.type || type;
      toastDuration = msgOrObj.duration !== undefined ? msgOrObj.duration : duration;
      toastId = msgOrObj.id || customId;
    }

    if (!message || typeof message !== 'string') return;

    setToasts((prev) => {
      // Check if an identical toast or one with the same stable ID is already displayed
      const existing = prev.find(
        (t) => (toastId && t.id === toastId) || (t.type === toastType && t.message === message)
      );

      if (existing) {
        // Refresh timer for existing toast
        if (timerMapRef.current.has(existing.id)) {
          clearTimeout(timerMapRef.current.get(existing.id));
        }
        if (toastDuration > 0) {
          const timerId = setTimeout(() => {
            removeToast(existing.id);
          }, toastDuration);
          timerMapRef.current.set(existing.id, timerId);
        }
        // Do not add a duplicate toast
        return prev;
      }

      const id = toastId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (toastDuration > 0) {
        const timerId = setTimeout(() => {
          removeToast(id);
        }, toastDuration);
        timerMapRef.current.set(id, timerId);
      }

      const newToast = { id, message, type: toastType };

      // Limit to 3 visible toasts, dropping the oldest if exceeded
      if (prev.length >= 3) {
        const oldest = prev[0];
        if (timerMapRef.current.has(oldest.id)) {
          clearTimeout(timerMapRef.current.get(oldest.id));
          timerMapRef.current.delete(oldest.id);
        }
        return [...prev.slice(1), newToast];
      }

      return [...prev, newToast];
    });
  }, [removeToast]);

  // Hook global listeners for non-React callers
  useEffect(() => {
    globalAddToast = addToast;
    globalRemoveToast = removeToast;
    return () => {
      globalAddToast = null;
      globalRemoveToast = null;
    };
  }, [addToast, removeToast]);

  // Keyboard dismiss (Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearAllToasts();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAllToasts]);

  // Convenience methods
  const showSuccess = useCallback((msg, duration, id) => addToast(msg, 'success', duration, id), [addToast]);
  const showError = useCallback((msg, duration, id) => addToast(msg, 'error', duration, id), [addToast]);
  const showInfo = useCallback((msg, duration, id) => addToast(msg, 'info', duration, id), [addToast]);
  const showWarning = useCallback((msg, duration, id) => addToast(msg, 'warning', duration, id), [addToast]);

  return (
    <ToastContext.Provider
      value={{
        addToast,
        showToast: addToast,
        removeToast,
        clearAllToasts,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
      {/* Toast Render Portal Container: positioned at top on mobile (never covers form fields), bottom-right on desktop */}
      <div
        className="fixed z-[100] flex flex-col space-y-2.5 pointer-events-none transition-all duration-300
          top-20 inset-x-4 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:inset-x-auto sm:max-w-sm w-auto sm:w-full"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const config = {
              success: {
                border: 'border-success/40 shadow-glow-success/20',
                icon: CheckCircle2,
                iconColor: 'text-success',
              },
              error: {
                border: 'border-danger/50 shadow-glow-danger/25',
                icon: AlertCircle,
                iconColor: 'text-danger',
              },
              warning: {
                border: 'border-warning/50 shadow-glow-warning/20',
                icon: AlertTriangle,
                iconColor: 'text-warning',
              },
              info: {
                border: 'border-info/40 shadow-glow-info/20',
                icon: Info,
                iconColor: 'text-info',
              },
            }[toast.type] || {
              border: 'border-hairline shadow-elevated',
              icon: Info,
              iconColor: 'text-info',
            };

            const IconComponent = config.icon;

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-2xl border backdrop-blur-2xl bg-surface/95 dark:bg-[#111A2E]/95 text-primary shadow-spatial-floating ${config.border}`}
                role="status"
                aria-live="polite"
              >
                <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
                <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-muted hover:text-primary transition-colors p-1 rounded-lg cursor-pointer"
                  aria-label="Dismiss notification"
                  title="Dismiss (or press Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
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
