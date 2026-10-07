const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Donation = require('../models/Donation');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const DonorProfile = require('../models/DonorProfile');
const { notifyMatchedDonorsForRequest } = require('./notification.service');
const { canDonate } = require('../utils/bloodCompatibility');
const { rankDonorsForRequest } = require('./matching.service');
const { canSeekDonors } = require('../utils/requestRules');
const pingService = require('./ping.service');

/**
 * Checks if a critical request has passed the 15-minute threshold without hospital response.
 * If so, updates status to 'hospital_no_response'.
 */
const checkHospitalTimeout = async (requestDoc) => {
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
};

const createRequest = async (userId, requestData) => {
  const {
    patientName,
    bloodGroup,
    unitsNeeded,
    urgency,
    address,
    coordinates,
    targetHospital,
    hospitalId,
    requiredByDate,
    notes,
  } = requestData;

  const requester = await User.findById(userId).select('accountType name');
  const targetHospitalInput = targetHospital || hospitalId;
  let targetHospitalDoc = null;
  let initialStatus = 'open';

  if (requester && requester.accountType === 'hospital') {
    // Hospital account: must be verified, auto-targets itself for replenishment
    const hospitalProfile = await Hospital.findOne({ user: userId }).select('isVerified name location address phone');
    if (!hospitalProfile || !hospitalProfile.isVerified) {
      throw new Error(
        'Your hospital account is pending admin approval. You cannot post blood requests until verified.'
      );
    }
    targetHospitalDoc = hospitalProfile;
    initialStatus = 'open'; // replenishment requests skip review step
  } else {
    // Individual user request: targetHospital is strictly required
    if (!targetHospitalInput) {
      const err = new Error('Target hospital is required for emergency blood requests');
      err.statusCode = 400;
      throw err;
    }
    targetHospitalDoc = await Hospital.findById(targetHospitalInput).populate('user', 'email name');
    if (!targetHospitalDoc) {
      const err = new Error('Target hospital not found');
      err.statusCode = 404;
      throw err;
    }
    if (!targetHospitalDoc.isVerified) {
      const err = new Error('Selected hospital is not verified. Please choose a verified hospital.');
      err.statusCode = 400;
      throw err;
    }
    initialStatus = 'pending_hospital_review';
  }

  const reqCoordinates = targetHospitalDoc?.location?.coordinates || coordinates || [77.2090, 28.6139];
  const reqAddress = targetHospitalDoc ? (targetHospitalDoc.address || targetHospitalDoc.name) : address;

  const bloodRequest = await BloodRequest.create({
    requester: userId,
    targetHospital: targetHospitalDoc ? targetHospitalDoc._id : null,
    hospital: targetHospitalDoc ? targetHospitalDoc._id : null,
    patientName,
    bloodGroup,
    unitsNeeded,
    unitsFromStock: 0,
    unitsFromDonors: initialStatus === 'pending_hospital_review' ? 0 : unitsNeeded,
    unitsFulfilled: 0,
    urgency: urgency || 'high',
    address: reqAddress,
    location: {
      type: 'Point',
      coordinates: reqCoordinates,
    },
    requiredByDate: requiredByDate ? new Date(requiredByDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    notes: notes || '',
    status: initialStatus,
  });

  const populatedRequest = await bloodRequest.populate([
    { path: 'requester', select: 'name email phone' },
    { path: 'targetHospital', select: 'name address phone location isVerified' },
  ]);

  if (initialStatus === 'pending_hospital_review') {
    // DO NOT notify donors before hospital accepts!
    // Instead, notify the target hospital's user
    if (targetHospitalDoc && targetHospitalDoc.user) {
      const hospitalUserRecipient = targetHospitalDoc.user._id || targetHospitalDoc.user;
      await Notification.create({
        recipient: hospitalUserRecipient,
        title: `🚨 New Emergency Blood Request: ${bloodGroup} Needed`,
        message: `New request for ${patientName} (${unitsNeeded} units, ${urgency?.toUpperCase() || 'HIGH'} urgency) is awaiting your hospital's review.`,
        type: 'request_match',
        link: `/hospital?tab=requests`,
      });
    }
  } else {
    // Self-replenish or direct open: notify matched donors
    try {
      const notificationResult = await notifyMatchedDonorsForRequest(populatedRequest);
      if (notificationResult && notificationResult.count) {
        bloodRequest.matchedDonorsCount = notificationResult.count;
        await bloodRequest.save();
      }
    } catch (err) {
      console.error('Failed to notify donors:', err.message);
    }
  }

  return bloodRequest;
};

const getRequests = async (filters = {}, callerUser = null) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.bloodGroup) query.bloodGroup = filters.bloodGroup;
  if (filters.requesterId) query.requester = filters.requesterId;
  if (filters.urgency) query.urgency = filters.urgency;
  if (filters.targetHospital) query.targetHospital = filters.targetHospital;

  // Legacy requests are visible to admin only
  if (!callerUser || callerUser.accountType !== 'admin') {
    if (!query.status) {
      query.status = { $ne: 'legacy' };
    }
  }

  // If a hospital is querying requests, they must only see requests targeted at their facility
  if (callerUser && callerUser.accountType === 'hospital') {
    const callerHospital = await Hospital.findOne({ user: callerUser._id });
    if (callerHospital) {
      query.targetHospital = callerHospital._id;
    }
  }

  // If a donor / regular user (or role === 'donor') is querying without an explicit status filter,
  // exclude fulfilled, cancelled, and rejected requests from the active donor list
  const isDonorCaller = callerUser && (callerUser.accountType === 'user' || callerUser.accountType === 'donor' || callerUser.role === 'donor');
  if (isDonorCaller && !filters.status) {
    query.status = { $nin: ['legacy', 'fulfilled', 'cancelled', 'rejected'] };
  }

  const requests = await BloodRequest.find(query)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location isVerified')
    .populate('hospital', 'name phone address location isVerified')
    .sort({ createdAt: -1 });

  const candidateDonors = await DonorProfile.find()
    .populate('user', 'name email phone accountType hospitalId');

  // Apply timeout checks on read and synchronize matchedDonorsCount
  const updatedRequests = [];
  for (const req of requests) {
    const timedReq = await checkHospitalTimeout(req);
    const matches = rankDonorsForRequest(timedReq, candidateDonors);
    timedReq.matchedDonorsCount = matches.length;
    if (req.matchedDonorsCount !== matches.length) {
      await BloodRequest.updateOne({ _id: req._id }, { $set: { matchedDonorsCount: matches.length } });
    }
    updatedRequests.push(timedReq);
  }

  // Enforce donor list visibility: only requests where canSeekDonors is true should appear
  if ((isDonorCaller || filters.forDonor) && !filters.status) {
    return updatedRequests.filter((req) => canSeekDonors(req));
  }

  return updatedRequests;
};

