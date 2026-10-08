import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component supporting:
 * - Variants: 'primary' (gradient #F43F5E to #BE123C), 'secondary' (glass outline), 'ghost', 'danger'
 * - Sizes: 'sm', 'md', 'lg'
 * - Loading state with animated spinner
 * - Interactive Framer Motion hover & tap micro-feedback
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...rest
}) => {
  const shouldReduceMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs sm:text-sm',
    lg: 'px-7 py-3.5 text-sm sm:text-base font-extrabold',
  }[size] || 'px-5 py-2.5 text-xs sm:text-sm';

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant] || 'btn-primary';

  const isInteractive = !disabled && !loading && !shouldReduceMotion;

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      whileHover={isInteractive ? { scale: 1.015 } : {}}
      whileTap={isInteractive ? { scale: 0.97 } : {}}
      transition={{ duration: 0.12 }}
      className={`${variantClasses} ${sizeClasses} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-1.5" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </motion.button>
  );
};

export default Button;
