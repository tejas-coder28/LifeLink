import React from 'react';

const Loader = ({ text = 'Loading...' }) => {
  return (
    <div className="py-16 flex flex-col items-center justify-center space-y-4">
      {/* Spinning liquid ring with brand glow */}
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '2px solid rgba(242, 156, 121, 0.18)',
            borderTop: '2px solid var(--info)',
            boxShadow: '0 0 18px rgba(242, 156, 121, 0.28)',
          }}
        />
        <div
          className="absolute inset-2 rounded-full"
          style={{ background: 'rgba(242, 156, 121, 0.08)' }}
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
