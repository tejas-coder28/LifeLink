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
const {
  ACTIVE_REQUEST_STATUSES,
  INCOMING_REQUEST_STATUSES,
  CLOSED_REQUEST_STATUSES,
  CANCEL_REASONS,
  CANCEL_LABELS,
  isActiveRequest,
  canSeekDonors,
} = require('../utils/statusHelper');
const { formatUnits } = require('../config/bloodUnits');
const pingService = require('./ping.service');
const {
  checkHospitalTimeout,
  getHospitalRequestsBundle,
} = require('./hospitalRequestRules');

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

const getMyRequests = async (callerUser, options = {}) => {
  const candidateDonors = await DonorProfile.find()
    .populate('user', 'name email phone accountType hospitalId');

  if (callerUser.accountType === 'hospital') {
    const callerHospital = await Hospital.findOne({ user: callerUser._id });
    if (!callerHospital) {
      const err = new Error('Hospital profile not found');
      err.statusCode = 404;
      throw err;
    }

    const bundle = await getHospitalRequestsBundle(callerHospital);
    if (options.includeAll) {
      return bundle.allRequests;
    }
    return bundle.activeRequests;
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

  const bundle = await getHospitalRequestsBundle(hospital, { forIncomingEndpoint: true });
  return bundle.incomingDemands;
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

/**
 * Edit blood request:
 * Editable fields: patientName, unitsNeeded, urgency, requiredByDate, notes, address.
 * Disallowed fields: bloodGroup, targetHospital/hospital.
 * Rule: units cannot go below (pledged + received).
 * Logs changed fields in editHistory and notifies donors if urgency/units change.
 */
const editRequest = async (requestId, callerUser, updateData = {}) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check: owning hospital, requester, or admin
  let isAuthorized = false;
  let callerHospitalId = null;
  if (callerUser) {
    if (callerUser.accountType === 'admin') {
      isAuthorized = true;
    } else if (callerUser.accountType === 'hospital') {
      const hospital = await Hospital.findOne({ user: callerUser._id });
      if (hospital) {
        callerHospitalId = hospital._id.toString();
        const targetHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
        if (targetHospId && targetHospId === callerHospitalId) {
          isAuthorized = true;
        }
      }
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    } else {
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    const err = new Error('Unauthorized: Only the owning hospital, requester, or an admin can edit this request');
    err.statusCode = 403;
    throw err;
  }

  if (request.status === 'cancelled' || request.status === 'closed') {
    const err = new Error(`Cannot edit a ${request.status} blood request`);
    err.statusCode = 400;
    throw err;
  }

  // Reject edits to blood group or hospital
  if (updateData.bloodGroup && updateData.bloodGroup !== request.bloodGroup) {
    const err = new Error('Blood group cannot be edited. Please cancel this request and create a new one.');
    err.statusCode = 400;
    throw err;
  }

  const existingHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
  const newTargetHospId = updateData.targetHospital || updateData.hospital || updateData.hospitalId;
  if (newTargetHospId && existingHospId && newTargetHospId.toString() !== existingHospId) {
    const err = new Error('Hospital assignment cannot be edited. Please cancel this request and create a new one.');
    err.statusCode = 400;
    throw err;
  }

  // Check units rule: units cannot go below (pledged + received)
  const activePledges = await Donation.find({ request: requestId, status: 'pledged' });
  const pledgedUnits = activePledges.reduce((sum, p) => sum + (Number(p.unitsDonated) || 1), 0);
  const receivedUnits = Number(request.unitsFulfilled || 0);
  const minAllowedUnits = receivedUnits + pledgedUnits;

  const newUnitsNeeded = updateData.unitsNeeded !== undefined ? Number(updateData.unitsNeeded) : (updateData.unitsRequired !== undefined ? Number(updateData.unitsRequired) : undefined);

  if (newUnitsNeeded !== undefined && newUnitsNeeded < minAllowedUnits) {
    const err = new Error(`Units required cannot be reduced below ${minAllowedUnits} (${receivedUnits} already received + ${pledgedUnits} pledged by donors).`);
    err.statusCode = 400;
    throw err;
  }

  const changedFields = [];
  const updates = {};

  if (updateData.patientName !== undefined && updateData.patientName !== request.patientName) {
    changedFields.push('patientName');
    updates.patientName = updateData.patientName;
  }
  if (newUnitsNeeded !== undefined && newUnitsNeeded !== request.unitsNeeded) {
    changedFields.push('unitsNeeded');
    updates.unitsNeeded = newUnitsNeeded;
    const fromStock = Number(request.unitsFromStock || 0);
    updates.unitsFromDonors = Math.max(0, newUnitsNeeded - fromStock);
  }
  if (updateData.urgency !== undefined && updateData.urgency !== request.urgency) {
    changedFields.push('urgency');
    updates.urgency = updateData.urgency;
  }
  if (updateData.requiredByDate !== undefined && updateData.requiredByDate !== request.requiredByDate) {
    changedFields.push('requiredByDate');
    updates.requiredByDate = updateData.requiredByDate;
  }
  if (updateData.notes !== undefined && updateData.notes !== request.notes) {
    changedFields.push('notes');
    updates.notes = updateData.notes;
  }
  if (updateData.address !== undefined && updateData.address !== request.address) {
    changedFields.push('address');
    updates.address = updateData.address;
  }

  if (changedFields.length > 0) {
    const now = new Date();
    updates.isEdited = true;
    updates.lastEditedAt = now;
    updates.lastEditedBy = callerUser ? callerUser._id.toString() : null;
    updates.editHistory = [
      ...(request.editHistory || []),
      {
        editedBy: callerUser ? callerUser._id.toString() : null,
        editedAt: now,
        changedFields,
      },
    ];
    updates.updatedAt = now;

    await BloodRequest.findByIdAndUpdate(requestId, updates);

    // Audit log
    const AuditLog = require('../repositories/auditLog.repository');
    await AuditLog.record({
      action: 'request_edited',
      targetId: requestId,
      targetType: 'BloodRequest',
      actor: callerUser ? callerUser._id : null,
      actorRole: callerUser ? (callerUser.accountType || callerUser.role) : 'unknown',
      hospitalId: callerHospitalId || existingHospId,
      changedFields,
      metadata: updates,
    });

    // Notify pledged and matched donors if anything other than patientName/notes changed
    const criticalFieldsChanged = changedFields.filter((f) => !['patientName', 'notes', 'address'].includes(f));
    if (criticalFieldsChanged.length > 0) {
      const changeSummaries = [];
      if (updates.unitsNeeded !== undefined) changeSummaries.push(`units required: ${formatUnits(updates.unitsNeeded)}`);
      if (updates.urgency !== undefined) changeSummaries.push(`urgency: ${updates.urgency.toUpperCase()}`);
      if (updates.requiredByDate !== undefined) changeSummaries.push(`required-by date: ${updates.requiredByDate}`);

      const notifMessage = `Request updated: ${changeSummaries.join(', ')}.`;

      for (const p of activePledges) {
        await Notification.create({
          recipient: p.donor,
          title: 'Blood Request Updated',
          message: notifMessage,
          type: 'status_update',
          link: `/donor?tab=history`,
        });
      }

      try {
        const populated = await BloodRequest.findById(requestId)
          .populate('requester', 'name email phone')
          .populate('targetHospital', 'name phone address location');
        await notifyMatchedDonorsForRequest(populated, { customMessage: notifMessage });
      } catch (err) {
        console.error('Failed to notify matched donors on edit:', err.message);
      }
    }
  }

  return await BloodRequest.findById(requestId)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location isVerified');
};

/**
 * Cancel blood request:
 * One atomic transaction following Firestore rules: ALL reads first, compute, ALL writes last.
 * - Releases pending pledges (status -> 'released') without affecting donor cooldown or stats
 * - Returns stock to inventory if units were allocated from hospital stock
 * - Creates donor notifications and audit log
 * - Idempotent: cancelling twice returns friendly 409
 * - Blocked (409) if any pledge is already fulfilled -> offers Close request
 */
const cancelRequest = async (requestId, callerUser, cancelData = {}) => {
  const db = getDb();
  const { reason, note } = cancelData;
  const reasonCode = reason || 'created_by_mistake';
  const friendlyReason = CANCEL_REASONS[reasonCode] || 'created by mistake';

  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check: owning hospital, requester, or admin
  let isAuthorized = false;
  let callerHospitalId = null;
  if (callerUser) {
    if (callerUser.accountType === 'admin') {
      isAuthorized = true;
    } else if (callerUser.accountType === 'hospital') {
      const hospital = await Hospital.findOne({ user: callerUser._id });
      if (hospital) {
        callerHospitalId = hospital._id.toString();
        const targetHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
        if (targetHospId && targetHospId === callerHospitalId) {
          isAuthorized = true;
        }
      }
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    } else {
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    const err = new Error('Unauthorized: Only the owning hospital, requester, or an admin can cancel this request');
    err.statusCode = 403;
    throw err;
  }

  // Idempotent: cancelling twice returns friendly 409
  if (request.status === 'cancelled') {
    const err = new Error('This blood request has already been cancelled.');
    err.statusCode = 409;
    throw err;
  }
  if (request.status === 'closed') {
    const err = new Error('This blood request is closed and cannot be cancelled.');
    err.statusCode = 409;
    throw err;
  }

  // Blocked if any pledge is already fulfilled
  const receivedUnits = Number(request.unitsFulfilled || 0);
  const completedDonations = await Donation.find({
    request: requestId,
    status: { $in: ['completed', 'fulfilled'] },
  });
  if (receivedUnits > 0 || completedDonations.length > 0) {
    const err = new Error('This request cannot be cancelled because donations have already been fulfilled. Please close the request instead to stop new pledges while keeping received units recorded.');
    err.statusCode = 409;
    throw err;
  }

  // Rate-limiting per hospital: maximum 10 cancellations per hour
  const targetHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
  const hospToCheck = callerHospitalId || targetHospId;
  if (hospToCheck && callerUser?.accountType !== 'admin') {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCancels = await BloodRequest.countDocuments({
      targetHospital: hospToCheck,
      status: 'cancelled',
      cancelledAt: { $gte: oneHourAgo },
    });
    if (recentCancels >= 10) {
      const err = new Error('Cancellation rate limit reached for this hospital (maximum 10 cancellations per hour). Please contact platform administration if you need urgent assistance.');
      err.statusCode = 429;
      throw err;
    }
  }

  const activePledges = await Donation.find({ request: requestId, status: 'pledged' });
  const unitsFromStock = Number(request.unitsFromStock || 0);
  const hospitalName = request.hospitalName || request.targetHospital?.name || 'the hospital';

  let stockReturnedUnits = 0;

  // Atomic transaction: ALL reads first, compute, ALL writes last
  await db.runTransaction(async (transaction) => {
    const reqRef = BloodRequest.collection.doc(requestId.toString());
    const hospRef = (unitsFromStock > 0 && targetHospId) ? Hospital.collection.doc(targetHospId) : null;
    const pledgeRefs = activePledges.map((p) => Donation.collection.doc(p._id.toString()));

    // (a) ALL READS FIRST
    const [reqSnap, hospSnap, ...pledgeSnaps] = await Promise.all([
      transaction.get(reqRef),
      hospRef ? transaction.get(hospRef) : Promise.resolve(null),
      ...pledgeRefs.map((r) => transaction.get(r)),
    ]);

    if (!reqSnap.exists) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }
    const currentReq = BloodRequest.normalize(reqSnap);
    if (currentReq.status === 'cancelled') {
      const err = new Error('This blood request has already been cancelled.');
      err.statusCode = 409;
      throw err;
    }
    if (Number(currentReq.unitsFulfilled || 0) > 0) {
      const err = new Error('This request cannot be cancelled because donations have already been fulfilled. Please close the request instead.');
      err.statusCode = 409;
      throw err;
    }

    // (b) COMPUTE IN PLAIN JS
    const now = new Date();
    const reqUpdates = {
      status: 'cancelled',
      cancelReason: reasonCode,
      cancelReasonLabel: CANCEL_LABELS[reasonCode] || reasonCode,
      cancelInternalNote: (note || '').slice(0, 200),
      cancelledAt: now,
      cancelledBy: callerUser ? callerUser._id.toString() : null,
      updatedAt: now,
    };

    // Return stock if units were allocated from stock
    let newInventory = null;
    let invTxDocRef = null;
    let invTxPayload = null;
    if (hospRef && hospSnap && hospSnap.exists && unitsFromStock > 0) {
      const hospData = Hospital.normalize(hospSnap);
      const inventory = hospData.inventory ? [...hospData.inventory] : [];
      const itemIndex = inventory.findIndex((i) => i.bloodGroup === currentReq.bloodGroup);
      if (itemIndex !== -1) {
        inventory[itemIndex] = {
          ...inventory[itemIndex],
          units: (Number(inventory[itemIndex].units) || 0) + unitsFromStock,
        };
      } else {
        inventory.push({ bloodGroup: currentReq.bloodGroup, units: unitsFromStock });
      }
      newInventory = inventory;
      reqUpdates.unitsFromStock = 0;
      stockReturnedUnits = unitsFromStock;

      invTxDocRef = InventoryTransaction.collection.doc();
      invTxPayload = {
        hospital: hospRef.id,
        bloodGroup: currentReq.bloodGroup,
        change: unitsFromStock,
        reason: 'cancelled_request_returned',
        request: currentReq._id,
        actor: callerUser ? callerUser._id.toString() : null,
        notes: `Returned ${unitsFromStock} unit(s) to hospital stock after request was cancelled (${reasonCode})`,
        createdAt: now,
        updatedAt: now,
      };
    }

    // Pending pledges released
    const pledgeUpdates = [];
    const notifications = [];

    for (let i = 0; i < pledgeRefs.length; i++) {
      const pRef = pledgeRefs[i];
      const pSnap = pledgeSnaps[i];
      if (pSnap && pSnap.exists) {
        const pData = Donation.normalize(pSnap);
        if (pData.status === 'pledged') {
          pledgeUpdates.push({
            ref: pRef,
            data: {
              status: 'released',
              releasedReason: 'request_cancelled',
              releasedAt: now,
              updatedAt: now,
            },
          });

          // Pledged donor notification
          const notifRef = Notification.collection.doc();
          notifications.push({
            ref: notifRef,
            data: {
              recipient: pData.donor,
              title: 'Request Cancelled',
              message: `Request cancelled by ${hospitalName}. Sorry for the confusion - your pledge was released and your eligibility is unchanged. Thank you for being ready to help.`,
              type: 'status_update',
              link: '/donor?tab=history',
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      }
    }

    // (c) ALL WRITES LAST
    transaction.update(reqRef, reqUpdates);
    for (const pu of pledgeUpdates) {
      transaction.update(pu.ref, pu.data);
    }
    if (hospRef && newInventory) {
      transaction.update(hospRef, { inventory: newInventory, updatedAt: now });
      if (invTxDocRef && invTxPayload) {
        transaction.set(invTxDocRef, invTxPayload);
      }
    }
    for (const n of notifications) {
      transaction.set(n.ref, n.data);
    }
  });

  // Post-transaction
  await pingService.cancelPendingPingsForRequest(requestId);

  // Notify matched-only donors (never expose internal note; show friendly mapped reason)
  try {
    const candidateDonors = await DonorProfile.find().populate('user', 'name email');
    const matchedDonors = rankDonorsForRequest(request, candidateDonors);
    const pledgedDonorIds = new Set(activePledges.map((p) => p.donor?.toString()));
    for (const match of matchedDonors) {
      const dUserId = (match.donor?.user?._id || match.donor?.user || match.donor?._id)?.toString();
      if (dUserId && !pledgedDonorIds.has(dUserId)) {
        await Notification.create({
          recipient: dUserId,
          title: 'Blood Request Withdrawn',
          message: 'A request you were matched to has been withdrawn.',
          type: 'status_update',
          link: '/donor?tab=requests',
        });
      }
    }
  } catch (err) {
    console.error('Failed to notify matched donors on cancel:', err.message);
  }

  // Record audit log
  const AuditLog = require('../repositories/auditLog.repository');
  await AuditLog.record({
    action: 'request_cancelled',
    targetId: requestId,
    targetType: 'BloodRequest',
    actor: callerUser ? callerUser._id : null,
    actorRole: callerUser ? (callerUser.accountType || callerUser.role) : 'unknown',
    hospitalId: targetHospId || callerHospitalId,
    reasonCode,
    note: (note || '').slice(0, 200),
    metadata: {
      pledgesReleased: activePledges.length,
      stockReturned: stockReturnedUnits,
    },
  });

  return {
    success: true,
    message: `Blood request cancelled successfully. ${activePledges.length} active pledge(s) released.${stockReturnedUnits > 0 ? ` ${stockReturnedUnits} unit(s) returned to hospital stock.` : ''}`,
    stockReturned: stockReturnedUnits,
    pledgesReleased: activePledges.length,
  };
};

/**
 * Close blood request:
 * For requests with fulfilled pledges where new pledges are stopped.
 */
const closeRequest = async (requestId, callerUser, note = '') => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check
  let isAuthorized = false;
  if (callerUser) {
    if (callerUser.accountType === 'admin') {
      isAuthorized = true;
    } else if (callerUser.accountType === 'hospital') {
      const hospital = await Hospital.findOne({ user: callerUser._id });
      const targetHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
      if (hospital && targetHospId && targetHospId === hospital._id.toString()) {
        isAuthorized = true;
      }
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    } else {
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    const err = new Error('Unauthorized: Only the owning hospital, requester, or an admin can close this request');
    err.statusCode = 403;
    throw err;
  }

  if (request.status === 'closed') {
    const err = new Error('This blood request is already closed.');
    err.statusCode = 409;
    throw err;
  }
  if (request.status === 'cancelled') {
    const err = new Error('This blood request is cancelled and cannot be closed.');
    err.statusCode = 409;
    throw err;
  }

  const now = new Date();
  request.status = 'closed';
  request.closedAt = now;
  request.closedBy = callerUser ? callerUser._id.toString() : null;
  request.closeNote = (note || '').slice(0, 200);
  request.updatedAt = now;
  await request.save();

  // Release any remaining pending pledges
  const activePledges = await Donation.find({ request: requestId, status: 'pledged' });
  const hospitalName = request.hospitalName || request.targetHospital?.name || 'the hospital';
  for (const p of activePledges) {
    await Donation.findByIdAndUpdate(p._id, {
      status: 'released',
      releasedReason: 'request_closed',
      releasedAt: now,
    });
    await Notification.create({
      recipient: p.donor,
      title: 'Request Closed',
      message: `Request closed by ${hospitalName}. Your pledge was released and your eligibility is unchanged. Thank you for being ready to help.`,
      type: 'status_update',
      link: '/donor?tab=history',
    });
  }

  await pingService.cancelPendingPingsForRequest(requestId);

  const AuditLog = require('../repositories/auditLog.repository');
  await AuditLog.record({
    action: 'request_closed',
    targetId: requestId,
    targetType: 'BloodRequest',
    actor: callerUser ? callerUser._id : null,
    actorRole: callerUser ? (callerUser.accountType || callerUser.role) : 'unknown',
    hospitalId: request.targetHospital || request.hospital,
    note: (note || '').slice(0, 200),
    metadata: {
      unitsFulfilled: request.unitsFulfilled || 0,
      pledgesReleased: activePledges.length,
    },
  });

  return await BloodRequest.findById(requestId)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location isVerified');
};

/**
 * Undo-create / Delete request:
 * If request created < 5 minutes ago AND has 0 donor pledges -> hard-deletes it and notifications.
 * Otherwise rejected (400) and user must cancel instead. (Admin bypass allowed).
 */
const deleteRequest = async (requestId, callerUser) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    if (callerUser && callerUser.accountType !== 'admin') {
      const err = new Error('Unauthorized: Only the owning hospital, requester, or an admin can delete this request');
      err.statusCode = 403;
      throw err;
    }
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check: admin, owning hospital, or requester
  let isAuthorized = false;
  let callerHospitalId = null;
  if (callerUser) {
    if (callerUser.accountType === 'admin') {
      isAuthorized = true;
    } else if (callerUser.accountType === 'hospital') {
      const hospital = await Hospital.findOne({ user: callerUser._id });
      if (hospital) {
        callerHospitalId = hospital._id.toString();
        const targetHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
        if (targetHospId && targetHospId === callerHospitalId) {
          isAuthorized = true;
        }
      }
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    } else {
      if (request.requester && request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    const err = new Error('Unauthorized: Only the owning hospital, requester, or an admin can delete this request');
    err.statusCode = 403;
    throw err;
  }

  // Non-admins must be within 5-minute grace period and have 0 pledges
  if (callerUser?.accountType !== 'admin') {
    const elapsedMs = Date.now() - new Date(request.createdAt).getTime();
    const isWithinGracePeriod = elapsedMs < 5 * 60 * 1000;
    const pledges = await Donation.find({ request: requestId });

    if (!isWithinGracePeriod || pledges.length > 0) {
      const err = new Error('Requests created more than 5 minutes ago or with existing donor pledges cannot be deleted. Please cancel the request instead.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Hard delete request
  await BloodRequest.findByIdAndDelete(requestId);

  // Hard delete notifications linked to this request
  try {
    const notifs = await Notification.find();
    for (const n of notifs) {
      if (n.link && n.link.includes(requestId.toString())) {
        await Notification.findByIdAndDelete(n._id);
      }
    }
  } catch (err) {
    console.error('Failed to clean up notifications for deleted request:', err.message);
  }

  // Cancel/delete pings
  await pingService.cancelPendingPingsForRequest(requestId);

  const AuditLog = require('../repositories/auditLog.repository');
  await AuditLog.record({
    action: 'request_deleted',
    targetId: requestId,
    targetType: 'BloodRequest',
    actor: callerUser ? callerUser._id : null,
    actorRole: callerUser ? (callerUser.accountType || callerUser.role) : 'unknown',
    hospitalId: callerHospitalId || request.targetHospital,
    metadata: {
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
    },
  });

  return { success: true, message: 'Blood request and its notifications deleted successfully' };
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
  editRequest,
  cancelRequest,
  closeRequest,
  deleteRequest,
};