/**
 * Retrieves requests for the current user.
 * - For hospital accounts: returns EVERY request where targetHospital == this hospital (in all statuses).
 * - For individual users: returns all requests created by this user.
 */
const getMyRequests = async (callerUser) => {
  const candidateDonors = await DonorProfile.find()
    .populate('user', 'name email phone accountType hospitalId');

  if (callerUser.accountType === 'hospital') {
    const callerHospital = await Hospital.findOne({ user: callerUser._id });
    if (!callerHospital) {
      const err = new Error('Hospital profile not found');
      err.statusCode = 404;
      throw err;
    }

    const requests = await BloodRequest.find({
      targetHospital: callerHospital._id,
      status: { $ne: 'legacy' },
    })
      .populate('requester', 'name email phone')
      .populate('targetHospital', 'name phone address location isVerified inventory')
      .sort({ createdAt: -1 });

    const updatedRequests = [];
    for (const req of requests) {
      const timedReq = await checkHospitalTimeout(req);
      const matches = rankDonorsForRequest(timedReq, candidateDonors);
      timedReq.matchedDonorsCount = matches.length;
      if (req.matchedDonorsCount !== matches.length) {
        await BloodRequest.updateOne({ _id: req._id }, { $set: { matchedDonorsCount: matches.length } });
      }
      updatedRequests.push(timedReq);
    }
    return updatedRequests;
  }

  const requests = await BloodRequest.find({
    requester: callerUser._id,
    status: { $ne: 'legacy' },
  })
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location isVerified')
    .sort({ createdAt: -1 });

  const updatedRequests = [];
  for (const req of requests) {
    const timedReq = await checkHospitalTimeout(req);
    const matches = rankDonorsForRequest(timedReq, candidateDonors);
    timedReq.matchedDonorsCount = matches.length;
    if (req.matchedDonorsCount !== matches.length) {
      await BloodRequest.updateOne({ _id: req._id }, { $set: { matchedDonorsCount: matches.length } });
    }
    updatedRequests.push(timedReq);
  }
  return updatedRequests;
};

