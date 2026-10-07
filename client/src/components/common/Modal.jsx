import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable accessible modal dialog that teleports directly into document.body.
 *
 * Prevents stacking context clipping caused by parent transform / filter / backdrop-filter.
 * Full viewport overlay (z-[100]) draws over sticky/fixed navbars.
 * Locks document body scroll while open and restores previous scroll state upon closing.
 * Works seamlessly at 375px (mobile), 768px (tablet), and 1280px+ (desktop) in light & dark themes.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-dialog-title' : undefined}
    >
      {/* Full-screen backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Panel */}
      <div
        className={`relative w-full ${maxWidth} glass-modal rounded-2xl sm:rounded-3xl border border-theme shadow-2xl z-10 flex flex-col max-h-[85vh] animate-scale-in overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-theme bg-surface shrink-0">
          <h3
            id="modal-dialog-title"
            className="text-base sm:text-lg font-black text-primary font-heading truncate pr-2"
          >
            {title}
          </h3>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-muted hover:text-primary hover:bg-surface/80 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
