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
  accent,
  className = '',
}) => {
  const getActiveIconClass = (isUrgent) => {
    if (isUrgent) return 'text-danger';
    if (accent === 'donor') return 'text-accent-donor';
    if (accent === 'hospital') return 'text-accent-hospital';
    if (accent === 'admin') return 'text-accent-admin';
    return 'text-info';
  };

  const getIndicatorBorder = () => {
    if (accent === 'donor') return 'border-accent-donor/50';
    if (accent === 'hospital') return 'border-accent-hospital/50';
    if (accent === 'admin') return 'border-accent-admin/50';
    return 'border-info/50';
  };

  return (
    <div
      className={`tab-list flex items-center gap-1 p-1.5 rounded-2xl border border-hairline-strong bg-raised/90 backdrop-blur-md overflow-x-auto shadow-inner ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const badgeValue = tab.badge !== undefined ? tab.badge : tab.count;
        const isUrgent = tab.isUrgent || (typeof tab.label === 'string' && /urgent|emergency/i.test(tab.label));

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer z-10 ${
              isActive
                ? 'text-primary'
                : 'text-secondary hover:text-primary hover:bg-surface/60'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className={`absolute inset-0 rounded-xl bg-surface dark:bg-overlay shadow-card border ${getIndicatorBorder()}`}
                style={{ zIndex: -1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 32,
                }}
              />
            )}
            {Icon && (
              <Icon
                className={`w-4 h-4 ${
                  isActive ? getActiveIconClass(isUrgent) : 'text-muted'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {badgeValue !== undefined && badgeValue !== null && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  tab.badgePulse ? 'animate-pulse' : ''
                } ${
                  isUrgent
                    ? isActive
                      ? 'bg-danger text-white'
                      : 'bg-danger/15 text-danger border border-danger/30'
                    : 'bg-info/15 text-info dark:text-ice border border-info/30'
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
