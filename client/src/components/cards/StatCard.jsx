import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

const getIconTileClasses = (color, isCritical) => {
  if (isCritical) {
    return 'bg-urgency-critical-subtle text-urgency-critical border-urgency-critical-border';
  }
  switch (color) {
    case 'teal':
    case 'donor':
      return 'bg-accent-donor-subtle text-accent-donor border-accent-donor-border';
    case 'info':
    case 'sky':
    case 'blue':
    case 'hospital':
      return 'bg-accent-hospital-subtle text-accent-hospital border-accent-hospital-border';
    case 'success':
    case 'emerald':
    case 'green':
      return 'bg-success/10 text-success border-success/25';
    case 'violet':
    case 'purple':
    case 'admin':
      return 'bg-accent-admin-subtle text-accent-admin border-accent-admin-border';
    case 'warning':
    case 'amber':
    case 'yellow':
      return 'bg-warning/10 text-warning border-warning/25';
    case 'danger':
    case 'critical':
    case 'rose':
    case 'red':
      return 'bg-urgency-critical-subtle text-urgency-critical border-urgency-critical-border';
    case 'slate':
    case 'muted':
      return 'bg-raised text-muted border-hairline';
    default:
      return 'bg-info/10 text-info border-info/25';
  }
};

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

  const cardInner = (
    <>
      <div className="space-y-1 flex flex-col justify-between h-full flex-1 min-w-0 pr-2 text-left">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider block text-muted truncate">
            {title}
          </span>
          <span className="text-2xl sm:text-3xl font-black block tracking-tight font-heading mt-1.5 text-primary tabular-nums">
            <AnimatedCounter value={value} />
          </span>
        </div>
        {description && (
          <p className="text-[11px] font-medium mt-1.5 text-secondary leading-snug">
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
            className="text-[10px] font-bold text-muted group-hover:text-info group-focus-visible:text-info transition-colors flex items-center gap-0.5"
            aria-hidden="true"
          >
            <span className="hidden sm:inline text-[9px] uppercase tracking-wider">View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
        {Icon && (
          <div
            className={`p-3 rounded-2xl shrink-0 transition-colors border ${getIconTileClasses(color, isCritical)}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </>
  );

  const shellClasses = `glass-card flex flex-col justify-between h-full w-full rounded-2xl border border-hairline overflow-hidden transition-all duration-150 ${
    isClickable
      ? 'group hover:border-info/40 hover:shadow-card-hover'
      : ''
  } ${className}`;

  const interactiveClasses =
    'flex items-start justify-between flex-1 w-full p-5 sm:p-6 min-h-[116px] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-inset';

  const footerNode = subLink ? (
    <div className="px-5 sm:px-6 py-2.5 border-t border-hairline bg-raised/45 flex items-center justify-between">
      {subLink}
    </div>
  ) : null;

  if (to) {
    return (
      <div className={shellClasses}>
        <Link
          to={to}
          aria-label={computedAriaLabel}
          className={interactiveClasses}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Spacebar') {
              e.preventDefault();
              e.currentTarget.click();
            }
          }}
        >
          {cardInner}
        </Link>
        {footerNode}
      </div>
    );
  }

  if (onClick) {
    return (
      <div className={shellClasses}>
        <button
          type="button"
          onClick={onClick}
          aria-label={computedAriaLabel}
          className={interactiveClasses}
        >
          {cardInner}
        </button>
        {footerNode}
      </div>
    );
  }

  return (
    <div className={shellClasses}>
      <div className="flex items-start justify-between flex-1 w-full p-5 sm:p-6 min-h-[116px]">
        {cardInner}
      </div>
      {footerNode}
    </div>
  );
};

export default StatCard;
