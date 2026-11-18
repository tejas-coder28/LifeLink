const DonorProfile = require('../repositories/donorProfile.repository');
const BloodRequest = require('../repositories/bloodRequest.repository');
const donationService = require('./donation.service');
const notificationService = require('./notification.service');
const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const { calculateHaversineDistance } = require('../utils/geo');
const { canSeekDonors } = require('../utils/requestRules');

/**
 * Validates whether a donor profile satisfies all required completion criteria:
 * 1. Blood group selected and confirmed
 * 2. Contact phone number provided
 * 3. Primary city / location address provided
 * 4. Age >= 18 or 18+ confirmed
 * 5. Body weight 50kg+ confirmed
 * 6. Consent to be contacted confirmed
 */
function isProfileComplete(profile) {
  if (!profile) return false;
  const hasBloodGroup = Boolean(
    profile.bloodGroup &&
    profile.bloodGroup !== 'Not set' &&
    profile.bloodGroupConfirmed !== false
  );
  const hasContact = Boolean(profile.contactNumber || profile.phone);
  const hasAddress = Boolean(profile.address && profile.address.trim().length > 0);
  const hasAgeOr18Plus = Boolean(profile.is18Plus === true || (profile.age && Number(profile.age) >= 18));
  const hasWeight = Boolean(profile.isWeight50KgPlus === true);
  const hasConsent = Boolean(profile.consentContact === true);

  return hasBloodGroup && hasContact && hasAddress && hasAgeOr18Plus && hasWeight && hasConsent;
}

/**
 * 1. Requests Badge Service Function:
 * Returns open requests compatible with this donor, excluding:
 * - Requests the donor already pledged to or fulfilled
 * - Requests created by this donor
 * - Cancelled / fulfilled / closed requests
 * - Duplicate request IDs
 *
 * Used by Donor Dashboard (Requests tab badge) and AI assistant (getOpenRequestsForMe).
 */
async function getCompatibleRequests(userId, donorProfile = null) {
  const profile = donorProfile || await DonorProfile.findByUserId(userId);
  const donorBloodGroup = profile?.bloodGroup || 'O+';
  const donorUserIdStr = userId.toString();

  // 1. Fetch user's existing pledges/donations to exclude requests already pledged to
  const userHistory = await donationService.getUserDonationHistory(userId);
  const pledgedRequestIds = new Set(
    (userHistory || []).map((d) => {
      const rId = d.request?._id || d.request?.id || d.request;
      return rId ? rId.toString() : null;
    }).filter(Boolean)
  );

  // 2. Fetch requests in statuses that can seek donors
  const requests = await BloodRequest.find({
    status: { $in: ['open', 'matching', 'partially_fulfilled'] },
  })
    .populate('targetHospital', 'name address')
    .sort({ createdAt: -1 });

  // 3. Filter and deduplicate
  const seenIds = new Set();
  const compatible = [];

  for (const req of requests) {
    const reqId = req._id.toString();
    if (seenIds.has(reqId)) continue;
    seenIds.add(reqId);

    // Exclude requests this donor already pledged to
    if (pledgedRequestIds.has(reqId)) continue;

    // Exclude donor's own requests
    const requesterId = req.requester?._id ? req.requester._id.toString() : req.requester?.toString();
    if (requesterId && requesterId === donorUserIdStr) continue;

    // Must satisfy canSeekDonors rules (e.g. open/matching/partially_fulfilled, not expired/cancelled)
    if (!canSeekDonors(req)) continue;

    // Must be RBC compatible with this donor's blood group
    if (!canDonate(donorBloodGroup, req.bloodGroup)) continue;

    compatible.push(req);
  }

  return compatible;
}

async function getCompatibleRequestsBadgeCount(userId, donorProfile = null) {
  const list = await getCompatibleRequests(userId, donorProfile);
  return list.length;
}

