const Hospital = require('../../repositories/hospital.repository');
const BloodRequest = require('../../repositories/bloodRequest.repository');
const Donation = require('../../repositories/donation.repository');
const { BLOOD_GROUPS } = require('../../utils/bloodCompatibility');
const { findMatchesForRequestId } = require('../matching.service');
const { ML_PER_UNIT, formatUnits } = require('../../config/bloodUnits');
const { getHospitalRequestsBundle } = require('../hospitalRequestRules');

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

  const fullInventory = BLOOD_GROUPS.map((bg) => {
    const units = inventoryMap[bg] || 0;
    return {
      bloodGroup: bg,
      units,
      volumeMl: units * ML_PER_UNIT,
      formatted: formatUnits(units),
    };
  });

  const totalUnits = fullInventory.reduce((acc, curr) => acc + curr.units, 0);
  const totalVolumeMl = totalUnits * ML_PER_UNIT;
  const critical = fullInventory.filter((item) => item.units === 0).map((i) => i.bloodGroup);
  const lowStock = fullInventory.filter((item) => item.units > 0 && item.units <= 3).map((i) => i.bloodGroup);

  return {
    hospitalName: hospital.name,
    isVerified: !!hospital.isVerified,
    totalUnits,
    totalVolumeMl,
    formattedTotal: formatUnits(totalUnits, { useLitres: true }),
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

  const bundle = await getHospitalRequestsBundle(hospital, { skipDonorsSync: true });

  return {
    hospitalName: hospital.name,
    pendingDemandsCount: bundle.incomingCount,
    demands: bundle.incomingDemands.slice(0, 8).map((req) => ({
      id: req._id.toString(),
      patientName: req.patientName,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      volumeMlNeeded: req.unitsNeeded * ML_PER_UNIT,
      formattedUnitsNeeded: formatUnits(req.unitsNeeded),
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

  const bundle = await getHospitalRequestsBundle(hospital, { skipDonorsSync: true });

  return {
    status: 'active',
    isVerified: true,
    totalActive: bundle.activeCount,
    activeRequests: bundle.activeRequests.slice(0, 8).map((req) => ({
      id: req._id.toString(),
      patientName: req.patientName,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      volumeMlNeeded: req.unitsNeeded * ML_PER_UNIT,
      formattedUnitsNeeded: formatUnits(req.unitsNeeded),
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
      volumeMlDonated: (p.unitsDonated || 1) * ML_PER_UNIT,
      formattedUnitsDonated: formatUnits(p.unitsDonated || 1),
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

/**
 * Returns cancelled requests for this hospital or user.
 */
async function getCancelledRequests(context) {
  let count = 0;
  let requests = [];

  if (context.role === 'hospital') {
    const hospital = await Hospital.findOne({ user: context.userId });
    if (!hospital) {
      return { cancelledCount: 0, message: 'Hospital profile not found', requests: [] };
    }
    const hospId = hospital._id.toString();
    const docs = await BloodRequest.find({
      $or: [
        { targetHospital: hospId },
        { hospital: hospId },
        { requester: context.userId },
      ],
      status: 'cancelled',
    }).sort({ cancelledAt: -1, createdAt: -1 });
    count = docs.length;
    requests = docs.slice(0, 5).map((r) => ({
      id: r._id.toString(),
      patientName: r.patientName,
      bloodGroup: r.bloodGroup,
      cancelReason: r.cancelReasonLabel || r.cancelReason,
      cancelledAt: r.cancelledAt,
    }));
  } else if (context.role === 'admin') {
    const docs = await BloodRequest.find({ status: 'cancelled' }).sort({ cancelledAt: -1 });
    count = docs.length;
    requests = docs.slice(0, 5).map((r) => ({
      id: r._id.toString(),
      patientName: r.patientName,
      bloodGroup: r.bloodGroup,
      cancelReason: r.cancelReasonLabel || r.cancelReason,
      cancelledAt: r.cancelledAt,
    }));
  } else {
    const docs = await BloodRequest.find({ requester: context.userId, status: 'cancelled' });
    count = docs.length;
    requests = docs.slice(0, 5).map((r) => ({
      id: r._id.toString(),
      patientName: r.patientName,
      bloodGroup: r.bloodGroup,
      cancelReason: r.cancelReasonLabel || r.cancelReason,
      cancelledAt: r.cancelledAt,
    }));
  }

  return {
    cancelledCount: count,
    requests,
  };
}

module.exports = {
  getInventory,
  getIncomingDemands,
  getActiveRequests,
  getPendingPledges,
  getMatchingDonors,
  getMyVerificationStatus,
  getCancelledRequests,
};

