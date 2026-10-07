/**
 * client/src/utils/requestRules.js
 *
 * Core domain rules for BloodRequest states on the client.
 */

/**
 * Returns true ONLY when:
 * 1. Request status is accepted or partially_fulfilled
 *    ('open', 'accepted', 'matching', 'partially_fulfilled')
 * 2. unitsNeededFromDonors > 0
 * 3. unitsReceived < unitsNeeded
 *
 * @param {Object} request
 * @returns {boolean}
 */
export function canSeekDonors(request) {
  if (!request) return false;

  const status = (request.status || '').toLowerCase().trim();

  // Must be accepted or partially_fulfilled
  const isAcceptedOrPartiallyFulfilled =
    status === 'open' ||
    status === 'accepted' ||
    status === 'matching' ||
    status === 'partially_fulfilled';

  if (!isAcceptedOrPartiallyFulfilled) {
    return false;
  }

  // Units needed
  const unitsNeeded = Number(request.unitsNeeded || request.unitsRequired || request.units || 0);

  // Units needed from donors
  let unitsNeededFromDonors;
  if (request.unitsNeededFromDonors !== undefined && request.unitsNeededFromDonors !== null) {
    unitsNeededFromDonors = Number(request.unitsNeededFromDonors);
  } else if (request.unitsFromDonors !== undefined && request.unitsFromDonors !== null) {
    unitsNeededFromDonors = Number(request.unitsFromDonors);
  } else {
    const fromStock = Number(request.unitsFromStock || 0);
    unitsNeededFromDonors = Math.max(0, unitsNeeded - fromStock);
  }

  // Units received / fulfilled
  let unitsReceived = 0;
  if (request.unitsReceived !== undefined && request.unitsReceived !== null) {
    unitsReceived = Number(request.unitsReceived);
  } else if (request.unitsFulfilled !== undefined && request.unitsFulfilled !== null) {
    unitsReceived = Number(request.unitsFulfilled);
  }

  return unitsNeededFromDonors > 0 && unitsReceived < unitsNeeded;
}

export default canSeekDonors;
