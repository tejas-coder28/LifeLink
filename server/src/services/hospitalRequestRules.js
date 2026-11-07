const BloodRequest = require('../repositories/bloodRequest.repository');
const Donation = require('../repositories/donation.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const { rankDonorsForRequest } = require('./matching.service');

const ACTIVE_HOSPITAL_STATUSES = ['open', 'matching', 'partially_fulfilled'];
const INCOMING_HOSPITAL_STATUSES = ['pending_hospital_review'];

/**
 * Checks if a critical request has passed the 15-minute threshold without hospital response.
 * If so, updates status to 'hospital_no_response'.
 */
async function checkHospitalTimeout(requestDoc) {
  if (!requestDoc) return requestDoc;
  if (
    requestDoc.urgency === 'critical' &&
    requestDoc.status === 'pending_hospital_review'
  ) {
    const elapsedMs = Date.now() - new Date(requestDoc.createdAt).getTime();
    if (elapsedMs >= 15 * 60 * 1000) {
      requestDoc.status = 'hospital_no_response';
      await requestDoc.save();
    }
  }
  return requestDoc;
}

/**
 * Predicate: Is this request an Active Request for this hospital?
 * Active Requests = requests this hospital broadcast or accepted that are
 * not fulfilled, cancelled, or expired (status: open, partially_fulfilled, matching).
 * Requests created by the hospital for itself belong in Active Requests only.
 */
function isHospitalActiveRequest(request, hospitalDocOrId, hospitalUserId = null) {
  if (!request) return false;
  const hospId = (hospitalDocOrId?._id || hospitalDocOrId?.id || hospitalDocOrId || '').toString();
  const hospUserId = (hospitalUserId?._id || hospitalUserId?.id || hospitalUserId || '').toString();

  const reqTargetHosp = (request.targetHospital?._id || request.targetHospital || '').toString();
  const reqHospital = (request.hospital?._id || request.hospital || '').toString();
  const reqRequester = (request.requester?._id || request.requester || '').toString();

  const isAssignedToHospital = (hospId && (reqTargetHosp === hospId || reqHospital === hospId));
  const isCreatedByHospital = (hospUserId && reqRequester === hospUserId);

  if (!isAssignedToHospital && !isCreatedByHospital) {
    return false;
  }

  return ACTIVE_HOSPITAL_STATUSES.includes(request.status);
}

/**
 * Predicate: Is this request an Incoming Demand for this hospital?
 * Incoming Demands = requests created by patients/individuals addressed to
 * this hospital awaiting review (status: pending_hospital_review).
 * Requests created by the hospital for itself NEVER belong in Incoming Demands.
 */
function isHospitalIncomingDemand(request, hospitalDocOrId, hospitalUserId = null) {
  if (!request) return false;
  const hospId = (hospitalDocOrId?._id || hospitalDocOrId?.id || hospitalDocOrId || '').toString();
  const hospUserId = (hospitalUserId?._id || hospitalUserId?.id || hospitalUserId || '').toString();

  const reqTargetHosp = (request.targetHospital?._id || request.targetHospital || '').toString();
  const reqHospital = (request.hospital?._id || request.hospital || '').toString();
  const reqRequester = (request.requester?._id || request.requester || '').toString();

  const isAssignedToHospital = (hospId && (reqTargetHosp === hospId || reqHospital === hospId));
  if (!isAssignedToHospital) return false;

  // Never incoming if created by the hospital user itself
  if (hospUserId && reqRequester === hospUserId) {
    return false;
  }

  return INCOMING_HOSPITAL_STATUSES.includes(request.status);
}

/**
 * Single shared query and classification function used by BOTH dashboard endpoints and AI tools.
 * Returns:
 *   activeRequests: requests in 'open', 'matching', or 'partially_fulfilled'
 *   incomingDemands: requests created by patients in 'pending_hospital_review'
 *   activeCount: length of activeRequests
 *   incomingCount: length of incomingDemands
 */
async function getHospitalRequestsBundle(hospitalDoc, options = {}) {
  if (!hospitalDoc) {
    return {
      allRequests: [],
      activeRequests: [],
      incomingDemands: [],
      activeCount: 0,
      incomingCount: 0,
    };
  }

  const hospId = (hospitalDoc._id || hospitalDoc.id).toString();
  const hospUserId = hospitalDoc.user ? (hospitalDoc.user._id || hospitalDoc.user).toString() : null;

  const orBranches = [
    { targetHospital: hospId },
    { hospital: hospId },
  ];
  if (hospUserId) {
    orBranches.push({ requester: hospUserId });
  }

  const requests = await BloodRequest.find({
    $or: orBranches,
  })
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory isVerified')
    .populate('hospital', 'name phone address location inventory isVerified')
    .sort({ createdAt: -1 });

  // In-memory sort fallback to guarantee descending chronological order
  requests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  let candidateDonors = null;
  const processedRequests = [];
  for (const req of requests) {
    const timedReq = await checkHospitalTimeout(req);
    if (!options.skipDonorsSync) {
      if (!candidateDonors) {
        candidateDonors = await DonorProfile.find()
          .populate('user', 'name email phone accountType hospitalId');
      }
      const matches = rankDonorsForRequest(timedReq, candidateDonors);
      timedReq.matchedDonorsCount = matches.length;
      if (req.matchedDonorsCount !== matches.length) {
        await BloodRequest.findByIdAndUpdate(req._id, { matchedDonorsCount: matches.length });
      }
    }
    processedRequests.push(timedReq);
  }

  const activeRequests = processedRequests.filter((r) => isHospitalActiveRequest(r, hospId, hospUserId));
  const incomingDemands = processedRequests.filter((r) => isHospitalIncomingDemand(r, hospId, hospUserId));

  // Attach live donations/pledges if requested
  let incomingWithDonations = incomingDemands;
  if (options.attachDonations || options.forIncomingEndpoint) {
    const requestIds = incomingDemands.map((r) => r._id);
    let donations = [];
    if (requestIds.length > 0) {
      donations = await Donation.find({ request: { $in: requestIds } })
        .populate('donor', 'name email phone')
        .populate('donorProfile');
    }
    const donationsByRequestId = {};
    donations.forEach((d) => {
      const rId = (d.request?._id || d.request).toString();
      if (!donationsByRequestId[rId]) donationsByRequestId[rId] = [];
      donationsByRequestId[rId].push(d);
    });
    incomingWithDonations = incomingDemands.map((r) => {
      const rObj = typeof r.toObject === 'function' ? r.toObject() : { ...r };
      rObj.donations = donationsByRequestId[r._id.toString()] || [];
      return rObj;
    });
  }

  return {
    allRequests: processedRequests,
    activeRequests,
    incomingDemands: incomingWithDonations,
    activeCount: activeRequests.length,
    incomingCount: incomingDemands.length,
  };
}

module.exports = {
  ACTIVE_HOSPITAL_STATUSES,
  INCOMING_HOSPITAL_STATUSES,
  checkHospitalTimeout,
  isHospitalActiveRequest,
  isHospitalIncomingDemand,
  getHospitalRequestsBundle,
};