/**
 * 2. "For You" Badge Service Function:
 *
 * Definition & Rule:
 * (Compatible + Nearby + Eligible)
 * Strictly a subset of the Requests badge:
 * 1. Must be a compatible, unpledged request from getCompatibleRequests(userId).
 * 2. Donor must be cooldown-eligible: 90 days must have elapsed since last donation.
 *    If donor is currently in cooldown (daysLeft > 0), "For You" is 0.
 * 3. Distance between donor coordinates and request location must be within nearby radius (<= 25 km).
 *
 * Used by Donor Dashboard (For You tab badge) and AI assistant.
 */
async function getForYouRequests(userId, donorProfile = null) {
  const profile = donorProfile || await DonorProfile.findByUserId(userId);
  if (!profile) return [];

  // Check 90-day cooldown eligibility
  if (profile.lastDonationDate) {
    const lastDate = new Date(profile.lastDonationDate);
    const diffMs = Date.now() - lastDate.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysSince < DONATION_COOLDOWN_DAYS) {
      // In cooldown: not eligible for personalized emergency matching
      return [];
    }
  }

  // If donor has no real location set (no address or coordinates), For You is empty
  const hasRealLocation = Boolean(profile.address && profile.address.trim().length > 0);
  if (!hasRealLocation) {
    const empty = [];
    empty.noLocation = true;
    return empty;
  }

  // Get compatible requests (base set)
  const compatibleRequests = await getCompatibleRequests(userId, profile);
  const donorCoords = profile.location?.coordinates;
  if (!donorCoords || !Array.isArray(donorCoords) || donorCoords.length < 2) {
    const empty = [];
    empty.noLocation = true;
    return empty;
  }

  // Subset: nearby requests within 25 km (For You ⊆ Requests)
  const forYouList = compatibleRequests.filter((req) => {
    const reqCoords = req.location?.coordinates || [77.2090, 28.6139];
    const distKm = calculateHaversineDistance(donorCoords, reqCoords);
    return distKm <= 25;
  });

  return forYouList;
}

async function getForYouBadgeCount(userId, donorProfile = null) {
  const list = await getForYouRequests(userId, donorProfile);
  return Array.isArray(list) ? list.length : 0;
}

/**
 * 3. Alerts Badge Service Function:
 * Unread notifications for THIS user only.
 * A brand-new account starts at 0.
 *
 * Used by Donor Dashboard (Alerts tab badge) and AI assistant (getMyAlerts).
 */
async function getAlertsBadgeCount(userId) {
  const notifications = await notificationService.getUserNotifications(userId);
  if (!Array.isArray(notifications)) return 0;
  return notifications.filter((n) => !n.isRead).length;
}

/**
 * 4. History Badge Service Function:
 * Count of pledges + donations for this donor.
 *
 * Used by Donor Dashboard (History tab badge) and AI assistant (getMyDonationHistory).
 */
async function getHistoryBadgeCount(userId) {
  const history = await donationService.getUserDonationHistory(userId);
  return Array.isArray(history) ? history.length : 0;
}

/**
 * Aggregates all donor badge counts in one unified call.
 */
async function getAllDonorBadges(userId) {
  const profile = await DonorProfile.findByUserId(userId);
  const [compatibleReqs, forYouReqs, alertsCount, historyCount] = await Promise.all([
    getCompatibleRequests(userId, profile),
    getForYouRequests(userId, profile),
    getAlertsBadgeCount(userId),
    getHistoryBadgeCount(userId),
  ]);

  return {
    requests: compatibleReqs.length,
    forYou: forYouReqs.length,
    alerts: alertsCount,
    history: historyCount,
    hasLocation: Boolean(profile?.address && profile.address.trim().length > 0),
    isProfileComplete: isProfileComplete(profile),
  };
}

module.exports = {
  isProfileComplete,
  getCompatibleRequests,
  getCompatibleRequestsBadgeCount,
  getForYouRequests,
  getForYouBadgeCount,
  getAlertsBadgeCount,
  getHistoryBadgeCount,
  getAllDonorBadges,
};
