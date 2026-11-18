import React from 'react';
import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { formatStatusLabel, getStatusBadgeClass } from '../../utils/statusHelper';

/**
 * Badge — renders role, status, blood group, urgency, or plain text pills.
 * Consumes LifeLink semantic tokens with purposeful accent colors.
 * Never relies on color alone (always provides text and icon labels).
 */
const Badge = ({ role, accountType, status, bloodGroup, urgency, text, size = 'normal', className = '' }) => {
  const type = accountType || role;

  // Normalized urgency level check
  const urgencyLevel = urgency
    ? urgency.toLowerCase()
    : ['critical', 'high', 'medium', 'low'].includes(String(status || '').toLowerCase())
    ? String(status).toLowerCase()
    : null;

  /* ── Urgency badges (Critical, High, Medium, Low + icon) ── */
  if (urgencyLevel) {
    const urgencyClass = {
      critical: 'badge-critical',
      high:     'badge-high',
      medium:   'badge-medium',
      low:      'badge-low',
    }[urgencyLevel] || 'badge-low';

    const Icon = {
      critical: AlertCircle,
      high:     ArrowUp,
      medium:   Minus,
      low:      ArrowDown,
    }[urgencyLevel] || Minus;

    const label = text || (urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1));

    return (
      <span className={`badge-base ${urgencyClass} ${className} inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  /* ── Role badges (Role Accents: Donor, Hospital, Admin) ── */
  if (type) {
    const roleClass = {
      user:       'badge-donor',
      individual: 'badge-donor',
      donor:      'badge-donor',
      hospital:   'badge-hospital',
      admin:      'badge-admin',
    }[type] || 'badge-low';

    const roleLabel = {
      user:       'Donor',
      individual: 'Donor',
      donor:      'Donor',
      hospital:   'Hospital',
      admin:      'Admin',
    }[type] || type;

    return (
      <span className={`badge-base ${roleClass} ${className}`}>
        {roleLabel}
      </span>
    );
  }

  /* ── Status badges ── */
  if (status) {
    const statusClass = getStatusBadgeClass(status);

    return (
      <span className={`badge-base ${statusClass} ${className}`}>
        {text || formatStatusLabel(status)}
      </span>
    );
  }

  /* ── Blood group pills — hue by ABO family, Rh+ subtle fill, Rh- outlined ── */
  if (bloodGroup) {
    const raw = String(bloodGroup).trim().toUpperCase();
    const isNeg = raw.endsWith('-');
    const baseGroup = raw.replace(/[+-]/g, '');
    const family = {
      'O': 'o',
      'A': 'a',
      'B': 'b',
      'AB': 'ab',
    }[baseGroup] || 'o';

    const bgKey = raw.replace('+', 'p').replace('-', 'm');
    const chipClass = isNeg
      ? `blood-pill blood-${bgKey} blood-chip-${family}-neg`
      : `blood-pill blood-${bgKey} blood-chip-${family}-pos`;

    return (
      <span className={`${chipClass} ${className}`}>
        <span aria-hidden="true" className="text-[11px] leading-none">🩸</span>
        <span>{raw}</span>
      </span>
    );
  }

  /* ── Plain text badge ── */
  return (
    <span
      className={`badge-base ${className}`}
      style={{
        background: 'var(--surface-glass)',
        color: 'var(--text-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {text}
    </span>
  );
};

export default Badge;
