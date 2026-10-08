import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * PageTransition component.
 * Wraps page contents with smooth entrance animation:
 * - Subtle vertical slide (12px -> 0px)
 * - Clean opacity fade (0 -> 1)
 * - Animates ONLY transform and opacity for optimal 60fps performance
 * - Automatically disables transform if user prefers reduced motion
 */
const PageTransition = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 12,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1], // easeOutCubic
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -8,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
