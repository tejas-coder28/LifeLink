const DonorProfile = require('../../repositories/donorProfile.repository');
const BloodRequest = require('../../repositories/bloodRequest.repository');
const User = require('../../repositories/user.repository');
const donationService = require('../donation.service');
const notificationService = require('../notification.service');
const donorBadgeService = require('../donorBadge.service');
const { canDonate } = require('../../utils/bloodCompatibility');
const { calculateEligibility, computeNextEligibleDate } = require('../../utils/eligibility');
const { formatDate } = require('../../utils/dateFormatter');
const { calculateHaversineDistance } = require('../../utils/geo');
const { canSeekDonors } = require('../../utils/requestRules');
const { ML_PER_UNIT, formatUnits } = require('../../config/bloodUnits');

/**
 * Returns donor profile information for the authenticated user.
 */
async function getMyProfile(context) {
  const profile = await DonorProfile.findOne({ user: context.userId }).populate('user', 'name email phone');
  if (!profile) {
    const user = await User.findById(context.userId).select('name email phone');
    return {
      name: user?.name || 'LifeLink Donor',
      email: user?.email || '',
      phone: user?.phone || '',
      bloodGroup: 'Not set',
      bloodGroupConfirmed: false,
      isAvailable: false,
      address: '',
      lastDonationDate: null,
      nextEligibleDate: 'Eligible today',
    };
  }

  const eligibility = calculateEligibility(profile.lastDonationDate);
  return {
    name: profile.user?.name || 'LifeLink Donor',
    email: profile.user?.email || '',
    phone: profile.contactNumber || profile.user?.phone || '',
    bloodGroup: profile.bloodGroup || 'O+',
    bloodGroupConfirmed: !!profile.bloodGroupConfirmed,
    isAvailable: !!profile.isAvailable,
    address: profile.address || '',
    age: profile.age || null,
    gender: profile.gender || '',
    lastDonationDate: eligibility.lastDonationDate ? formatDate(eligibility.lastDonationDate) : null,
    nextEligibleDate: eligibility.isEligible ? 'Eligible today' : formatDate(eligibility.nextEligibleDate),
    daysLeft: eligibility.daysLeft,
  };
}

/**
 * Checks 90-day cooldown eligibility for the donor.
 */
async function getEligibility(context) {
  const profile = await DonorProfile.findOne({ user: context.userId });
  const eligibility = calculateEligibility(profile?.lastDonationDate);
  if (!profile || !eligibility.lastDonationDate) {
    return {
      isEligible: true,
      daysLeft: 0,
      nextEligibleDate: null,
      lastDonationDate: null,
      rationale: 'Eligible to donate now. No recent donations on record.',
    };
  }

  return {
    isEligible: eligibility.isEligible,
    daysLeft: eligibility.daysLeft,
    nextEligibleDate: eligibility.isEligible ? 'Eligible today' : formatDate(eligibility.nextEligibleDate),
    lastDonationDate: formatDate(eligibility.lastDonationDate),
    rationale: eligibility.isEligible
      ? 'Eligible to donate now. Cooldown period completed.'
      : `In cooldown: ${eligibility.daysLeft} day(s) remaining before next donation.`,
  };
}

/**
 * Returns open, matching, or partially fulfilled requests compatible with this donor's blood group.
 * Shared with Donor Dashboard badge calculation via donorBadgeService.
 * Nearest first, without exposing private patient contacts or exact coordinates.
 */
