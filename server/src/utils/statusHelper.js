/**
 * server/src/utils/statusHelper.js
 *
 * Single source of truth for Blood Request and Donation statuses,
 * labels, classifications, and cancellation reason mappings.
 */

const { canSeekDonors } = require('./requestRules');

const ACTIVE_REQUEST_STATUSES = ['open', 'matching', 'partially_fulfilled'];
const INCOMING_REQUEST_STATUSES = ['pending_hospital_review'];
const CLOSED_REQUEST_STATUSES = [
  'fulfilled',
  'completed',
  'cancelled',
  'closed',
  'rejected',
  'hospital_no_response',
  'expired',
  'legacy',
];

const CANCEL_REASONS = {
  created_by_mistake: 'created by mistake',
  wrong_details: 'wrong details',
  patient_recovered: 'patient no longer needs blood',
  need_met_elsewhere: 'need met elsewhere',
  other: 'other reason',
};

const CANCEL_LABELS = {
  created_by_mistake: 'Created by mistake',
  wrong_details: 'Wrong details',
  patient_recovered: 'Patient no longer needs blood',
  need_met_elsewhere: 'Need met elsewhere',
  other: 'Other',
};

const STATUS_LABELS = {
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
};

function isActiveRequest(request) {
  if (!request) return false;
  const status = (request.status || '').toLowerCase().trim();
  return ACTIVE_REQUEST_STATUSES.includes(status);
}

function isIncomingRequest(request) {
  if (!request) return false;
  const status = (request.status || '').toLowerCase().trim();
  return INCOMING_REQUEST_STATUSES.includes(status);
}

function isClosedRequest(request) {
  if (!request) return false;
  const status = (request.status || '').toLowerCase().trim();
  return CLOSED_REQUEST_STATUSES.includes(status);
}

function formatStatusLabel(status) {
  if (!status) return '';
  const normalized = status.toString().toLowerCase().trim();
  if (STATUS_LABELS[normalized]) {
    return STATUS_LABELS[normalized];
  }
  return normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

module.exports = {
  ACTIVE_REQUEST_STATUSES,
  INCOMING_REQUEST_STATUSES,
  CLOSED_REQUEST_STATUSES,
  CANCEL_REASONS,
  CANCEL_LABELS,
  STATUS_LABELS,
  isActiveRequest,
  isIncomingRequest,
  isClosedRequest,
  canSeekDonors,
  formatStatusLabel,
};