const getRequestById = async (id, callerUser = null) => {
  const request = await BloodRequest.findById(id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location isVerified')
    .populate('hospital', 'name phone address location isVerified');

  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Legacy requests are visible to admin only
  if (request.status === 'legacy' && (!callerUser || callerUser.accountType !== 'admin')) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Hospital invisibility rule: if caller is a hospital, cannot view requests targeted at another hospital
  if (callerUser && callerUser.accountType === 'hospital') {
    const callerHospital = await Hospital.findOne({ user: callerUser._id });
    const targetHospId = request.targetHospital?._id || request.targetHospital;
    if (callerHospital && targetHospId && targetHospId.toString() !== callerHospital._id.toString()) {
      const err = new Error('Unauthorized: This request is addressed to another hospital');
      err.statusCode = 403;
      throw err;
    }
  }

  const candidateDonors = await DonorProfile.find()
    .populate('user', 'name email phone accountType hospitalId');
  const matches = rankDonorsForRequest(request, candidateDonors);
  request.matchedDonorsCount = matches.length;
  if (request.matchedDonorsCount !== matches.length) {
    await BloodRequest.updateOne({ _id: request._id }, { $set: { matchedDonorsCount: matches.length } });
  }

  await checkHospitalTimeout(request);
  return request;
};

const updateRequestStatus = async (id, status) => {
  const request = await BloodRequest.findById(id);
  if (!request) throw new Error('Blood request not found');

  request.status = status;
  await request.save();

  if (status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(request._id);
  }

  return await request.populate('requester', 'name email phone');
};

/**
 * Hospital incoming requests queue
 */
const getIncomingHospitalRequests = async (userId) => {
  const hospital = await Hospital.findOne({ user: userId });
  if (!hospital) {
    const err = new Error('Hospital profile not found');
    err.statusCode = 404;
    throw err;
  }

  const requests = await BloodRequest.find({
    targetHospital: hospital._id,
    status: { $ne: 'legacy' },
  })
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory isVerified')
    .sort({ createdAt: -1 });

  const candidateDonors = await DonorProfile.find()
    .populate('user', 'name email phone accountType hospitalId');

  // Apply timeout checks on read and synchronize matchedDonorsCount
  const updatedRequests = [];
  for (const r of requests) {
    const timedReq = await checkHospitalTimeout(r);
    const matches = rankDonorsForRequest(timedReq, candidateDonors);
    timedReq.matchedDonorsCount = matches.length;
    if (r.matchedDonorsCount !== matches.length) {
      await BloodRequest.updateOne({ _id: r._id }, { $set: { matchedDonorsCount: matches.length } });
    }
    updatedRequests.push(timedReq);
  }

  // Fetch all pledges for these requests to display live in dashboard
  const requestIds = updatedRequests.map(r => r._id);
  const donations = await Donation.find({ request: { $in: requestIds } })
    .populate('donor', 'name email phone')
    .populate('donorProfile');

  const donationsByRequestId = {};
  donations.forEach(d => {
    const rId = d.request.toString();
    if (!donationsByRequestId[rId]) donationsByRequestId[rId] = [];
    donationsByRequestId[rId].push(d);
  });

  return updatedRequests.map(r => {
    const rObj = r.toObject();
    rObj.donations = donationsByRequestId[r._id.toString()] || [];
    return rObj;
  });
};

/**
 * Hospital accepts request:
 * Checks stock for requested group:
 * - Stock >= needed: issues all from stock, status fulfilled, no donor matching
 * - 0 < stock < needed: issues stock, status partially_fulfilled, shortfall donor request opens
 * - stock == 0: status open, donor request for all units opens
 */
const acceptRequest = async (requestId, userId, callerRole) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  let hospital = null;
  if (callerRole === 'admin') {
    hospital = await Hospital.findById(request.targetHospital || request.hospital);
  } else {
    hospital = await Hospital.findOne({ user: userId });
    const targetHospId = request.targetHospital || request.hospital;
    if (!hospital || !targetHospId || targetHospId.toString() !== hospital._id.toString()) {
      const err = new Error('Unauthorized: Request is not addressed to your hospital');
      err.statusCode = 403;
      throw err;
    }
  }

  if (request.status !== 'pending_hospital_review') {
    throw new Error(`Only requests pending review can be accepted (current: ${request.status})`);
  }

  const inventoryItem = (hospital.inventory || []).find(i => i.bloodGroup === request.bloodGroup);
  const availableStock = inventoryItem ? inventoryItem.units : 0;
  let stockResult = {};
  let unitsToIssue = 0;

  // 1. Attempt atomic deduction of the full needed quantity
  const fullUpdated = await Hospital.findOneAndUpdate(
    {
      _id: hospital._id,
      inventory: {
        $elemMatch: { bloodGroup: request.bloodGroup, units: { $gte: request.unitsNeeded } },
      },
    },
    {
      $inc: { 'inventory.$.units': -request.unitsNeeded },
    },
    { new: true }
  );

  if (fullUpdated) {
    unitsToIssue = request.unitsNeeded;
  } else {
    // 2. Full stock unavailable: attempt atomic deduction of available partial stock
    const freshHosp = await Hospital.findById(hospital._id);
    const availableNow = freshHosp?.inventory?.find((i) => i.bloodGroup === request.bloodGroup)?.units || 0;
    const partialToTry = Math.min(availableNow, request.unitsNeeded - 1);

    if (partialToTry > 0) {
      const partialUpdated = await Hospital.findOneAndUpdate(
        {
          _id: hospital._id,
          inventory: {
            $elemMatch: { bloodGroup: request.bloodGroup, units: { $gte: partialToTry } },
          },
        },
        {
          $inc: { 'inventory.$.units': -partialToTry },
        },
        { new: true }
      );
      if (partialUpdated) {
        unitsToIssue = partialToTry;
      }
    }
  }

  if (unitsToIssue === request.unitsNeeded) {
    // Full stock fulfillment
    await InventoryTransaction.create({
      hospital: hospital._id,
      bloodGroup: request.bloodGroup,
      change: -unitsToIssue,
      reason: 'issued',
      request: request._id,
      actor: userId,
      notes: `Fulfilled directly from hospital stock (${unitsToIssue} units of ${request.bloodGroup})`,
    });

    request.unitsFromStock = unitsToIssue;
    request.unitsFulfilled = unitsToIssue;
    request.unitsFromDonors = 0;
    request.status = 'fulfilled';
    request.reviewedAt = new Date();
    await request.save();
    await pingService.cancelPendingPingsForRequest(request._id);

    await Notification.create({
      recipient: request.requester,
      title: '✅ Emergency Blood Request Fulfilled!',
      message: `Hospital has accepted your request and issued all ${unitsToIssue} units of ${request.bloodGroup} directly from blood bank inventory.`,
      type: 'status_update',
      link: `/requests/${request._id}`,
    });

    stockResult = { fulfilled: true, unitsFromStock: unitsToIssue, shortfall: 0 };
  } else if (unitsToIssue > 0) {
    // Partial stock fulfillment
    await InventoryTransaction.create({
      hospital: hospital._id,
      bloodGroup: request.bloodGroup,
      change: -unitsToIssue,
      reason: 'issued',
      request: request._id,
      actor: userId,
      notes: `Partially fulfilled from stock (${unitsToIssue} units of ${request.bloodGroup})`,
    });

    const shortfall = request.unitsNeeded - unitsToIssue;
    request.unitsFromStock = unitsToIssue;
    request.unitsFulfilled = unitsToIssue;
    request.unitsFromDonors = shortfall;
    request.status = 'partially_fulfilled';
    request.reviewedAt = new Date();
    await request.save();

    // Trigger matching for shortfall
    const populated = await BloodRequest.findById(request._id)
      .populate('requester', 'name email phone')
      .populate('targetHospital', 'name location address phone');

    try {
      const notifRes = await notifyMatchedDonorsForRequest(populated);
      if (notifRes && notifRes.count) {
        request.matchedDonorsCount = notifRes.count;
        await request.save();
      }
    } catch (err) {
      console.error('Failed to notify donors for shortfall:', err.message);
    }

    await Notification.create({
      recipient: request.requester,
      title: '🩸 Request Partially Fulfilled — Donors Needed',
      message: `Hospital issued ${unitsToIssue} units from stock. Donor request opened for remaining ${shortfall} units of ${request.bloodGroup}.`,
      type: 'status_update',
      link: `/requests/${request._id}`,
    });

    stockResult = { fulfilled: false, unitsFromStock: unitsToIssue, shortfall };
  } else {
    // Zero stock fulfillment
    request.unitsFromStock = 0;
    request.unitsFulfilled = 0;
    request.unitsFromDonors = request.unitsNeeded;
    request.status = 'open';
    request.reviewedAt = new Date();
    await request.save();

    const populated = await BloodRequest.findById(request._id)
      .populate('requester', 'name email phone')
      .populate('targetHospital', 'name location address phone');

    try {
      const notifRes = await notifyMatchedDonorsForRequest(populated);
      if (notifRes && notifRes.count) {
        request.matchedDonorsCount = notifRes.count;
        await request.save();
      }
    } catch (err) {
      console.error('Failed to notify donors for zero stock:', err.message);
    }

    await Notification.create({
      recipient: request.requester,
      title: '📋 Hospital Approved — Community Donors Needed',
      message: `Hospital approved your request. Stock is currently 0, community donor request opened for ${request.unitsNeeded} units of ${request.bloodGroup}.`,
      type: 'status_update',
      link: `/requests/${request._id}`,
    });

    stockResult = { fulfilled: false, unitsFromStock: 0, shortfall: request.unitsNeeded };
  }

  const refreshedRequest = await BloodRequest.findById(request._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');

  return {
    ...refreshedRequest.toObject(),
    request: refreshedRequest,
    stockResult,
  };
};

/**
 * Hospital rejects request (requires non-empty reason)
 */
const rejectRequest = async (requestId, userId, callerRole, reason) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  if (callerRole !== 'admin') {
    const hospital = await Hospital.findOne({ user: userId });
    const targetHospId = request.targetHospital || request.hospital;
    if (!hospital || !targetHospId || targetHospId.toString() !== hospital._id.toString()) {
      const err = new Error('Unauthorized: Request is not addressed to your hospital');
      err.statusCode = 403;
      throw err;
    }
  }

  if (request.status !== 'pending_hospital_review') {
    throw new Error(`Only requests pending review can be rejected (current: ${request.status})`);
  }

  if (!reason || reason.trim().length < 3) {
    throw new Error('Rejection reason is required and must be at least 3 characters');
  }

  request.status = 'rejected';
  request.rejectionReason = reason.trim();
  request.reviewedAt = new Date();
  await request.save();

  await Notification.create({
    recipient: request.requester,
    title: '❌ Blood Request Rejected by Hospital',
    message: `The hospital could not accept your blood request. Reason: ${reason.trim()}`,
    type: 'status_update',
    link: `/requests/${request._id}`,
  });

  return await request.populate('requester', 'name email phone');
};

