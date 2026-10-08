import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable SlidingTabs component.
 * Uses Framer Motion's layoutId for a silky smooth spring sliding indicator pill behind the active tab.
 */
const SlidingTabs = ({
  tabs,
  activeTab,
  onChange,
  layoutId = 'active-tab-indicator',
  className = '',
}) => {
  return (
    <div
      className={`tab-list flex items-center p-1 rounded-2xl border border-theme bg-surface/40 backdrop-blur-md overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const badgeValue = tab.badge !== undefined ? tab.badge : tab.count;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer z-10 ${
              isActive
                ? 'text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-surface shadow-card border border-glass"
                style={{ zIndex: -1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 32,
                }}
              />
            )}
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-muted'}`} />}
            <span>{tab.label}</span>
            {badgeValue !== undefined && badgeValue !== null && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  tab.badgePulse ? 'animate-pulse' : ''
                } ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                }`}
              >
                {badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SlidingTabs;
