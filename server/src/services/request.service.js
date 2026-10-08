const BloodRequest = require('../repositories/bloodRequest.repository');
const Hospital = require('../repositories/hospital.repository');
const User = require('../repositories/user.repository');
const Donation = require('../repositories/donation.repository');
const InventoryTransaction = require('../repositories/inventoryTransaction.repository');
const Notification = require('../repositories/notification.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const { getDb } = require('../config/db');
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
    unitsNeeded: Number(unitsNeeded) || 1,
    unitsFromStock: 0,
    unitsFromDonors: initialStatus === 'pending_hospital_review' ? 0 : (Number(unitsNeeded) || 1),
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
      await BloodRequest.findByIdAndUpdate(req._id, { matchedDonorsCount: matches.length });
    }
    updatedRequests.push(timedReq);
  }

  // Enforce donor list visibility: only requests where canSeekDonors is true should appear
  if ((isDonorCaller || filters.forDonor) && !filters.status) {
    return updatedRequests.filter((req) => canSeekDonors(req));
  }

  return updatedRequests;
};

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
        await BloodRequest.findByIdAndUpdate(req._id, { matchedDonorsCount: matches.length });
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
      await BloodRequest.findByIdAndUpdate(req._id, { matchedDonorsCount: matches.length });
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
    await BloodRequest.findByIdAndUpdate(request._id, { matchedDonorsCount: matches.length });
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
      await BloodRequest.findByIdAndUpdate(r._id, { matchedDonorsCount: matches.length });
    }
    updatedRequests.push(timedReq);
  }

  // Fetch all pledges for these requests to display live in dashboard
  const requestIds = updatedRequests.map(r => r._id);
  let donations = [];
  if (requestIds.length > 0) {
    donations = await Donation.find({ request: { $in: requestIds } })
      .populate('donor', 'name email phone')
      .populate('donorProfile');
  }

  const donationsByRequestId = {};
  donations.forEach(d => {
    const rId = (d.request?._id || d.request).toString();
    if (!donationsByRequestId[rId]) donationsByRequestId[rId] = [];
    donationsByRequestId[rId].push(d);
  });

  return updatedRequests.map(r => {
    const rObj = typeof r.toObject === 'function' ? r.toObject() : { ...r };
    rObj.donations = donationsByRequestId[r._id.toString()] || [];
    return rObj;
  });
};

/**
 * Hospital accepts request:
 * Atomic Firestore transaction ensures no negative stock and prevents double-fulfillment.
 */
