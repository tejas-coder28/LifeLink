const DonorProfile = require('../../repositories/donorProfile.repository');
const BloodRequest = require('../../repositories/bloodRequest.repository');
const User = require('../../repositories/user.repository');
const donationService = require('../donation.service');
const notificationService = require('../notification.service');
const { canDonate, DONATION_COOLDOWN_DAYS } = require('../../utils/bloodCompatibility');
const { calculateHaversineDistance } = require('../../utils/geo');

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
    };
  }

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
  };
}

/**
 * Checks 90-day cooldown eligibility for the donor.
 */
async function getEligibility(context) {
  const profile = await DonorProfile.findOne({ user: context.userId });
  if (!profile || !profile.lastDonationDate) {
    return {
      isEligible: true,
      daysLeft: 0,
      nextEligibleDate: null,
      lastDonationDate: null,
      rationale: 'Eligible to donate now. No recent donations on record.',
    };
  }

  const lastDate = new Date(profile.lastDonationDate);
  const diffMs = Date.now() - lastDate.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, DONATION_COOLDOWN_DAYS - daysSince);
  const nextEligibleDate = new Date(lastDate.getTime() + DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    isEligible: daysLeft === 0,
    daysLeft,
    nextEligibleDate: daysLeft === 0 ? 'Eligible today' : nextEligibleDate,
    lastDonationDate: lastDate.toISOString().split('T')[0],
    rationale: daysLeft === 0
      ? 'Eligible to donate now. Cooldown period completed.'
      : `In cooldown: ${daysLeft} day(s) remaining before next donation.`,
  };
}

/**
 * Returns open, matching, or partially fulfilled requests compatible with this donor's blood group.
 * Nearest first, without exposing private patient contacts or exact coordinates.
 */
async function getOpenRequestsForMe(context) {
  const profile = await DonorProfile.findOne({ user: context.userId });
  const donorBloodGroup = profile?.bloodGroup || 'O+';
  const donorCoords = profile?.location?.coordinates || [77.2090, 28.6139];

  const requests = await BloodRequest.find({
    status: { $in: ['open', 'matching', 'partially_fulfilled'] },
  })
    .populate('targetHospital', 'name address')
    .sort({ createdAt: -1 });

  const donorUserIdStr = context.userId.toString();

  const compatibleRequests = requests
    .filter((req) => {
      // Exclude donor's own requests
      const reqUserId = req.requester?._id ? req.requester._id.toString() : req.requester?.toString();
      if (reqUserId && reqUserId === donorUserIdStr) return false;
      // RBC compatibility check
      return canDonate(donorBloodGroup, req.bloodGroup);
    })
    .map((req) => {
      const reqCoords = req.location?.coordinates || [77.2090, 28.6139];
      const distanceKm = Math.round(calculateHaversineDistance(donorCoords, reqCoords) * 10) / 10;
      return {
        id: req._id.toString(),
        patientName: req.patientName || 'Emergency Patient',
        bloodGroup: req.bloodGroup,
        unitsNeeded: req.unitsNeeded,
        unitsFulfilled: req.unitsFulfilled || 0,
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

  return {
    totalDonations: records.length,
    completedDonations: records.filter((r) => r.status === 'completed').length,
    records: records.slice(0, 6).map((item) => ({
      id: item._id?.toString(),
      patientName: item.request?.patientName || 'Emergency Patient',
      bloodGroup: item.request?.bloodGroup || 'Blood Unit',
      unitsDonated: item.unitsDonated || 1,
      status: item.status,
      hospitalName: item.request?.targetHospital?.name || 'Partner Hospital',
      date: item.completedAt || item.donationDate || item.createdAt
        ? new Date(item.completedAt || item.donationDate || item.createdAt).toISOString().split('T')[0]
        : '',
    })),
  };
}

/**
 * Returns recent notification alerts for this user.
 */
async function getMyAlerts(context) {
  const notifs = await notificationService.getUserNotifications(context.userId);
  const list = Array.isArray(notifs) ? notifs : [];

  return {
    unreadCount: list.filter((n) => !n.isRead).length,
    alerts: list.slice(0, 5).map((n) => ({
      id: n._id?.toString(),
      title: n.title,
      message: n.message,
      isRead: !!n.isRead,
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : '',
    })),
  };
}

module.exports = {
  getMyProfile,
  getEligibility,
  getOpenRequestsForMe,
  getMyRequests,
  getMyDonationHistory,
  getMyAlerts,
};