/**
 * Issue compatible units manually chosen by hospital
 */
const issueCompatibleUnits = async (requestId, userId, callerRole, compatibleBloodGroup, units) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  let hospital = null;
  if (callerRole === 'admin') {
    hospital = await Hospital.findById(request.targetHospital || request.hospital);
  } else {
    hospital = await Hospital.findOne({ user: userId });
    const targetHospId = request.targetHospital || request.hospital;
    if (!hospital || !targetHospId || targetHospId.toString() !== hospital._id.toString()) {
      const err = new Error('Unauthorized: Request is not addressed to your hospital');
      err.statusCode = 403;
      throw err;
    }
  }

  if (!canDonate(compatibleBloodGroup, request.bloodGroup)) {
    throw new Error(
      `Blood group ${compatibleBloodGroup} is not medically compatible with patient blood group ${request.bloodGroup}`
    );
  }

  const remainingNeeded = request.unitsNeeded - (request.unitsFulfilled || 0);
  if (remainingNeeded <= 0) {
    throw new Error('Request is already completely fulfilled');
  }

  const unitsToDeduct = Math.min(units, remainingNeeded);

  const updated = await Hospital.findOneAndUpdate(
    {
      _id: hospital._id,
      inventory: {
        $elemMatch: { bloodGroup: compatibleBloodGroup, units: { $gte: unitsToDeduct } },
      },
    },
    {
      $inc: { 'inventory.$.units': -unitsToDeduct },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error(`Insufficient stock of compatible ${compatibleBloodGroup} units in hospital inventory`);
  }

  await InventoryTransaction.create({
    hospital: hospital._id,
    bloodGroup: compatibleBloodGroup,
    change: -unitsToDeduct,
    reason: 'compatible_issued',
    request: request._id,
    actor: userId,
    notes: `Issued ${unitsToDeduct} unit(s) of compatible ${compatibleBloodGroup} for patient needing ${request.bloodGroup}`,
  });

  request.unitsFromStock = (request.unitsFromStock || 0) + unitsToDeduct;
  request.unitsFulfilled = (request.unitsFulfilled || 0) + unitsToDeduct;
  if (request.unitsFulfilled >= request.unitsNeeded) {
    request.status = 'fulfilled';
  } else if (['open', 'pending_hospital_review'].includes(request.status)) {
    request.status = 'partially_fulfilled';
  }
  await request.save();

  if (request.status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(request._id);
  }

  await Notification.create({
    recipient: request.requester,
    title: '💉 Compatible Blood Units Issued',
    message: `Hospital has issued ${unitsToDeduct} unit(s) of compatible ${compatibleBloodGroup} for patient ${request.patientName}. Total fulfilled: ${request.unitsFulfilled}/${request.unitsNeeded}.`,
    type: 'status_update',
    link: `/requests/${request._id}`,
  });

  return await BloodRequest.findById(request._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');
};

/**
 * Issue donated / stock blood units to patient
 */
const issuePatientUnits = async (requestId, userId, callerRole, units = 1) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  let hospital = null;
  if (callerRole === 'admin') {
    hospital = await Hospital.findById(request.targetHospital || request.hospital);
  } else {
    hospital = await Hospital.findOne({ user: userId });
    const targetHospId = request.targetHospital || request.hospital;
    if (!hospital || !targetHospId || targetHospId.toString() !== hospital._id.toString()) {
      const err = new Error('Unauthorized: Request is not addressed to your hospital');
      err.statusCode = 403;
      throw err;
    }
  }

  const remainingNeeded = request.unitsNeeded - (request.unitsFulfilled || 0);
  if (remainingNeeded <= 0) {
    throw new Error('Request is already completely fulfilled');
  }

  const unitsToDeduct = Math.min(units, remainingNeeded);

  const updated = await Hospital.findOneAndUpdate(
    {
      _id: hospital._id,
      inventory: {
        $elemMatch: { bloodGroup: request.bloodGroup, units: { $gte: unitsToDeduct } },
      },
    },
    {
      $inc: { 'inventory.$.units': -unitsToDeduct },
    },
    { new: true }
  );

  if (!updated) {
    throw new Error(`Insufficient ${request.bloodGroup} units in hospital inventory to issue to patient`);
  }

  await InventoryTransaction.create({
    hospital: hospital._id,
    bloodGroup: request.bloodGroup,
    change: -unitsToDeduct,
    reason: 'issued_to_patient',
    request: request._id,
    actor: userId,
    notes: `Issued ${unitsToDeduct} unit(s) of ${request.bloodGroup} to patient ${request.patientName}`,
  });

  request.unitsFulfilled = (request.unitsFulfilled || 0) + unitsToDeduct;
  if (request.unitsFulfilled >= request.unitsNeeded) {
    request.status = 'fulfilled';
  }
  await request.save();

  if (request.status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(request._id);
  }

  await Notification.create({
    recipient: request.requester,
    title: '🏥 Blood Units Issued to Patient',
    message: `${unitsToDeduct} unit(s) of ${request.bloodGroup} have been issued to patient ${request.patientName}. Total fulfilled: ${request.unitsFulfilled}/${request.unitsNeeded}.`,
    type: 'status_update',
    link: `/requests/${request._id}`,
  });

  return await BloodRequest.findById(request._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');
};

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  getRequestById,
  updateRequestStatus,
  getIncomingHospitalRequests,
  acceptRequest,
  rejectRequest,
  issueCompatibleUnits,
  issuePatientUnits,
};