async function getOpenRequestsForMe(context) {
  const profile = await DonorProfile.findOne({ user: context.userId });
  const donorBloodGroup = profile?.bloodGroup || 'O+';
  const donorCoords = profile?.location?.coordinates || [77.2090, 28.6139];

  // Use the shared badge service function for requests parity
  const compatibleRaw = await donorBadgeService.getCompatibleRequests(context.userId, profile);

  const compatibleRequests = compatibleRaw.map((req) => {
    const reqCoords = req.location?.coordinates || [77.2090, 28.6139];
    const distanceKm = Math.round(calculateHaversineDistance(donorCoords, reqCoords) * 10) / 10;
    return {
      id: req._id.toString(),
      patientName: req.patientName || 'Emergency Patient',
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      volumeMlNeeded: req.unitsNeeded * ML_PER_UNIT,
      formattedUnitsNeeded: formatUnits(req.unitsNeeded),
      unitsFulfilled: req.unitsFulfilled || 0,
      volumeMlFulfilled: (req.unitsFulfilled || 0) * ML_PER_UNIT,
      formattedUnitsFulfilled: formatUnits(req.unitsFulfilled || 0),
      urgency: req.urgency,
      hospitalName: req.targetHospital?.name || 'LifeLink Medical Center',
      address: req.address || req.targetHospital?.address || 'City Center',
      distanceKm,
      status: req.status,
    };
  });

  compatibleRequests.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    donorBloodGroup,
    count: compatibleRequests.length,
    totalMatchingRequests: compatibleRequests.length,
    requests: compatibleRequests.slice(0, 6),
  };
}

/**
 * Returns emergency blood requests submitted by this user.
 */
async function getMyRequests(context) {
  const requests = await BloodRequest.find({ requester: context.userId })
    .populate('targetHospital', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    totalRequests: requests.length,
    requests: requests.map((req) => ({
      id: req._id.toString(),
      patientName: req.patientName,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      unitsFulfilled: req.unitsFulfilled || 0,
      status: req.status,
      urgency: req.urgency,
      hospitalName: req.targetHospital?.name || 'Assigned Hospital',
      createdAt: req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : '',
    })),
  };
}

/**
 * Returns past donation records and pledges for this donor.
 */
async function getMyDonationHistory(context) {
  const history = await donationService.getUserDonationHistory(context.userId);
  const records = Array.isArray(history) ? history : [];
  const totalDonations = await donorBadgeService.getHistoryBadgeCount(context.userId);

  return {
    count: totalDonations,
    totalDonations,
    completedDonations: records.filter((r) => r.status === 'completed').length,
    records: records.slice(0, 6).map((item) => {
      const pledgedAtRaw = item.pledgedAt || item.createdAt;
      const isFulfilled = item.status === 'completed' || item.status === 'fulfilled';
      const donatedAtRaw = isFulfilled
        ? (item.donatedAt || item.confirmedAt || item.completedAt || item.fulfilledAt)
        : null;
      const confirmedAtRaw = isFulfilled
        ? (item.confirmedAt || item.fulfilledAt || item.completedAt)
        : null;
      const releasedAtRaw = ['released', 'cancelled', 'rejected'].includes(item.status)
        ? (item.releasedAt || item.cancelledAt || item.updatedAt)
        : null;
      const nextEligibleRaw = donatedAtRaw ? computeNextEligibleDate(donatedAtRaw) : null;

      return {
        id: item._id?.toString(),
        patientName: item.request?.patientName || 'Emergency Patient',
        bloodGroup: item.request?.bloodGroup || 'Blood Unit',
        unitsDonated: item.unitsDonated || 1,
        status: item.status,
        hospitalName: item.hospitalName || item.request?.targetHospital?.name || 'Partner Hospital',
        pledgedAt: formatDate(pledgedAtRaw, ''),
        donatedAt: donatedAtRaw ? formatDate(donatedAtRaw, '') : null,
        confirmedAt: confirmedAtRaw ? formatDate(confirmedAtRaw, '') : null,
        releasedAt: releasedAtRaw ? formatDate(releasedAtRaw, '') : null,
        nextEligibleDate: nextEligibleRaw ? formatDate(nextEligibleRaw, '') : null,
        date: formatDate(donatedAtRaw || pledgedAtRaw, ''),
      };
    }),
  };
}

/**
 * Returns recent notification alerts for this user.
 */
