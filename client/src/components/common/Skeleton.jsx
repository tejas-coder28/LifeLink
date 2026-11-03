import React from 'react';

/**
 * Reusable Skeleton loader component for fluid shimmer loading states.
 * Variants:
 * - 'text': Single line of text
 * - 'card': Full card skeleton with header and body lines
 * - 'stat': Metric stat card skeleton
 * - 'table': Table rows skeleton
 * - 'avatar': Circular avatar skeleton
 */
const Skeleton = ({
  variant = 'text',
  className = '',
  count = 1,
  width,
  height,
}) => {
  const baseClass = 'skeleton shrink-0';

  if (variant === 'card') {
    return (
      <div className={`glass-card p-6 space-y-4 ${className}`}>
        <div className="flex items-center justify-between pb-3 border-b border-theme">
          <div className="flex items-center space-x-3">
            <div className={`${baseClass} w-9 h-9 rounded-xl`} />
            <div className="space-y-1.5">
              <div className={`${baseClass} w-28 h-4 rounded`} />
              <div className={`${baseClass} w-16 h-3 rounded`} />
            </div>
          </div>
          <div className={`${baseClass} w-14 h-6 rounded-full`} />
        </div>
        <div className="space-y-2.5 pt-2">
          <div className={`${baseClass} w-full h-3 rounded`} />
          <div className={`${baseClass} w-5/6 h-3 rounded`} />
          <div className={`${baseClass} w-3/4 h-3 rounded`} />
        </div>
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className={`glass-card p-5 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className={`${baseClass} w-24 h-3.5 rounded`} />
          <div className={`${baseClass} w-8 h-8 rounded-lg`} />
        </div>
        <div className={`${baseClass} w-20 h-7 rounded`} />
        <div className={`${baseClass} w-32 h-3 rounded`} />
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div
        className={`${baseClass} rounded-full ${className}`}
        style={{ width: width || '2.5rem', height: height || '2.5rem' }}
      />
    );
  }

  if (count > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className={`${baseClass} h-4 rounded w-full`}
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} rounded ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
};

export default Skeleton;
