const Hospital = require('../../repositories/hospital.repository');
const BloodRequest = require('../../repositories/bloodRequest.repository');
const Donation = require('../../repositories/donation.repository');
const { BLOOD_GROUPS } = require('../../utils/bloodCompatibility');
const { findMatchesForRequestId } = require('../matching.service');

/**
 * Returns inventory breakdown for all 8 blood groups, total, low stock (<= 3), and critical (= 0).
 */
async function getInventory(context) {
  const hospital = await Hospital.findOne({ user: context.userId });
  if (!hospital) {
    return { error: 'Hospital profile not found for this account' };
  }

  const inventoryMap = {};
  (hospital.inventory || []).forEach((item) => {
    inventoryMap[item.bloodGroup] = Number(item.units) || 0;
  });

  const fullInventory = BLOOD_GROUPS.map((bg) => ({
    bloodGroup: bg,
    units: inventoryMap[bg] || 0,
  }));

  const totalUnits = fullInventory.reduce((acc, curr) => acc + curr.units, 0);
  const critical = fullInventory.filter((item) => item.units === 0).map((i) => i.bloodGroup);
  const lowStock = fullInventory.filter((item) => item.units > 0 && item.units <= 3).map((i) => i.bloodGroup);

  return {
    hospitalName: hospital.name,
    isVerified: !!hospital.isVerified,
    totalUnits,
    criticalGroups: critical,
    lowStockGroups: lowStock,
    inventory: fullInventory,
  };
}

/**
 * Returns incoming patient emergency requests directed to this facility.
 */
async function getIncomingDemands(context) {
  const hospital = await Hospital.findOne({ user: context.userId });
  if (!hospital) {
    return { error: 'Hospital profile not found for this account' };
  }

  const demands = await BloodRequest.find({
    targetHospital: hospital._id,
    status: 'pending_hospital_review',
  }).sort({ createdAt: -1 });

  return {
    hospitalName: hospital.name,
    pendingDemandsCount: demands.length,
    demands: demands.slice(0, 8).map((req) => ({
      id: req._id.toString(),
      patientName: req.patientName,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      urgency: req.urgency,
      address: req.address || '',
      createdAt: req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : '',
    })),
  };
}

/**
 * Returns active blood requests broadcast by this hospital.
 * Enforces verification status check.
 */
async function getActiveRequests(context) {
  const hospital = await Hospital.findOne({ user: context.userId });
  if (!hospital) {
    return { error: 'Hospital profile not found' };
  }

  if (!hospital.isVerified) {
    return {
      status: 'unverified',
      isVerified: false,
      message: 'Hospital verification required by administrator before broadcasting or managing blood requests.',
      activeRequests: [],
    };
  }

  const requests = await BloodRequest.find({
    $or: [{ requester: context.userId }, { targetHospital: hospital._id }, { hospital: hospital._id }],
    status: { $in: ['open', 'matching', 'partially_fulfilled'] },
  }).sort({ createdAt: -1 });

  return {
    status: 'active',
    isVerified: true,
    totalActive: requests.length,
    activeRequests: requests.slice(0, 8).map((req) => ({
      id: req._id.toString(),
      patientName: req.patientName,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      unitsFulfilled: req.unitsFulfilled || 0,
      urgency: req.urgency,
      matchedDonorsCount: req.matchedDonorsCount || 0,
      status: req.status,
      createdAt: req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : '',
    })),
  };
}

/**
 * Returns pending donor pledges awaiting hospital confirmation or intake.
 */
async function getPendingPledges(context) {
  const hospital = await Hospital.findOne({ user: context.userId });
  if (!hospital) {
    return { error: 'Hospital profile not found' };
  }

  const myReqs = await BloodRequest.find({
    $or: [{ requester: context.userId }, { targetHospital: hospital._id }, { hospital: hospital._id }],
  }).select('_id');

  const reqIds = myReqs.map((r) => r._id);
  if (reqIds.length === 0) {
    return { pendingPledgesCount: 0, pledges: [] };
  }

  const pledges = await Donation.find({
    request: { $in: reqIds },
    status: 'pledged',
  })
    .populate('donor', 'name')
    .populate('donorProfile', 'bloodGroup')
    .populate('request', 'patientName bloodGroup')
    .sort({ createdAt: -1 });

  return {
    pendingPledgesCount: pledges.length,
    pledges: pledges.slice(0, 8).map((p) => ({
      id: p._id.toString(),
      requestId: (p.request?._id || p.request)?.toString(),
      patientName: p.request?.patientName || 'Emergency Patient',
      donorName: p.donor?.name || 'Anonymous Donor',
      donorBloodGroup: p.donorProfile?.bloodGroup || 'Blood Donor',
      unitsDonated: p.unitsDonated || 1,
      pledgedAt: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
    })),
  };
}

/**
 * Returns ranked matching donors for a specific request owned by this hospital.
 * Enforces ownership check and fails closed.
 */
async function getMatchingDonors(context, args = {}) {
  const { requestId } = args;
  if (!requestId) {
    return { error: 'Missing required parameter: requestId' };
  }

  const hospital = await Hospital.findOne({ user: context.userId });
  if (!hospital) {
    return { error: 'Hospital profile not found' };
  }

  if (!hospital.isVerified) {
    return {
      status: 'unverified',
      isVerified: false,
      message: 'Hospital verification required by administrator before accessing matching donors.',
    };
  }

  const request = await BloodRequest.findById(requestId);
  if (!request) {
    return { error: 'Blood request not found' };
  }

  // Security check: verify this request belongs to this hospital or fails closed
  const targetId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
  const requesterId = (request.requester?._id || request.requester)?.toString();
  const hospitalIdStr = hospital._id.toString();
  const userIdStr = context.userId.toString();

  const isOwner = targetId === hospitalIdStr || requesterId === userIdStr;
  if (!isOwner) {
    return { error: 'Unauthorized: Request does not belong to your hospital facility' };
  }

  try {
    const matchResult = await findMatchesForRequestId(requestId, 5);
    return {
      requestId,
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      totalMatches: matchResult.matchesCount,
      matches: (matchResult.matches || []).map((m) => ({
        donorId: m.donor?._id?.toString(),
        bloodGroup: m.donor?.bloodGroup,
        distanceKm: m.distanceKm,
        matchTier: m.matchTier,
        rationale: m.rationale,
      })),
    };
  } catch (err) {
    return {
      error: err.message || 'Unable to retrieve matching donors',
    };
  }
}

/**
 * Returns verification and registration status for this hospital.
 */
async function getMyVerificationStatus(context) {
  const hospital = await Hospital.findOne({ user: context.userId });
  if (!hospital) {
    return { error: 'Hospital profile not found' };
  }

  return {
    hospitalName: hospital.name,
    isVerified: !!hospital.isVerified,
    statusText: hospital.isVerified ? 'VERIFIED FACILITY' : 'PENDING ADMIN APPROVAL',
    address: hospital.address || 'Address not listed',
    phone: hospital.phone || 'Phone not listed',
  };
}

module.exports = {
  getInventory,
  getIncomingDemands,
  getActiveRequests,
  getPendingPledges,
  getMatchingDonors,
  getMyVerificationStatus,
};
