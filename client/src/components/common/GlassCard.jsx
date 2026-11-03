import React, { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Reusable GlassCard component with Apple Spatial UI aesthetic.
 * Performance optimized:
 * - Direct RAF hardware-accelerated cursor sheen tracking (ZERO React re-renders)
 * - 3D spatial tilt using direct CSS transforms
 * - 5 Spatial depth levels: elevation 1 (canvas/base), 2 (raised), 3 (floating), 4 (overlay)
 * - Translucent glass fill with 1px specular gradient border
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
  elevation = 2,
  tilt = false,
  specular = true,
  padding = 'p-5 sm:p-6',
  ...rest
}) => {
  const cardRef = useRef(null);
  const specularRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const rafId = useRef(null);

  const elevationClasses = {
    1: 'spatial-elevation-1',
    2: 'spatial-elevation-2',
    3: 'spatial-elevation-3',
    4: 'spatial-elevation-4',
  }[elevation] || 'spatial-elevation-2';

  const handleMouseMove = (e) => {
    if (!cardRef.current || shouldReduceMotion) return;
    if (rafId.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (specularRef.current) {
        specularRef.current.style.background = `radial-gradient(360px circle at ${x}px ${y}px, var(--specular-sheen), transparent 75%)`;
      }

      if (tilt) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;
        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    });
  };

  const handleMouseEnter = () => {
    if (specularRef.current && !shouldReduceMotion) {
      specularRef.current.style.opacity = '1';
    }
  };

  const handleMouseLeave = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (specularRef.current) {
      specularRef.current.style.opacity = '0';
    }
    if (tilt && cardRef.current && !shouldReduceMotion) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`glass-card relative overflow-hidden ${elevationClasses} ${
        hover ? 'glass-card-hover' : ''
      } ${
        glow ? 'shadow-glow-brand' : ''
      } ${padding} ${className}`}
      {...rest}
    >
      {/* Specular pointer follow effect — 100% direct GPU DOM, ZERO React re-renders */}
      {specular && !shouldReduceMotion && (
        <div
          ref={specularRef}
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200 z-0 opacity-0"
          style={{ willChange: 'opacity' }}
          aria-hidden="true"
        />
      )}

      {/* Card Header */}
      {(title || Icon || action) && (
        <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-hairline">
          <div className="flex items-center space-x-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-info/10 border border-info/20 text-info shadow-sm">
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
          {action && <div className="relative z-10 shrink-0 ml-3">{action}</div>}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GlassCard;
