/**
 * client/src/utils/eligibility.js
 *
 * Client-side mirror of server/src/utils/eligibility.js.
 * Shared donor cooldown eligibility and donation date validation helpers.
 */

import { DONATION_COOLDOWN_DAYS } from './bloodCompatibility';

export { DONATION_COOLDOWN_DAYS };
export const MAX_DONATION_BACKDATE_DAYS = 7;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Formats a Date into local YYYY-MM-DDTHH:mm string for <input type="datetime-local">.
 */
export function toLocalDateTimeInputValue(date = new Date()) {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parses a <input type="datetime-local"> string ("YYYY-MM-DDTHH:mm") as local time.
 */
export function parseLocalDateTimeInput(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value).trim());
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0), 0);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Computes next eligible date from donatedAt.
 */
export function computeNextEligibleDate(donatedAt, cooldownDays = DONATION_COOLDOWN_DAYS) {
  if (!donatedAt) return null;
  const d = parseLocalDateTimeInput(donatedAt) || new Date(donatedAt);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + cooldownDays * MS_PER_DAY);
}

/**
 * Shared eligibility calculation using lastDonationDate (= latest donatedAt).
 */
export function calculateEligibility(lastDonationDate, referenceDate = new Date(), cooldownDays = DONATION_COOLDOWN_DAYS) {
  if (!lastDonationDate) {
    return {
      isEligible: true,
      daysSince: null,
      daysLeft: 0,
      lastDonationDate: null,
      nextEligibleDate: null,
    };
  }

  const lastDate = new Date(lastDonationDate);
  if (isNaN(lastDate.getTime())) {
    return {
      isEligible: true,
      daysSince: null,
      daysLeft: 0,
      lastDonationDate: null,
      nextEligibleDate: null,
    };
  }

  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const diffMs = refDate.getTime() - lastDate.getTime();
  const daysSince = Math.floor(diffMs / MS_PER_DAY);
  const daysLeft = diffMs < 0 ? cooldownDays : Math.max(0, cooldownDays - daysSince);
  const nextEligibleDate = computeNextEligibleDate(lastDate, cooldownDays);

  return {
    isEligible: daysLeft === 0,
    daysSince,
    daysLeft,
    lastDonationDate: lastDate,
    nextEligibleDate,
  };
}

/**
 * Client-side validation mirroring server rules for Confirm Donation date input.
 * Adjusts same-minute datetime-local values (:00 seconds) when matching pledgedAt's minute.
 */
export function validateDonatedAt({
  donatedAt,
  pledgedAt,
  confirmationDate = new Date(),
  isAdmin = false,
  maxBackdateDays = MAX_DONATION_BACKDATE_DAYS,
}) {
  const confDate = confirmationDate instanceof Date ? confirmationDate : new Date(confirmationDate);
  const pledgedAtDate = pledgedAt ? new Date(pledgedAt) : null;

  let donatedAtDate = parseLocalDateTimeInput(donatedAt);
  if (!donatedAtDate) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Please enter a valid donation date and time.',
      donatedAtDate: null,
    };
  }

  // Handle minute-granularity datetime-local inputs landing in the exact same HH:mm as pledgedAt
  if (
    pledgedAtDate &&
    !isNaN(pledgedAtDate.getTime()) &&
    Math.floor(donatedAtDate.getTime() / 60000) === Math.floor(pledgedAtDate.getTime() / 60000) &&
    donatedAtDate.getTime() < pledgedAtDate.getTime()
  ) {
    donatedAtDate = new Date(pledgedAtDate.getTime());
  }

  if (donatedAtDate.getTime() > confDate.getTime()) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Donation date cannot be in the future.',
      donatedAtDate,
    };
  }

  if (pledgedAtDate && !isNaN(pledgedAtDate.getTime()) && donatedAtDate.getTime() < pledgedAtDate.getTime()) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Donation date cannot be before the pledge date.',
      donatedAtDate,
    };
  }

  const maxBackdateMs = maxBackdateDays * MS_PER_DAY;
  if (!isAdmin && confDate.getTime() - donatedAtDate.getTime() > maxBackdateMs) {
    return {
      valid: false,
      statusCode: 409,
      error: `Donation date cannot be more than ${maxBackdateDays} days before confirmation unless confirmed by an administrator.`,
      donatedAtDate,
    };
  }

  return {
    valid: true,
    statusCode: 200,
    error: null,
    donatedAtDate,
  };
}
