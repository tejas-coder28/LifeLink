import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-2 focus:ring-offset-canvas cursor-pointer bg-surface/80 hover:bg-surface border border-hairline text-primary shadow-sm ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Sun Icon */}
        <Sun
          className={`w-5 h-5 text-warning transition-all duration-300 transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 absolute'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        {/* Moon Icon */}
        <Moon
          className={`w-4 h-4 text-ice transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-xs font-bold text-secondary">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
