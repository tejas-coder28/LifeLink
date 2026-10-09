import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Reusable GlassCard component with Apple Spatial UI aesthetic.
 * Features:
 * - 5 Spatial depth levels: elevation 1 (canvas/base), 2 (raised), 3 (floating), 4 (overlay)
 * - Cursor-reactive specular highlight that tracks pointer movement
 * - Subtle 3D tilt option (max 5 deg, disabled on reduced motion)
 * - Translucent glass fill with 1px specular gradient border
 * - Top edge specular highlight
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
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0 });

  const elevationClasses = {
    1: 'spatial-elevation-1',
    2: 'spatial-elevation-2',
    3: 'spatial-elevation-3',
    4: 'spatial-elevation-4',
  }[elevation] || 'spatial-elevation-2';

  const handleMouseMove = (e) => {
    if (!cardRef.current || shouldReduceMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (tilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      setTiltStyle({ rotateX, rotateY });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (tilt) {
      setTiltStyle({ rotateX: 0, rotateY: 0 });
    }
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={
        tilt && !shouldReduceMotion
          ? {
              rotateX: isHovered ? tiltStyle.rotateX : 0,
              rotateY: isHovered ? tiltStyle.rotateY : 0,
            }
          : {}
      }
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        transformStyle: tilt ? 'preserve-3d' : 'flat',
      }}
      className={`glass-card relative overflow-hidden ${elevationClasses} ${
        hover ? 'glass-card-hover' : ''
      } ${
        glow ? 'shadow-glow-brand' : ''
      } ${padding} ${className}`}
      {...rest}
    >
      {/* Specular pointer follow effect */}
      {specular && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-0"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, var(--specular-sheen), transparent 75%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Card Header */}
      {(title || Icon || action) && (
        <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-theme">
          <div className="flex items-center space-x-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-brand-500/10 dark:bg-brand-500/15 border border-brand-500/20 text-brand-500 shadow-sm">
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
    </motion.div>
  );
};

export default GlassCard;
