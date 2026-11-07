/**
 * Shared Helper for Status Formats & Labels across all dashboards
 * LifeLink Smart Blood Platform
 */

export const STATUS_LABELS = {
  pending_hospital_review: 'Pending hospital review',
  open: 'Open',
  matching: 'Matching donors',
  partially_fulfilled: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
  completed: 'Completed',
  pledged: 'Pledged',
  released: 'Released - request cancelled',
  rejected: 'Rejected',
  hospital_no_response: 'No hospital response',
  cancelled: 'Cancelled',
  closed: 'Closed',
  expired: 'Expired',
  legacy: 'Legacy',
  pending: 'Pending review',
  verified: 'Verified',
  active: 'Active',
  suspended: 'Suspended',
};

export const CANCEL_REASONS = {
  created_by_mistake: 'created by mistake',
  wrong_details: 'wrong details',
  patient_recovered: 'patient no longer needs blood',
  need_met_elsewhere: 'need met elsewhere',
  other: 'other reason',
};

export const CANCEL_LABELS = {
  created_by_mistake: 'Created by mistake',
  wrong_details: 'Wrong details',
  patient_recovered: 'Patient no longer needs blood',
  need_met_elsewhere: 'Need met elsewhere',
  other: 'Other',
};

/**
 * Format raw status strings (e.g., 'partially_fulfilled') into human-friendly labels.
 * @param {string} status
 * @returns {string}
 */
export const formatStatusLabel = (status) => {
  if (!status) return '';
  const normalized = status.toString().toLowerCase().trim();
  if (STATUS_LABELS[normalized]) {
    return STATUS_LABELS[normalized];
  }
  return normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Get the design system badge CSS class for a status
 * @param {string} status
 * @returns {string}
 */
export const getStatusBadgeClass = (status) => {
  if (!status) return 'badge-low';
  const normalized = status.toString().toLowerCase().trim();
  const map = {
    open: 'badge-open',
    matching: 'badge-matching',
    fulfilled: 'badge-fulfilled',
    completed: 'badge-completed',
    partially_fulfilled: 'badge-medium',
    pending_hospital_review: 'badge-pending',
    pending: 'badge-pending',
    pledged: 'badge-pledged',
    released: 'badge-low',
    hospital_no_response: 'badge-cancelled',
    rejected: 'badge-critical',
    cancelled: 'badge-cancelled',
    closed: 'badge-cancelled',
    expired: 'badge-expired',
    suspended: 'badge-suspended',
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
    verified: 'badge-verified',
    active: 'badge-verified',
    online: 'badge-verified',
    offline: 'badge-cancelled',
    legacy: 'badge-low',
  };
  return map[normalized] || 'badge-low';
};

export { canSeekDonors } from './requestRules';
