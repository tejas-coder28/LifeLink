import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Reusable GlassDrawer component.
 * Features:
 * - Teleports to document.body via createPortal
 * - Side drawer ('right' or 'left' position)
 * - Traps Esc key and locks body scroll
 * - Framer Motion slide-in with spring physics and backdrop-blur
 */
const GlassDrawer = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  width = 'max-w-md',
}) => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const isRight = position === 'right';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { x: isRight ? '100%' : '-100%', opacity: 0.8 }
            }
            animate={{ x: 0, opacity: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { x: isRight ? '100%' : '-100%', opacity: 0.8 }
            }
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={`relative z-10 w-full ${width} ${
              isRight ? 'ml-auto' : 'mr-auto'
            } h-full glass-modal border-${isRight ? 'l' : 'r'} border-glass shadow-spatial-overlay flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface/90 shrink-0">
              <h3 className="text-base font-extrabold text-primary font-heading truncate">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GlassDrawer;
