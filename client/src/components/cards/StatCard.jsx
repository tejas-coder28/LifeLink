import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  critical = false,
  color,
  onClick,
  to,
  ariaLabel,
  subLink,
  className = '',
}) => {
  const isCritical = critical || (typeof title === 'string' && /shortage|critical|emergency/i.test(title));
  const isClickable = Boolean(onClick || to);
  const computedAriaLabel = ariaLabel || (isClickable ? `Open ${title} (${value})` : undefined);

  const cardContent = (
    <>
      <div className="space-y-1 flex flex-col justify-between h-full flex-1 min-w-0 pr-2 text-left">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider block text-muted truncate">
            {title}
          </span>
          <span
            className={`text-2xl sm:text-3xl font-black block tracking-tight font-heading mt-1 ${
              isCritical ? 'text-danger' : 'text-primary'
            }`}
          >
            <AnimatedCounter value={value} />
          </span>
        </div>
        {description && (
          <p className="text-[11px] font-medium mt-1 text-secondary">
            {description}
          </p>
        )}
        {trend && (
          <p className="text-[10px] font-bold mt-0.5 text-muted">
            {trend}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between shrink-0 h-full gap-2">
        {isClickable && (
          <span
            className="text-[10px] font-bold text-muted/60 group-hover:text-info group-focus-visible:text-info transition-colors flex items-center gap-0.5"
            aria-hidden="true"
          >
            <span className="hidden sm:inline text-[9px] uppercase tracking-wider">View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
        {Icon && (
          <div
            className={`p-3 rounded-2xl shrink-0 transition-colors shadow-sm border ${
              isCritical
                ? 'bg-danger/10 text-danger border-danger/30'
                : 'bg-info/10 text-info border-info/20'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </>
  );

  const baseClasses = `glass-card p-5 sm:p-6 flex items-start justify-between min-h-[110px] w-full text-left rounded-2xl border transition-colors duration-150 ${
    isCritical ? 'border-t-2 border-t-danger shadow-glow-danger/20' : 'border-hairline'
  } ${
    isClickable
      ? 'group cursor-pointer hover:border-info/40 hover:bg-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      : ''
  } ${className}`;

  if (to) {
    return (
      <div className="flex flex-col w-full">
        <Link
          to={to}
          aria-label={computedAriaLabel}
          className={baseClasses}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Spacebar') {
              e.preventDefault();
              e.currentTarget.click();
            }
          }}
        >
          {cardContent}
        </Link>
        {subLink && <div className="mt-1 px-1">{subLink}</div>}
      </div>
    );
  }

  if (onClick) {
    return (
      <div className="flex flex-col w-full">
        <button
          type="button"
          onClick={onClick}
          aria-label={computedAriaLabel}
          className={baseClasses}
        >
          {cardContent}
        </button>
        {subLink && <div className="mt-1 px-1">{subLink}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className={baseClasses}>
        {cardContent}
      </div>
      {subLink && <div className="mt-1 px-1">{subLink}</div>}
    </div>
  );
};

export default StatCard;
