import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * AnimatedCounter component.
 * Smoothly animates numbers from 0 to their final value.
 * Respects prefers-reduced-motion by skipping directly to final value.
 */
const AnimatedCounter = ({ value, duration = 1.2 }) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? value : 0);

  useEffect(() => {
    // If not a number or user prefers reduced motion, render raw value
    const numericMatch = String(value).match(/^([^\d]*)([\d,]+(\.\d+)?)([^\d]*)$/);
    if (!numericMatch || shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const prefix = numericMatch[1] || '';
    const rawNumberStr = numericMatch[2].replace(/,/g, '');
    const targetNumber = parseFloat(rawNumberStr);
    const suffix = numericMatch[4] || '';
    const isFloat = rawNumberStr.includes('.');

    if (isNaN(targetNumber)) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const startTime = performance.now();
    const durationMs = duration * 1000;

    let frameId;
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = start + (targetNumber - start) * easedProgress;

      const formatted = isFloat ? current.toFixed(1) : Math.round(current).toLocaleString();
      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      } else {
        setDisplayValue(value);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration, shouldReduceMotion]);

  return <span className="tabular-nums">{displayValue}</span>;
};

export default AnimatedCounter;
