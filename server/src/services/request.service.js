const BloodRequest = require('../repositories/bloodRequest.repository');
const Hospital = require('../repositories/hospital.repository');
const User = require('../repositories/user.repository');
const Donation = require('../repositories/donation.repository');
const InventoryTransaction = require('../repositories/inventoryTransaction.repository');
const Notification = require('../repositories/notification.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const DonorRequestPing = require('../repositories/donorRequestPing.repository');
const AuditLog = require('../repositories/auditLog.repository');
const { withTransaction } = require('../config/mongo');
const { notifyMatchedDonorsForRequest } = require('./notification.service');
const { canDonate } = require('../utils/bloodCompatibility');
const { rankDonorsForRequest } = require('./matching.service');
const {
  CANCEL_REASONS,
  CANCEL_LABELS,
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

  const { bloodRequest, initialStatus } = await withTransaction(async (session) => {
    const requester = await User.findById(userId, session).select('accountType name');
    const targetHospitalInput = targetHospital || hospitalId;
    let targetHospitalDoc = null;
    let status = 'open';

    if (requester && requester.accountType === 'hospital') {
      const hospitalProfile = await Hospital.findOne({ user: userId }, session).select('isVerified name location address phone');
      if (!hospitalProfile || !hospitalProfile.isVerified) {
        throw new Error(
          'Your hospital account is pending admin approval. You cannot post blood requests until verified.'
        );
      }
      targetHospitalDoc = hospitalProfile;
      status = 'open';
    } else {
      if (!targetHospitalInput) {
        const err = new Error('Target hospital is required for emergency blood requests');
        err.statusCode = 400;
        throw err;
      }
      targetHospitalDoc = await Hospital.findById(targetHospitalInput, session).populate('user', 'email name');
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
      status = 'pending_hospital_review';
    }

    const reqCoordinates = targetHospitalDoc?.location?.coordinates || coordinates || [77.2090, 28.6139];
    const reqAddress = targetHospitalDoc ? (targetHospitalDoc.address || targetHospitalDoc.name) : address;

    const createdReq = await BloodRequest.create(
      {
        requester: userId,
        targetHospital: targetHospitalDoc ? targetHospitalDoc._id : null,
        hospital: targetHospitalDoc ? targetHospitalDoc._id : null,
        patientName,
        bloodGroup,
        unitsNeeded: Number(unitsNeeded) || 1,
        unitsFromStock: 0,
        unitsFromDonors: status === 'pending_hospital_review' ? 0 : (Number(unitsNeeded) || 1),
        unitsFulfilled: 0,
        urgency: urgency || 'high',
        address: reqAddress,
        location: {
          type: 'Point',
          coordinates: reqCoordinates,
        },
        requiredByDate: requiredByDate ? new Date(requiredByDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: notes || '',
        status,
      },
      session
    );

    if (status === 'pending_hospital_review' && targetHospitalDoc && targetHospitalDoc.user) {
      const hospitalUserRecipient = targetHospitalDoc.user._id || targetHospitalDoc.user;
      await Notification.create(
        {
          recipient: hospitalUserRecipient,
          title: `🚨 New Emergency Blood Request: ${bloodGroup} Needed`,
          message: `New request for ${patientName} (${unitsNeeded} units, ${urgency?.toUpperCase() || 'HIGH'} urgency) is awaiting your hospital's review.`,
          type: 'request_match',
          link: `/hospital?tab=requests`,
        },
        session
      );
    }

    return { bloodRequest: createdReq, initialStatus: status };
  });

  const populatedRequest = await bloodRequest.populate([
    { path: 'requester', select: 'name email phone' },
    { path: 'targetHospital', select: 'name address phone location isVerified' },
  ]);

  if (initialStatus !== 'pending_hospital_review') {
    try {
      const notificationResult = await notifyMatchedDonorsForRequest(populatedRequest);
      if (notificationResult && notificationResult.count) {
        bloodRequest.matchedDonorsCount = notificationResult.count;
        await BloodRequest.findByIdAndUpdate(bloodRequest._id, { matchedDonorsCount: notificationResult.count });
      }
    } catch (err) {
      console.error('Failed to notify donors:', err.message);
    }
  }

  return await BloodRequest.findById(bloodRequest._id).populate([
    { path: 'requester', select: 'name email phone' },
    { path: 'targetHospital', select: 'name address phone location isVerified' },
  ]);
};

const getRequests = async (filters = {}, callerUser = null) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.bloodGroup) query.bloodGroup = filters.bloodGroup;
  if (filters.requesterId) query.requester = filters.requesterId;
  if (filters.urgency) query.urgency = filters.urgency;
  if (filters.targetHospital) query.targetHospital = filters.targetHospital;

  if (!callerUser || callerUser.accountType !== 'admin') {
    if (!query.status) {
      query.status = { $ne: 'legacy' };
    }
  }

  if (callerUser && callerUser.accountType === 'hospital') {
    const callerHospital = await Hospital.findOne({ user: callerUser._id });
    if (callerHospital) {
      query.targetHospital = callerHospital._id;
    }
  }

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

  if (request.status === 'legacy' && (!callerUser || callerUser.accountType !== 'admin')) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

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
 * Atomic MongoDB transaction ensures non-negative stock deduction and status transition.
 */
const acceptRequest = async (requestId, userId, callerRole) => {
  const txResult = await withTransaction(async (session) => {
    const requestData = await BloodRequest.findById(requestId, session);
    if (!requestData) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    const targetHospId = requestData.targetHospital || requestData.hospital;
    if (!targetHospId) {
      throw new Error('Request has no assigned target hospital');
    }

    const hospital = await Hospital.findById(targetHospId, session);
    if (!hospital) {
      throw new Error('Target hospital not found');
    }

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
    const itemIndex = inventory.findIndex((i) => i.bloodGroup === requestData.bloodGroup);
    const availableStock = itemIndex !== -1 ? (Number(inventory[itemIndex].units) || 0) : 0;

    let unitsToIssue = 0;
    if (availableStock >= requestData.unitsNeeded) {
      unitsToIssue = requestData.unitsNeeded;
    } else if (availableStock > 0) {
      unitsToIssue = availableStock;
    }

    if (unitsToIssue > 0) {
      await Hospital.deductStock(hospital._id, requestData.bloodGroup, unitsToIssue, session);
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

    const updatedReq = await BloodRequest.findByIdAndUpdate(
      requestId,
      {
        unitsFromStock: unitsToIssue,
        unitsFulfilled: unitsToIssue,
        unitsFromDonors: shortfall,
        status: newStatus,
        reviewedAt: now,
        updatedAt: now,
      },
      {},
      session
    );

    if (unitsToIssue > 0) {
      await InventoryTransaction.create(
        {
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
        },
        session
      );
    }

    return {
      request: updatedReq,
      hospital,
      unitsToIssue,
      shortfall,
      newStatus,
    };
  });

  const { unitsToIssue, shortfall } = txResult;
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

  const updated = await BloodRequest.findByIdAndUpdate(requestId, {
    status: 'rejected',
    rejectionReason: reason.trim(),
    reviewedAt: new Date(),
  });

  await Notification.create({
    recipient: request.requester,
    title: '❌ Blood Request Rejected by Hospital',
    message: `The hospital could not accept your blood request. Reason: ${reason.trim()}`,
    type: 'status_update',
    link: `/requests/${request._id}`,
  });

  return await updated.populate('requester', 'name email phone');
};

/**
 * Issue compatible units manually chosen by hospital (Atomic MongoDB transaction)
 */
const issueCompatibleUnits = async (requestId, userId, callerRole, compatibleBloodGroup, units) => {
  const updatedReq = await withTransaction(async (session) => {
    const requestData = await BloodRequest.findById(requestId, session);
    if (!requestData) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    const targetHospId = requestData.targetHospital || requestData.hospital;
    const hospData = targetHospId ? await Hospital.findById(targetHospId, session) : null;
    if (!hospData) {
      throw new Error('Target hospital not found');
    }

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
    const itemIndex = inventory.findIndex((i) => i.bloodGroup === compatibleBloodGroup);
    const availableStock = itemIndex !== -1 ? (Number(inventory[itemIndex].units) || 0) : 0;

    if (availableStock < unitsToDeduct) {
      throw new Error(`Insufficient stock of compatible ${compatibleBloodGroup} units in hospital inventory`);
    }

    await Hospital.deductStock(hospData._id, compatibleBloodGroup, unitsToDeduct, session);

    const now = new Date();
    const newFulfilled = (requestData.unitsFulfilled || 0) + unitsToDeduct;
    const newFromStock = (requestData.unitsFromStock || 0) + unitsToDeduct;
    let newStatus = requestData.status;
    if (newFulfilled >= requestData.unitsNeeded) {
      newStatus = 'fulfilled';
    } else if (['open', 'pending_hospital_review'].includes(requestData.status)) {
      newStatus = 'partially_fulfilled';
    }

    const reqUpdated = await BloodRequest.findByIdAndUpdate(
      requestId,
      {
        unitsFromStock: newFromStock,
        unitsFulfilled: newFulfilled,
        status: newStatus,
        updatedAt: now,
      },
      {},
      session
    );

    await InventoryTransaction.create(
      {
        hospital: hospData._id,
        bloodGroup: compatibleBloodGroup,
        change: -unitsToDeduct,
        reason: 'compatible_issued',
        request: requestData._id,
        actor: userId,
        notes: `Issued ${unitsToDeduct} unit(s) of compatible ${compatibleBloodGroup} for patient needing ${requestData.bloodGroup}`,
        createdAt: now,
        updatedAt: now,
      },
      session
    );

    await Notification.create(
      {
        recipient: requestData.requester,
        title: '💉 Compatible Blood Units Issued',
        message: `Hospital has issued ${units} unit(s) of compatible ${compatibleBloodGroup} for patient ${requestData.patientName}. Total fulfilled: ${newFulfilled}/${requestData.unitsNeeded}.`,
        type: 'status_update',
        link: `/requests/${requestData._id}`,
      },
      session
    );

    return reqUpdated;
  });

  if (updatedReq.status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(updatedReq._id);
  }

  return await BloodRequest.findById(updatedReq._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');
};

/**
 * Issue donated / stock blood units to patient (Atomic MongoDB transaction)
 */
const issuePatientUnits = async (requestId, userId, callerRole, units = 1) => {
  const updatedReq = await withTransaction(async (session) => {
    const requestData = await BloodRequest.findById(requestId, session);
    if (!requestData) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    const targetHospId = requestData.targetHospital || requestData.hospital;
    const hospData = targetHospId ? await Hospital.findById(targetHospId, session) : null;
    if (!hospData) {
      throw new Error('Target hospital not found');
    }

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
    const itemIndex = inventory.findIndex((i) => i.bloodGroup === requestData.bloodGroup);
    const availableStock = itemIndex !== -1 ? (Number(inventory[itemIndex].units) || 0) : 0;

    if (availableStock < unitsToDeduct) {
      throw new Error(`Insufficient ${requestData.bloodGroup} units in hospital inventory to issue to patient`);
    }

    await Hospital.deductStock(hospData._id, requestData.bloodGroup, unitsToDeduct, session);

    const now = new Date();
    const newFulfilled = (requestData.unitsFulfilled || 0) + unitsToDeduct;
    let newStatus = requestData.status;
    if (newFulfilled >= requestData.unitsNeeded) {
      newStatus = 'fulfilled';
    }

    const reqUpdated = await BloodRequest.findByIdAndUpdate(
      requestId,
      {
        unitsFulfilled: newFulfilled,
        status: newStatus,
        updatedAt: now,
      },
      {},
      session
    );

    await InventoryTransaction.create(
      {
        hospital: hospData._id,
        bloodGroup: requestData.bloodGroup,
        change: -unitsToDeduct,
        reason: 'issued_to_patient',
        request: requestData._id,
        actor: userId,
        notes: `Issued ${unitsToDeduct} unit(s) of ${requestData.bloodGroup} to patient ${requestData.patientName}`,
        createdAt: now,
        updatedAt: now,
      },
      session
    );

    await Notification.create(
      {
        recipient: requestData.requester,
        title: '🏥 Blood Units Issued to Patient',
        message: `${units} unit(s) of ${requestData.bloodGroup} have been issued to patient ${requestData.patientName}. Total fulfilled: ${newFulfilled}/${requestData.unitsNeeded}.`,
        type: 'status_update',
        link: `/requests/${requestData._id}`,
      },
      session
    );

    return reqUpdated;
  });

  if (updatedReq.status === 'fulfilled') {
    await pingService.cancelPendingPingsForRequest(updatedReq._id);
  }

  return await BloodRequest.findById(updatedReq._id)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location inventory');
};

const editRequest = async (requestId, callerUser, updateData = {}) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

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
        await notifyMatchedDonorsForRequest(populated, {
          customMessage: notifMessage,
          excludeRecipientIds: activePledges.map((p) => p.donor),
        });
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
 * Cancel blood request atomically with Mongo session:
 * - Releases pending pledges (status -> 'released') without affecting donor cooldown or stats
 * - Returns stock to inventory if units were allocated from hospital stock
 * - Creates donor notifications and audit log
 * - Idempotent: cancelling twice returns friendly 409
 * - Blocked (409) if any pledge is already fulfilled -> offers Close request
 */
const cancelRequest = async (requestId, callerUser, cancelData = {}) => {
  const { reason, note } = cancelData;
  const reasonCode = reason || 'created_by_mistake';

  const txResult = await withTransaction(async (session) => {
    const request = await BloodRequest.findById(requestId, session);
    if (!request) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    let isAuthorized = false;
    let callerHospitalId = null;
    if (callerUser) {
      if (callerUser.accountType === 'admin') {
        isAuthorized = true;
      } else if (callerUser.accountType === 'hospital') {
        const hospital = await Hospital.findOne({ user: callerUser._id }, session);
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

    const receivedUnits = Number(request.unitsFulfilled || 0);
    const completedCount = await Donation.countDocuments(
      { request: requestId, status: { $in: ['completed', 'fulfilled'] } },
      session
    );
    if (receivedUnits > 0 || completedCount > 0) {
      const err = new Error('This request cannot be cancelled because donations have already been fulfilled. Please close the request instead to stop new pledges while keeping received units recorded.');
      err.statusCode = 409;
      throw err;
    }

    const targetHospId = (request.targetHospital?._id || request.targetHospital || request.hospital?._id || request.hospital)?.toString();
    const hospToCheck = callerHospitalId || targetHospId;
    if (hospToCheck && callerUser?.accountType !== 'admin') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCancels = await BloodRequest.countDocuments(
        {
          targetHospital: hospToCheck,
          status: 'cancelled',
          cancelledAt: { $gte: oneHourAgo },
        },
        session
      );
      if (recentCancels >= 10) {
        const err = new Error('Cancellation rate limit reached for this hospital (maximum 10 cancellations per hour). Please contact platform administration if you need urgent assistance.');
        err.statusCode = 429;
        throw err;
      }
    }

    const activePledges = await Donation.find({ request: requestId, status: 'pledged' }, session);
    const unitsFromStock = Number(request.unitsFromStock || 0);
    const targetHospDoc = targetHospId ? await Hospital.findById(targetHospId, session) : null;
    const hospitalName = request.hospitalName || targetHospDoc?.name || 'the hospital';

    const now = new Date();
    let stockReturnedUnits = 0;

    const reqUpdates = {
      status: 'cancelled',
      cancelReason: reasonCode,
      cancelReasonLabel: CANCEL_LABELS[reasonCode] || reasonCode,
      cancelInternalNote: (note || '').slice(0, 200),
      cancelledAt: now,
      cancelledBy: callerUser ? callerUser._id.toString() : null,
      updatedAt: now,
    };

    if (targetHospDoc && unitsFromStock > 0) {
      await Hospital.addStock(targetHospDoc._id, request.bloodGroup, unitsFromStock, session);
      reqUpdates.unitsFromStock = 0;
      stockReturnedUnits = unitsFromStock;

      await InventoryTransaction.create(
        {
          hospital: targetHospDoc._id,
          bloodGroup: request.bloodGroup,
          change: unitsFromStock,
          reason: 'cancelled_request_returned',
          request: request._id,
          actor: callerUser ? callerUser._id.toString() : null,
          notes: `Returned ${unitsFromStock} unit(s) to hospital stock after request was cancelled (${reasonCode})`,
          createdAt: now,
          updatedAt: now,
        },
        session
      );
    }

    await BloodRequest.findByIdAndUpdate(requestId, reqUpdates, {}, session);

    if (activePledges.length > 0) {
      await Donation.updateMany(
        { request: requestId, status: 'pledged' },
        {
          $set: {
            status: 'released',
            releasedReason: 'request_cancelled',
            releasedAt: now,
            updatedAt: now,
          },
        },
        session
      );

      const notifDocs = activePledges.map((p) => ({
        recipient: p.donor,
        title: 'Request Cancelled',
        message: `Request cancelled by ${hospitalName}. Sorry for the confusion - your pledge was released and your eligibility is unchanged. Thank you for being ready to help.`,
        type: 'status_update',
        link: '/donor?tab=history',
      }));
      await Notification.insertMany(notifDocs, session);
    }

    await AuditLog.record(
      {
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
      },
      session
    );

    return {
      request,
      activePledges,
      stockReturnedUnits,
    };
  });

  await pingService.cancelPendingPingsForRequest(requestId);

  try {
    const candidateDonors = await DonorProfile.find().populate('user', 'name email');
    const matchedDonors = rankDonorsForRequest(txResult.request, candidateDonors);
    const pledgedDonorIds = new Set(txResult.activePledges.map((p) => p.donor?.toString()));
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

  return {
    success: true,
    message: `Blood request cancelled successfully. ${txResult.activePledges.length} active pledge(s) released.${txResult.stockReturnedUnits > 0 ? ` ${txResult.stockReturnedUnits} unit(s) returned to hospital stock.` : ''}`,
    stockReturned: txResult.stockReturnedUnits,
    pledgesReleased: txResult.activePledges.length,
  };
};

/**
 * Close blood request atomically with Mongo session.
 */
const closeRequest = async (requestId, callerUser, note = '') => {
  await withTransaction(async (session) => {
    const request = await BloodRequest.findById(requestId, session);
    if (!request) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    let isAuthorized = false;
    if (callerUser) {
      if (callerUser.accountType === 'admin') {
        isAuthorized = true;
      } else if (callerUser.accountType === 'hospital') {
        const hospital = await Hospital.findOne({ user: callerUser._id }, session);
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
    await BloodRequest.findByIdAndUpdate(
      requestId,
      {
        status: 'closed',
        closedAt: now,
        closedBy: callerUser ? callerUser._id.toString() : null,
        closeNote: (note || '').slice(0, 200),
        updatedAt: now,
      },
      {},
      session
    );

    const activePledges = await Donation.find({ request: requestId, status: 'pledged' }, session);
    const targetHospId = request.targetHospital || request.hospital;
    const hospDoc = targetHospId ? await Hospital.findById(targetHospId, session) : null;
    const hospitalName = request.hospitalName || hospDoc?.name || 'the hospital';

    if (activePledges.length > 0) {
      await Donation.updateMany(
        { request: requestId, status: 'pledged' },
        {
          $set: {
            status: 'released',
            releasedReason: 'request_closed',
            releasedAt: now,
            updatedAt: now,
          },
        },
        session
      );

      await Notification.insertMany(
        activePledges.map((p) => ({
          recipient: p.donor,
          title: 'Request Closed',
          message: `Request closed by ${hospitalName}. Your pledge was released and your eligibility is unchanged. Thank you for being ready to help.`,
          type: 'status_update',
          link: '/donor?tab=history',
        })),
        session
      );
    }

    await AuditLog.record(
      {
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
      },
      session
    );
  });

  await pingService.cancelPendingPingsForRequest(requestId);

  return await BloodRequest.findById(requestId)
    .populate('requester', 'name email phone')
    .populate('targetHospital', 'name phone address location isVerified');
};

/**
 * Undo-create / Delete request atomically with Mongo session.
 */
const deleteRequest = async (requestId, callerUser) => {
  await withTransaction(async (session) => {
    const request = await BloodRequest.findById(requestId, session);
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

    let isAuthorized = false;
    let callerHospitalId = null;
    if (callerUser) {
      if (callerUser.accountType === 'admin') {
        isAuthorized = true;
      } else if (callerUser.accountType === 'hospital') {
        const hospital = await Hospital.findOne({ user: callerUser._id }, session);
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

    if (callerUser?.accountType !== 'admin') {
      const elapsedMs = Date.now() - new Date(request.createdAt).getTime();
      const isWithinGracePeriod = elapsedMs < 5 * 60 * 1000;
      const pledgeCount = await Donation.countDocuments({ request: requestId }, session);

      if (!isWithinGracePeriod || pledgeCount > 0) {
        const err = new Error('Requests created more than 5 minutes ago or with existing donor pledges cannot be deleted. Please cancel the request instead.');
        err.statusCode = 400;
        throw err;
      }
    }

    await BloodRequest.findByIdAndDelete(requestId, session);
    await Notification.deleteMany({ link: { $regex: requestId.toString() } }, session);
    await DonorRequestPing.deleteMany({ requestId: requestId.toString() }, session);

    await AuditLog.record(
      {
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
      },
      session
    );
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
