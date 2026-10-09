import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * PageTransition component with Apple Spatial UI depth.
 * Features:
 * - Subtle vertical slide & scale depth
 * - Clean opacity fade
 * - Transforms and opacity only for smooth 60fps performance
 * - Respects prefers-reduced-motion
 */
const PageTransition = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    initial: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 14,
      scale: shouldReduceMotion ? 1 : 0.99,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -10,
      scale: shouldReduceMotion ? 1 : 0.99,
      transition: {
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
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
