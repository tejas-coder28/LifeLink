import React from 'react';

const Loader = ({ text = 'Loading...' }) => {
  return (
    <div className="py-16 flex flex-col items-center justify-center space-y-4">
      {/* Spinning liquid ring with brand glow */}
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '2px solid rgba(244,63,94,0.15)',
            borderTop: '2px solid var(--brand-500)',
            boxShadow: '0 0 20px rgba(244,63,94,0.40)',
          }}
        />
        <div
          className="absolute inset-2 rounded-full"
          style={{ background: 'rgba(244,63,94,0.08)' }}
        />
      </div>
      {text && (
        <p
          className="text-xs font-bold tracking-wider uppercase animate-pulse"
          style={{ color: 'var(--text-secondary)' }}
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;
