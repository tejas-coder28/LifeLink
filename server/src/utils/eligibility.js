/**
 * server/src/utils/eligibility.js
 *
 * Shared donor cooldown eligibility and donation date validation helpers.
 */

const { DONATION_COOLDOWN_DAYS, MAX_DONATION_BACKDATE_DAYS } = require('../config/donation');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Computes the next eligible donation date from an actual donation timestamp (donatedAt).
 * @param {Date|string|null} donatedAt
 * @param {number} [cooldownDays=DONATION_COOLDOWN_DAYS]
 * @returns {Date|null}
 */
function computeNextEligibleDate(donatedAt, cooldownDays = DONATION_COOLDOWN_DAYS) {
  if (!donatedAt) return null;
  const d = new Date(donatedAt);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + cooldownDays * MS_PER_DAY);
}

/**
 * Shared eligibility calculation based on lastDonationDate (= latest donatedAt) and cooldown window.
 * @param {Date|string|null} lastDonationDate
 * @param {Date|string} [referenceDate=new Date()]
 * @param {number} [cooldownDays=DONATION_COOLDOWN_DAYS]
 * @returns {{ isEligible: boolean, daysSince: number|null, daysLeft: number, lastDonationDate: Date|null, nextEligibleDate: Date|null }}
 */
function calculateEligibility(lastDonationDate, referenceDate = new Date(), cooldownDays = DONATION_COOLDOWN_DAYS) {
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
 * Validates actual collection date (donatedAt) against pledge time, confirmation time, and role limits.
 * @returns {{ valid: boolean, statusCode: number, error: string|null, donatedAtDate: Date|null, confirmationDate: Date, pledgedAtDate: Date|null }}
 */
function validateDonatedAt({
  donatedAt,
  pledgedAt,
  confirmationDate = new Date(),
  isAdmin = false,
  maxBackdateDays = MAX_DONATION_BACKDATE_DAYS,
}) {
  const confDate = confirmationDate instanceof Date ? confirmationDate : new Date(confirmationDate);
  const pledgedAtDate = pledgedAt ? new Date(pledgedAt) : null;

  let donatedAtDate;
  if (donatedAt === undefined || donatedAt === null || donatedAt === '') {
    donatedAtDate = new Date(confDate.getTime());
  } else {
    donatedAtDate = new Date(donatedAt);
    if (isNaN(donatedAtDate.getTime())) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Invalid donation date provided.',
        donatedAtDate: null,
        confirmationDate: confDate,
        pledgedAtDate,
      };
    }
  }

  if (donatedAtDate.getTime() > confDate.getTime()) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Donation date cannot be in the future.',
      donatedAtDate,
      confirmationDate: confDate,
      pledgedAtDate,
    };
  }

  if (pledgedAtDate && !isNaN(pledgedAtDate.getTime()) && donatedAtDate.getTime() < pledgedAtDate.getTime()) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Donation date cannot be before the pledge date.',
      donatedAtDate,
      confirmationDate: confDate,
      pledgedAtDate,
    };
  }

  const maxBackdateMs = maxBackdateDays * MS_PER_DAY;
  if (!isAdmin && confDate.getTime() - donatedAtDate.getTime() > maxBackdateMs) {
    return {
      valid: false,
      statusCode: 409,
      error: `Donation date cannot be more than ${maxBackdateDays} days before confirmation unless confirmed by an administrator.`,
      donatedAtDate,
      confirmationDate: confDate,
      pledgedAtDate,
    };
  }

  return {
    valid: true,
    statusCode: 200,
    error: null,
    donatedAtDate,
    confirmationDate: confDate,
    pledgedAtDate,
  };
}

module.exports = {
  DONATION_COOLDOWN_DAYS,
  MAX_DONATION_BACKDATE_DAYS,
  MS_PER_DAY,
  computeNextEligibleDate,
  calculateEligibility,
  validateDonatedAt,
};