const acceptRequest = async (requestId, userId, callerRole) => {
  const db = getDb();

  const txResult = await db.runTransaction(async (transaction) => {
    const reqRef = BloodRequest.collection.doc(requestId.toString());
    const reqSnap = await transaction.get(reqRef);
    if (!reqSnap.exists) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }
    const requestData = BloodRequest.normalize(reqSnap);

    const targetHospId = requestData.targetHospital || requestData.hospital;
    if (!targetHospId) {
      throw new Error('Request has no assigned target hospital');
    }

    const hospRef = Hospital.collection.doc(targetHospId.toString());
    const hospSnap = await transaction.get(hospRef);
    if (!hospSnap.exists) {
      throw new Error('Target hospital not found');
    }
    const hospital = Hospital.normalize(hospSnap);

    if (callerRole !== 'admin') {
      if (hospital.user && hospital.user.toString() !== userId.toString()) {
        const err = new Error('Unauthorized: Request is not addressed to your hospital');
        err.statusCode = 403;
        throw err;
      }
    }

    if (requestData.status !== 'pending_hospital_review') {
      throw new Error(`Only requests pending review can be accepted (current: ${requestData.status})`);
    }

    const inventory = hospital.inventory ? [...hospital.inventory] : [];
    const itemIndex = inventory.findIndex(i => i.bloodGroup === requestData.bloodGroup);
    const availableStock = itemIndex !== -1 ? (Number(inventory[itemIndex].units) || 0) : 0;

    let unitsToIssue = 0;
    if (availableStock >= requestData.unitsNeeded) {
      unitsToIssue = requestData.unitsNeeded;
    } else if (availableStock > 0) {
      unitsToIssue = availableStock;
    }

    // Atomic deduction: non-negative inventory guaranteed
    if (unitsToIssue > 0 && itemIndex !== -1) {
      inventory[itemIndex] = {
        ...inventory[itemIndex],
        units: availableStock - unitsToIssue,
      };
      transaction.update(hospRef, {
        inventory,
        updatedAt: new Date(),
      });
    }

    const now = new Date();
    let newStatus = 'open';
    let shortfall = requestData.unitsNeeded;

    if (unitsToIssue === requestData.unitsNeeded) {
      newStatus = 'fulfilled';
      shortfall = 0;
    } else if (unitsToIssue > 0) {
      newStatus = 'partially_fulfilled';
      shortfall = requestData.unitsNeeded - unitsToIssue;
    }

    const reqUpdates = {
      unitsFromStock: unitsToIssue,
      unitsFulfilled: unitsToIssue,
      unitsFromDonors: shortfall,
      status: newStatus,
      reviewedAt: now,
      updatedAt: now,
    };
    transaction.update(reqRef, reqUpdates);

    if (unitsToIssue > 0) {
      const txRef = InventoryTransaction.collection.doc();
      transaction.set(txRef, {
        hospital: hospital._id,
        bloodGroup: requestData.bloodGroup,
        change: -unitsToIssue,
        reason: 'issued',
        request: requestData._id,
        actor: userId,
        notes: unitsToIssue === requestData.unitsNeeded
          ? `Fulfilled directly from hospital stock (${unitsToIssue} units of ${requestData.bloodGroup})`
          : `Partially fulfilled from stock (${unitsToIssue} units of ${requestData.bloodGroup})`,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      request: { ...requestData, ...reqUpdates },
      hospital,
      unitsToIssue,
      shortfall,
      newStatus,
    };
  });

  const { unitsToIssue, shortfall, newStatus } = txResult;
  let stockResult = {};

  if (unitsToIssue === txResult.request.unitsNeeded) {
    await pingService.cancelPendingPingsForRequest(txResult.request._id);

    await Notification.create({
      recipient: txResult.request.requester,
      title: '✅ Emergency Blood Request Fulfilled!',
      message: `Hospital has accepted your request and issued all ${unitsToIssue} units of ${txResult.request.bloodGroup} directly from blood bank inventory.`,
      type: 'status_update',
      link: `/requests/${txResult.request._id}`,
    });

    stockResult = { fulfilled: true, unitsFromStock: unitsToIssue, shortfall: 0 };
  } else if (unitsToIssue > 0) {
    // Partial stock fulfillment: notify donors for remaining units
    const populated = await BloodRequest.findById(txResult.request._id)
      .populate('requester', 'name email phone')
      .populate('targetHospital', 'name location address phone');

    try {
      const notifRes = await notifyMatchedDonorsForRequest(populated);
      if (notifRes && notifRes.count) {
        await BloodRequest.findByIdAndUpdate(txResult.request._id, { matchedDonorsCount: notifRes.count });
      }
    } catch (err) {
      console.error('Failed to notify donors for partial shortfall:', err.message);
    }

    await Notification.create({
      recipient: txResult.request.requester,
      title: '⚡ Blood Request Partially Fulfilled by Hospital',
      message: `Hospital has issued ${unitsToIssue} unit(s) of ${txResult.request.bloodGroup} from blood bank inventory. Remaining ${shortfall} unit(s) routed to nearby volunteer donors.`,
      type: 'status_update',
      link: `/requests/${txResult.request._id}`,
    });

    stockResult = { fulfilled: false, unitsFromStock: unitsToIssue, shortfall };
  } else {
    // Zero stock: full donor outreach
    const populated = await BloodRequest.findById(txResult.request._id)
      .populate('requester', 'name email phone')
      .populate('targetHospital', 'name location address phone');

    try {
      const notifRes = await notifyMatchedDonorsForRequest(populated);
      if (notifRes && notifRes.count) {
        await BloodRequest.findByIdAndUpdate(txResult.request._id, { matchedDonorsCount: notifRes.count });
      }
    } catch (err) {
      console.error('Failed to notify donors on accept:', err.message);
    }

    await Notification.create({
      recipient: txResult.request.requester,
      title: '🚨 Hospital Accepted Request — Seeking Donors',
      message: `Hospital confirmed your emergency request. Blood reserves are currently empty for ${txResult.request.bloodGroup}; donor network outreach is active.`,
      type: 'status_update',
      link: `/requests/${txResult.request._id}`,
    });

    stockResult = { fulfilled: false, unitsFromStock: 0, shortfall: txResult.request.unitsNeeded };
  }

  const refreshedRequest = await BloodRequest.findById(txResult.request._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');

  const plainRefreshed = typeof refreshedRequest.toObject === 'function' ? refreshedRequest.toObject() : refreshedRequest;

  return {
    ...plainRefreshed,
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
 * Issue compatible units manually chosen by hospital (Atomic transaction)
 */
const issueCompatibleUnits = async (requestId, userId, callerRole, compatibleBloodGroup, units) => {
  const db = getDb();

  await db.runTransaction(async (transaction) => {
    const reqRef = BloodRequest.collection.doc(requestId.toString());
    const reqSnap = await transaction.get(reqRef);
    if (!reqSnap.exists) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }
    const requestData = BloodRequest.normalize(reqSnap);

    const targetHospId = requestData.targetHospital || requestData.hospital;
    const hospRef = Hospital.collection.doc(targetHospId.toString());
    const hospSnap = await transaction.get(hospRef);
    if (!hospSnap.exists) {
      throw new Error('Target hospital not found');
    }
    const hospData = Hospital.normalize(hospSnap);

    if (callerRole !== 'admin') {
      if (hospData.user && hospData.user.toString() !== userId.toString()) {
        const err = new Error('Unauthorized: Request is not addressed to your hospital');
        err.statusCode = 403;
        throw err;
      }
    }

    if (!canDonate(compatibleBloodGroup, requestData.bloodGroup)) {
      throw new Error(
        `Blood group ${compatibleBloodGroup} is not medically compatible with patient blood group ${requestData.bloodGroup}`
      );
    }

    const remainingNeeded = requestData.unitsNeeded - (requestData.unitsFulfilled || 0);
    if (remainingNeeded <= 0) {
      throw new Error('Request is already completely fulfilled');
    }

    const unitsToDeduct = Math.min(units, remainingNeeded);

    const inventory = hospData.inventory ? [...hospData.inventory] : [];
    const itemIndex = inventory.findIndex(i => i.bloodGroup === compatibleBloodGroup);
    const availableStock = itemIndex !== -1 ? (Number(inventory[itemIndex].units) || 0) : 0;

    if (availableStock < unitsToDeduct) {
      throw new Error(`Insufficient stock of compatible ${compatibleBloodGroup} units in hospital inventory`);
    }

    inventory[itemIndex] = {
      ...inventory[itemIndex],
      units: availableStock - unitsToDeduct,
    };
    transaction.update(hospRef, { inventory, updatedAt: new Date() });

    const now = new Date();
    const newFulfilled = (requestData.unitsFulfilled || 0) + unitsToDeduct;
    const newFromStock = (requestData.unitsFromStock || 0) + unitsToDeduct;
    let newStatus = requestData.status;
    if (newFulfilled >= requestData.unitsNeeded) {
      newStatus = 'fulfilled';
    } else if (['open', 'pending_hospital_review'].includes(requestData.status)) {
      newStatus = 'partially_fulfilled';
    }

    transaction.update(reqRef, {
      unitsFromStock: newFromStock,
      unitsFulfilled: newFulfilled,
      status: newStatus,
      updatedAt: now,
    });

    const txRef = InventoryTransaction.collection.doc();
    transaction.set(txRef, {
      hospital: hospData._id,
      bloodGroup: compatibleBloodGroup,
      change: -unitsToDeduct,
      reason: 'compatible_issued',
      request: requestData._id,
      actor: userId,
      notes: `Issued ${unitsToDeduct} unit(s) of compatible ${compatibleBloodGroup} for patient needing ${requestData.bloodGroup}`,
      createdAt: now,
      updatedAt: now,
    });
  });

  const updatedRequest = await BloodRequest.findById(requestId);
  if (updatedRequest.status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(updatedRequest._id);
  }

  await Notification.create({
    recipient: updatedRequest.requester,
    title: '💉 Compatible Blood Units Issued',
    message: `Hospital has issued ${units} unit(s) of compatible ${compatibleBloodGroup} for patient ${updatedRequest.patientName}. Total fulfilled: ${updatedRequest.unitsFulfilled}/${updatedRequest.unitsNeeded}.`,
    type: 'status_update',
    link: `/requests/${updatedRequest._id}`,
  });

  return await BloodRequest.findById(updatedRequest._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');
};

/**
 * Issue donated / stock blood units to patient (Atomic transaction)
 */
const issuePatientUnits = async (requestId, userId, callerRole, units = 1) => {
  const db = getDb();

  await db.runTransaction(async (transaction) => {
    const reqRef = BloodRequest.collection.doc(requestId.toString());
    const reqSnap = await transaction.get(reqRef);
    if (!reqSnap.exists) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }
    const requestData = BloodRequest.normalize(reqSnap);

    const targetHospId = requestData.targetHospital || requestData.hospital;
    const hospRef = Hospital.collection.doc(targetHospId.toString());
    const hospSnap = await transaction.get(hospRef);
    if (!hospSnap.exists) {
      throw new Error('Target hospital not found');
    }
    const hospData = Hospital.normalize(hospSnap);

    if (callerRole !== 'admin') {
      if (hospData.user && hospData.user.toString() !== userId.toString()) {
        const err = new Error('Unauthorized: Request is not addressed to your hospital');
        err.statusCode = 403;
        throw err;
      }
    }

    const remainingNeeded = requestData.unitsNeeded - (requestData.unitsFulfilled || 0);
    if (remainingNeeded <= 0) {
      throw new Error('Request is already completely fulfilled');
    }

    const unitsToDeduct = Math.min(units, remainingNeeded);

    const inventory = hospData.inventory ? [...hospData.inventory] : [];
    const itemIndex = inventory.findIndex(i => i.bloodGroup === requestData.bloodGroup);
    const availableStock = itemIndex !== -1 ? (Number(inventory[itemIndex].units) || 0) : 0;

    if (availableStock < unitsToDeduct) {
      throw new Error(`Insufficient ${requestData.bloodGroup} units in hospital inventory to issue to patient`);
    }

    inventory[itemIndex] = {
      ...inventory[itemIndex],
      units: availableStock - unitsToDeduct,
    };
    transaction.update(hospRef, { inventory, updatedAt: new Date() });

    const now = new Date();
    const newFulfilled = (requestData.unitsFulfilled || 0) + unitsToDeduct;
    let newStatus = requestData.status;
    if (newFulfilled >= requestData.unitsNeeded) {
      newStatus = 'fulfilled';
    }

    transaction.update(reqRef, {
      unitsFulfilled: newFulfilled,
      status: newStatus,
      updatedAt: now,
    });

    const txRef = InventoryTransaction.collection.doc();
    transaction.set(txRef, {
      hospital: hospData._id,
      bloodGroup: requestData.bloodGroup,
      change: -unitsToDeduct,
      reason: 'issued_to_patient',
      request: requestData._id,
      actor: userId,
      notes: `Issued ${unitsToDeduct} unit(s) of ${requestData.bloodGroup} to patient ${requestData.patientName}`,
      createdAt: now,
      updatedAt: now,
    });
  });

  const updatedRequest = await BloodRequest.findById(requestId);
  if (updatedRequest.status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(updatedRequest._id);
  }

  await Notification.create({
    recipient: updatedRequest.requester,
    title: '🏥 Blood Units Issued to Patient',
    message: `${units} unit(s) of ${updatedRequest.bloodGroup} have been issued to patient ${updatedRequest.patientName}. Total fulfilled: ${updatedRequest.unitsFulfilled}/${updatedRequest.unitsNeeded}.`,
    type: 'status_update',
    link: `/requests/${updatedRequest._id}`,
  });

  return await BloodRequest.findById(updatedRequest._id)
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
