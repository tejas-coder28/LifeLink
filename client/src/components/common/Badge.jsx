import React from 'react';

/**
 * Badge — renders role, status, blood group, or plain text pills.
 * Props are unchanged from the original; only visual styling updated.
 */
const Badge = ({ role, accountType, status, bloodGroup, text, size = 'normal' }) => {
  const type = accountType || role;

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
    const statusClass = {
      open:      'badge-open',
      matching:  'badge-matching',
      fulfilled: 'badge-fulfilled',
      completed: 'badge-completed',
      pledged:   'badge-pledged',
      cancelled: 'badge-cancelled',
      expired:   'badge-expired',
      suspended: 'badge-suspended',
      critical:  'badge-critical',
      high:      'badge-high',
      medium:    'badge-medium',
      low:       'badge-low',
      normal:    'badge-medium',
      verified:  'badge-verified',
      pending:   'badge-pending',
    }[status] || 'badge-low';

    return (
      <span className={`badge-base ${statusClass}`}>
        {text || status.charAt(0).toUpperCase() + status.slice(1)}
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
