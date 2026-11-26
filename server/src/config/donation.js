/**
 * server/src/config/donation.js
 *
 * Single source of truth for donation confirmation and backdate validation settings.
 */

const { DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');

const parsedBackdateDays = Number(process.env.MAX_DONATION_BACKDATE_DAYS);
const MAX_DONATION_BACKDATE_DAYS =
  Number.isFinite(parsedBackdateDays) && parsedBackdateDays >= 0
    ? parsedBackdateDays
    : 7;

module.exports = {
  DONATION_COOLDOWN_DAYS,
  MAX_DONATION_BACKDATE_DAYS,
};
