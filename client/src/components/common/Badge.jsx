import React from 'react';
import { formatStatusLabel, getStatusBadgeClass } from '../../utils/statusHelper';

/**
 * Badge — renders role, status, blood group, or plain text pills.
 * Props are unchanged from the original; only visual styling updated.
 */
const Badge = ({ role, accountType, status, bloodGroup, urgency, text, size = 'normal', className = '' }) => {
  const type = accountType || role;

  /* ── Urgency badges ── */
  if (urgency) {
    const urgencyClass = {
      critical: 'badge-critical',
      high:     'badge-high',
      medium:   'badge-medium',
      low:      'badge-low',
    }[urgency.toLowerCase()] || 'badge-low';

    return (
      <span className={`badge-base ${urgencyClass} ${className}`}>
        {text || urgency.toUpperCase()}
      </span>
    );
  }

  /* ── Role badges ── */
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
      <span className={`badge-base ${roleClass}`}>
        {roleLabel}
      </span>
    );
  }

  /* ── Status badges ── */
  if (status) {
    const statusClass = getStatusBadgeClass(status);

    return (
      <span className={`badge-base ${statusClass}`}>
        {text || formatStatusLabel(status)}
      </span>
    );
  }

  /* ── Blood group pills — each group has a distinct colour ── */
  if (bloodGroup) {
    const bgKey = bloodGroup.replace('+', 'p').replace('-', 'm');
    return (
      <span className={`blood-pill blood-${bgKey}`}>
        🩸 {bloodGroup}
      </span>
    );
  }

  /* ── Plain text badge ── */
  return (
    <span
      className="badge-base"
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
