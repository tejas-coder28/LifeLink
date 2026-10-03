import React from 'react';

const Loader = ({ text = 'Loading...' }) => {
  return (
    <div className="py-16 flex flex-col items-center justify-center space-y-4">
      {/* Spinning ring with brand glow */}
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '2px solid rgba(220,38,38,0.15)',
            borderTop: '2px solid #DC2626',
            boxShadow: '0 0 16px rgba(220,38,38,0.35)',
          }}
        />
        <div
          className="absolute inset-2 rounded-full"
          style={{ background: 'rgba(220,38,38,0.08)' }}
        />
      </div>
      {text && (
        <p
          className="text-xs font-semibold animate-pulse"
          style={{ color: 'var(--text-secondary)' }}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