async function getMyAlerts(context) {
  const notifs = await notificationService.getUserNotifications(context.userId);
  const list = Array.isArray(notifs) ? notifs : [];
  const unreadCount = await donorBadgeService.getAlertsBadgeCount(context.userId);

  return {
    count: unreadCount,
    unreadCount,
    alerts: list.slice(0, 5).map((n) => ({
      id: n._id?.toString(),
      title: n.title,
      message: n.message,
      isRead: !!n.isRead,
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '',
    })),
  };
}

/**
 * Returns real-time donor badge counts identical to the dashboard tabs.
 */
async function getMyBadges(context) {
  return await donorBadgeService.getAllDonorBadges(context.userId);
}

/**
 * Returns donor's active pending pledges awaiting hospital confirmation.
 */
async function getMyPendingPledges(context) {
  const Donation = require('../../repositories/donation.repository');
  const pledges = await Donation.find({
    donor: context.userId,
    status: 'pledged',
  }).populate({
    path: 'request',
    select: 'patientName bloodGroup targetHospital unitsNeeded',
    populate: { path: 'targetHospital', select: 'name' },
  });

  return {
    count: pledges.length,
    pledges: pledges.map((p) => ({
      id: p._id.toString(),
      patientName: p.request?.patientName || 'Emergency Patient',
      bloodGroup: p.request?.bloodGroup || 'Unknown',
      hospitalName: p.hospitalName || p.request?.targetHospital?.name || 'Partner Hospital',
      unitsPledged: p.unitsDonated || 1,
      pledgedAt: formatDate(p.pledgedAt || p.createdAt, ''),
      status: 'Awaiting Hospital Confirmation',
    })),
  };
}

/**
 * Recommends the concrete next action for the donor based on profile, cooldown, or active pledges.
 */
async function getNextSteps(context) {
  const profile = await DonorProfile.findOne({ user: context.userId });
  const Donation = require('../../repositories/donation.repository');
  const pendingPledge = await Donation.findOne({ donor: context.userId, status: 'pledged' }).populate({
    path: 'request',
    select: 'patientName targetHospital',
    populate: { path: 'targetHospital', select: 'name address' },
  });

  if (pendingPledge) {
    const hospitalLabel = pendingPledge.hospitalName || pendingPledge.request?.targetHospital?.name || 'the medical facility';
    return {
      stage: 'pending_pledge',
      title: 'Active Donation Pledge',
      nextAction: `Visit ${hospitalLabel} to complete your blood donation.`,
      actionButton: 'donor-history',
      actionLabel: 'View Pledge Details',
    };
  }

  if (!profile || !profile.bloodGroupConfirmed) {
    return {
      stage: 'profile_incomplete',
      title: 'Complete Profile',
      nextAction: 'Confirm your blood group and standby status in Profile & Health.',
      actionButton: 'donor-profile',
      actionLabel: 'Go to Profile',
    };
  }

  const eligibility = calculateEligibility(profile.lastDonationDate);
  if (!eligibility.isEligible) {
    return {
      stage: 'cooldown',
      title: 'Rest & Recovery',
      nextAction: `You are in rest cooldown for ${eligibility.daysLeft} more day(s) (eligible again on ${formatDate(eligibility.nextEligibleDate)}). Thank you for saving lives!`,
      actionButton: 'donor-profile',
      actionLabel: 'View Health Info',
    };
  }

  return {
    stage: 'ready_to_donate',
    title: 'Ready for Emergency Standby',
    nextAction: 'You are eligible to donate! Review open community blood requests or keep standby status online.',
    actionButton: 'donor-requests',
    actionLabel: 'View Open Requests',
  };
}

module.exports = {
  getMyProfile,
  getEligibility,
  getOpenRequestsForMe,
  getMyRequests,
  getMyDonationHistory,
  getMyAlerts,
  getMyBadges,
  getMyPendingPledges,
  getNextSteps,
};

