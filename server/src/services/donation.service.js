const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const { ML_PER_UNIT, MAX_UNITS_PER_DONOR_PER_PLEDGE, formatUnits } = require('../config/bloodUnits');
const Donation = require('../repositories/donation.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const BloodRequest = require('../repositories/bloodRequest.repository');
const Hospital = require('../repositories/hospital.repository');
const Notification = require('../repositories/notification.repository');
const InventoryTransaction = require('../repositories/inventoryTransaction.repository');
const { getDb } = require('../config/db');

const COOLDOWN_DAYS = DONATION_COOLDOWN_DAYS;

const pledgeDonation = async (donorUserId, requestId, unitsDonated) => {
  // Validate units
  const pledgeUnits = Number(unitsDonated);
  if (!unitsDonated || isNaN(pledgeUnits) || pledgeUnits < 1 || !Number.isInteger(pledgeUnits)) {
    const err = new Error('Pledge units is required and must be an integer greater than or equal to 1');
    err.statusCode = 400;
    throw err;
  }

  if (pledgeUnits > MAX_UNITS_PER_DONOR_PER_PLEDGE) {
    const err = new Error(`Maximum allowed donation per pledge is ${MAX_UNITS_PER_DONOR_PER_PLEDGE} unit(s).`);
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();

  // Pre-fetch donor profile & duplicate pledge check outside transaction
  const donorProfile = await DonorProfile.findByUserId(donorUserId);
  if (!donorProfile) {
    const err = new Error('Donor profile not found. Please complete your donor profile first.');
    err.statusCode = 404;
    throw err;
  }

  const existingPledges = await Donation.find({
    donor: donorUserId,
    request: requestId,
  });

  const duplicate = existingPledges.find(p => ['pledged', 'completed'].includes(p.status));
  if (duplicate) {
    const err = new Error('You have already pledged or completed a donation for this request');
    err.statusCode = 409;
    throw err;
  }

  const txResult = await db.runTransaction(async (transaction) => {
    const reqRef = BloodRequest.collection.doc(requestId.toString());
    const dpRef = DonorProfile.collection.doc(donorProfile._id.toString());

    // (a) ALL READS FIRST using Promise.all with transaction.get
    const [reqSnap, dpSnap] = await Promise.all([
      transaction.get(reqRef),
      transaction.get(dpRef),
    ]);

    if (!reqSnap.exists) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }
    const request = BloodRequest.normalize(reqSnap);

    // Only open, matching, or partially_fulfilled requests can accept pledges
    if (!['open', 'matching', 'partially_fulfilled'].includes(request.status)) {
      const err = new Error(`Cannot pledge to blood request with status '${request.status}'`);
      err.statusCode = 400;
      throw err;
    }

    const currentProfile = dpSnap && dpSnap.exists ? DonorProfile.normalize(dpSnap) : donorProfile;

    // Calculate remaining units needed from donors
    const totalNeeded = Number(request.unitsNeeded || request.unitsRequired || request.units || 1);
    const fromStock = Number(request.unitsFromStock || 0);
    const neededFromDonors = request.unitsFromDonors !== undefined && request.unitsFromDonors !== null && request.unitsFromDonors > 0
      ? Number(request.unitsFromDonors)
      : Math.max(0, totalNeeded - fromStock);
    const fulfilledUnits = Number(request.unitsFulfilled || 0);
    const donorFulfilled = Math.max(0, fulfilledUnits - fromStock);
    const stillNeeded = Math.max(0, neededFromDonors - donorFulfilled);

    if (stillNeeded <= 0 || pledgeUnits > stillNeeded) {
      const err = new Error(`Pledge of ${pledgeUnits} unit(s) exceeds remaining needed units from donors (${stillNeeded} unit(s) remaining).`);
      err.statusCode = 400;
      throw err;
    }

    // 1. Compatibility check: reject with 403 if medically incompatible
    if (!canDonate(currentProfile.bloodGroup, request.bloodGroup)) {
      const err = new Error(
        `Medically incompatible: Blood group ${currentProfile.bloodGroup} cannot donate to a patient needing ${request.bloodGroup}.`
      );
      err.statusCode = 403;
      throw err;
    }

    // 2. Cooldown check: reject with 403 if inside the 90-day window
    if (currentProfile.lastDonationDate) {
      const lastDate = new Date(currentProfile.lastDonationDate);
      const diffMs = Date.now() - lastDate.getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysSince < COOLDOWN_DAYS) {
        const daysRemaining = COOLDOWN_DAYS - daysSince;
        const err = new Error(
          `Donation cooldown active: You must wait 90 days between donations (${daysRemaining} day(s) remaining).`
        );
        err.statusCode = 403;
        throw err;
      }
    }

    // Standby / availability check
    if (currentProfile.isAvailable === false) {
      const err = new Error('Donor is currently marked as unavailable/standby offline. Please toggle your standby status online to pledge.');
      err.statusCode = 403;
      throw err;
    }

    // (b) COMPUTE ALL VALUES IN PLAIN JS
    const now = new Date();
    const donationRef = Donation.collection.doc();
    const donationPayload = {
      donor: donorUserId.toString(),
      donorProfile: currentProfile ? currentProfile._id.toString() : null,
      request: requestId.toString(),
      unitsDonated: pledgeUnits,
      status: 'pledged',
      createdAt: now,
      updatedAt: now,
    };

    let reqUpdates = null;
    if (request.status === 'open') {
      reqUpdates = {
        status: 'matching',
        updatedAt: now,
      };
    }

    const notifRef = Notification.collection.doc();
    const notifPayload = {
      recipient: request.requester ? request.requester.toString() : null,
      title: '❤️ A Donor Has Pledged to Help!',
      message: `A donor has pledged to donate ${formatUnits(pledgeUnits)} of ${request.bloodGroup} for ${request.patientName}.`,
      type: 'status_update',
      link: `/requests/${request._id}`,
      createdAt: now,
      updatedAt: now,
    };

    // (c) ALL WRITES LAST
    transaction.set(donationRef, donationPayload);
    if (reqUpdates) {
      transaction.update(reqRef, reqUpdates);
    }
    if (notifPayload.recipient) {
      transaction.set(notifRef, notifPayload);
    }

    return {
      donationId: donationRef.id,
    };
  });

  const finalDonation = await Donation.findById(txResult.donationId)
    .populate('donor')
    .populate('request');

  return finalDonation;
};

/**
 * Confirm / fulfill a donation:
 * Restructured as:
 * (a) ALL reads first using Promise.all with transaction.get
 * (b) compute all new values in plain JS
 * (c) ALL writes last
 * Atomic and idempotent: confirming an already-fulfilled pledge returns 409.
 */
const completeDonation = async (donationId, callerUser = null) => {
  const db = getDb();

  let callerHospitalId = null;
  if (callerUser && callerUser.accountType === 'hospital') {
    const hosp = await Hospital.findByUserId(callerUser._id);
    if (hosp) callerHospitalId = hosp._id.toString();
  }

  // Pre-fetch references outside transaction
  const initialDonation = await Donation.findById(donationId);
  if (!initialDonation) {
    const err = new Error('Donation record not found');
    err.statusCode = 404;
    throw err;
  }
  if (initialDonation.status === 'completed' || initialDonation.status === 'fulfilled') {
    const err = new Error('Donation has already been completed');
    err.statusCode = 409;
    throw err;
  }
  if (initialDonation.status === 'cancelled') {
    const err = new Error('Cannot complete a cancelled donation');
    err.statusCode = 400;
    throw err;
  }
  if (initialDonation.status !== 'pledged') {
    const err = new Error('Only pledged donations can be confirmed');
    err.statusCode = 400;
    throw err;
  }

  const requestId = (initialDonation.request?._id || initialDonation.request)?.toString();
  if (!requestId) {
    const err = new Error('Associated blood request not found');
    err.statusCode = 404;
    throw err;
  }

  let donorProfileId = initialDonation.donorProfile?._id || initialDonation.donorProfile;
  if (!donorProfileId && initialDonation.donor) {
    const dp = await DonorProfile.findByUserId(initialDonation.donor);
    if (dp) donorProfileId = dp._id.toString();
  }

  const initialReq = await BloodRequest.findById(requestId);
  const targetHospId = (initialReq?.targetHospital?._id || initialReq?.targetHospital || initialReq?.hospital?._id || initialReq?.hospital)?.toString();

  const txResult = await db.runTransaction(async (transaction) => {
    const donationRef = Donation.collection.doc(donationId.toString());
    const reqRef = BloodRequest.collection.doc(requestId);
    const dpRef = donorProfileId ? DonorProfile.collection.doc(donorProfileId.toString()) : null;
    const hospRef = targetHospId ? Hospital.collection.doc(targetHospId.toString()) : null;

    // (a) ALL READS FIRST using Promise.all with transaction.get
    const [donationSnap, reqSnap, dpSnap, hospSnap] = await Promise.all([
      transaction.get(donationRef),
      transaction.get(reqRef),
      dpRef ? transaction.get(dpRef) : Promise.resolve(null),
      hospRef ? transaction.get(hospRef) : Promise.resolve(null),
    ]);

    if (!donationSnap.exists) {
      const err = new Error('Donation record not found');
      err.statusCode = 404;
      throw err;
    }
    const donation = Donation.normalize(donationSnap);
    if (donation.status === 'completed' || donation.status === 'fulfilled') {
      const err = new Error('Donation has already been completed');
      err.statusCode = 409;
      throw err;
    }
    if (donation.status === 'cancelled') {
      const err = new Error('Cannot complete a cancelled donation');
      err.statusCode = 400;
      throw err;
    }
    if (donation.status !== 'pledged') {
      const err = new Error('Only pledged donations can be confirmed');
      err.statusCode = 400;
      throw err;
    }

    if (!reqSnap.exists) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }
    const requestData = BloodRequest.normalize(reqSnap);

    // Authorization check
    if (callerUser && callerUser.accountType !== 'admin') {
      let isAuthorized = false;
      if (callerUser.accountType === 'hospital') {
        const curTargetHospId = (requestData.targetHospital || requestData.hospital)?.toString();
        if (callerHospitalId && curTargetHospId && curTargetHospId === callerHospitalId) {
          isAuthorized = true;
        }
        if (requestData.requester && requestData.requester.toString() === callerUser._id.toString()) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        const err = new Error('Unauthorized: Only the owning hospital or an admin can confirm this donation');
        err.statusCode = 403;
        throw err;
      }
    }

    // (b) COMPUTE ALL VALUES IN PLAIN JS
    const dpData = dpSnap && dpSnap.exists ? dpSnap.data() : null;
    const hospitalData = hospSnap && hospSnap.exists ? hospSnap.data() : null;
    const donorGroup = dpData?.bloodGroup || requestData.bloodGroup || 'O+';
    const unitsDonated = Number(donation.unitsDonated) || 1;
    const now = new Date();

    // 1. Donation updates (pledge -> fulfilled)
    const donationUpdates = {
      status: 'completed',
      completedAt: now,
      fulfilledAt: now,
      fulfilledBy: callerHospitalId || (callerUser ? callerUser._id.toString() : null),
      donationDate: now,
      updatedAt: now,
    };

    // 2. Request updates (unitsFulfilled, status)
    const currentFulfilled = Number(requestData.unitsFulfilled || 0);
    const newUnitsFulfilled = currentFulfilled + unitsDonated;
    const totalNeeded = Number(requestData.unitsNeeded || 1);
    const newStatus = newUnitsFulfilled >= totalNeeded ? 'fulfilled' : 'partially_fulfilled';
    const reqUpdates = {
      unitsFulfilled: newUnitsFulfilled,
      status: newStatus,
      updatedAt: now,
    };

    // 3. Donor profile updates (lastDonationDate = now, completedDonations += units)
    let dpUpdates = null;
    if (dpRef && dpData) {
      const currentCompleted = Number(dpData.completedDonations || dpData.totalDonations || 0);
      const newCompleted = currentCompleted + unitsDonated;
      dpUpdates = {
        lastDonationDate: now,
        completedDonations: newCompleted,
        totalDonations: newCompleted,
        updatedAt: now,
      };
    }

    // 4. Hospital inventory & ledger
    let newInventory = null;
    let invTxDocRef = null;
    let invTxPayload = null;
    if (hospRef && hospitalData) {
      const inventory = hospitalData.inventory ? [...hospitalData.inventory] : [];
      const itemIndex = inventory.findIndex(i => i.bloodGroup === donorGroup);
      if (itemIndex === -1) {
        inventory.push({ bloodGroup: donorGroup, units: unitsDonated });
      } else {
        inventory[itemIndex] = {
          ...inventory[itemIndex],
          units: (Number(inventory[itemIndex].units) || 0) + unitsDonated,
        };
      }
      newInventory = inventory;

      invTxDocRef = InventoryTransaction.collection.doc();
      invTxPayload = {
        hospital: hospRef.id,
        bloodGroup: donorGroup,
        change: unitsDonated,
        reason: 'donation_received',
        request: requestData._id,
        donor: donation.donor,
        actor: callerHospitalId || (callerUser ? callerUser._id : donation.donor),
        notes: `Donation received from donor (${unitsDonated} unit(s) of ${donorGroup})`,
        createdAt: now,
        updatedAt: now,
      };
    }

    // 5. Notification
    const notifDocRef = Notification.collection.doc();
    const patientName = requestData.patientName || 'Emergency Patient';
    const notifPayload = {
      recipient: donation.donor,
      title: '🎉 Blood Donation Confirmed!',
      message: `Your donation of ${unitsDonated} unit(s) for ${patientName} has been verified and confirmed by the hospital. Thank you for saving a life!`,
      type: 'status_update',
      link: '/donor?tab=history',
      createdAt: now,
      updatedAt: now,
    };

    // (c) ALL WRITES LAST
    transaction.update(donationRef, donationUpdates);
    transaction.update(reqRef, reqUpdates);
    if (dpRef && dpUpdates) {
      transaction.update(dpRef, dpUpdates);
    }
    if (hospRef && newInventory) {
      transaction.update(hospRef, { inventory: newInventory, updatedAt: now });
      if (invTxDocRef && invTxPayload) {
        transaction.set(invTxDocRef, invTxPayload);
      }
    }
    transaction.set(notifDocRef, notifPayload);

    return {
      donation: { ...donation, ...donationUpdates },
      requestData: { ...requestData, ...reqUpdates },
      isRequestNowFulfilled: newStatus === 'fulfilled',
    };
  });

  if (txResult.isRequestNowFulfilled) {
    const pingService = require('./ping.service');
    await pingService.cancelPendingPingsForRequest(requestId);
  }

  const finalDonation = await Donation.findById(donationId)
    .populate('donor', 'name email phone')
    .populate('donorProfile')
    .populate('request');

  return finalDonation;
};

const declineDonation = async (donationId, callerUser = null) => {
  const db = getDb();

  let callerHospitalId = null;
  if (callerUser && callerUser.accountType === 'hospital') {
    const hosp = await Hospital.findByUserId(callerUser._id);
    if (hosp) callerHospitalId = hosp._id.toString();
  }

  // Pre-fetch donation to get request ID
  const initialDonation = await Donation.findById(donationId);
  if (!initialDonation) {
    const err = new Error('Donation record not found');
    err.statusCode = 404;
    throw err;
  }
  if (initialDonation.status === 'completed' || initialDonation.status === 'fulfilled') {
    const err = new Error('Cannot decline a donation that has already been completed');
    err.statusCode = 400;
    throw err;
  }
  if (initialDonation.status === 'cancelled') {
    const err = new Error('Donation has already been cancelled');
    err.statusCode = 400;
    throw err;
  }

  const requestId = (initialDonation.request?._id || initialDonation.request)?.toString();

  const txResult = await db.runTransaction(async (transaction) => {
    const donationRef = Donation.collection.doc(donationId.toString());
    const reqRef = requestId ? BloodRequest.collection.doc(requestId) : null;

    // (a) ALL READS FIRST using Promise.all with transaction.get
    const [donationSnap, reqSnap] = await Promise.all([
      transaction.get(donationRef),
      reqRef ? transaction.get(reqRef) : Promise.resolve(null),
    ]);

    if (!donationSnap.exists) {
      const err = new Error('Donation record not found');
      err.statusCode = 404;
      throw err;
    }
    const donation = Donation.normalize(donationSnap);
    if (donation.status === 'completed' || donation.status === 'fulfilled') {
      const err = new Error('Cannot decline a donation that has already been completed');
      err.statusCode = 400;
      throw err;
    }
    if (donation.status === 'cancelled') {
      const err = new Error('Donation has already been cancelled');
      err.statusCode = 400;
      throw err;
    }

    const requestData = reqSnap && reqSnap.exists ? BloodRequest.normalize(reqSnap) : null;

    // Authorization check: only owning hospital or admin can decline
    if (callerUser && callerUser.accountType !== 'admin') {
      let isAuthorized = false;
      if (callerUser.accountType === 'hospital') {
        const targetHospId = requestData?.targetHospital || requestData?.hospital;
        if (callerHospitalId && targetHospId && targetHospId.toString() === callerHospitalId) {
          isAuthorized = true;
        }
        if (requestData?.requester && requestData.requester.toString() === callerUser._id.toString()) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        const err = new Error('Unauthorized: Only the owning hospital or an admin can decline this donation');
        err.statusCode = 403;
        throw err;
      }
    }

    const now = new Date();
    const notifRef = Notification.collection.doc();
    const patientName = requestData?.patientName || 'Emergency Patient';
    const notifPayload = {
      recipient: donation.donor,
      title: 'Donation Pledge Cancelled',
      message: `Your donation pledge for ${patientName} was marked as cancelled / no-show by the hospital.`,
      type: 'status_update',
      link: '/donor?tab=history',
      createdAt: now,
      updatedAt: now,
    };

    // (c) ALL WRITES LAST
    transaction.update(donationRef, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    });
    transaction.set(notifRef, notifPayload);

    return {
      donation: { ...donation, status: 'cancelled' },
      requestData,
    };
  });

  // Post-transaction check: if request was in matching status and there are no other active pledges, restore to open
  if (requestId) {
    const request = await BloodRequest.findById(requestId);
    if (request && request.status === 'matching') {
      const allPledges = await Donation.find({ request: request._id });
      const activePledges = allPledges.filter(p => p.status === 'pledged');
      if (activePledges.length === 0 && (Number(request.unitsFulfilled) || 0) < Number(request.unitsNeeded)) {
        request.status = 'open';
        await request.save();
      }
    }
  }

  return await Donation.findById(donationId)
    .populate('donor')
    .populate('donorProfile')
    .populate('request');
};

const getHospitalPledges = async (callerUser) => {
  if (callerUser.accountType === 'admin') {
    return await Donation.find()
      .populate('donor', 'name email phone')
      .populate('donorProfile', 'bloodGroup phone location')
      .populate('request', 'patientName bloodGroup unitsNeeded unitsFulfilled status address urgency hospital requiredByDate')
      .sort({ createdAt: -1 });
  }

  // Hospital user: find requests associated with this hospital
  const hospital = await Hospital.findByUserId(callerUser._id);
  const filter = {
    $or: [{ requester: callerUser._id }],
  };
  if (hospital) {
    filter.$or.push({ hospital: hospital._id });
    filter.$or.push({ targetHospital: hospital._id });
  }

  const requests = await BloodRequest.find(filter).select('_id');
  const requestIds = requests.map((r) => r._id);

  if (requestIds.length === 0) return [];

  return await Donation.find({ request: { $in: requestIds } })
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .populate('request', 'patientName bloodGroup unitsNeeded unitsFulfilled status address urgency hospital targetHospital requiredByDate')
    .sort({ createdAt: -1 });
};

const getDonationsByRequest = async (requestId, callerUser = null) => {
  const donations = await Donation.find({ request: requestId })
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .sort({ createdAt: -1 });

  // Determine if callerUser is authorized to view phone numbers (owning hospital or admin)
  let canViewPhone = false;
  if (callerUser) {
    if (callerUser.accountType === 'admin') {
      canViewPhone = true;
    } else if (callerUser.accountType === 'hospital') {
      const hosp = await Hospital.findByUserId(callerUser._id);
      const reqDoc = await BloodRequest.findById(requestId);
      const targetHosp = reqDoc?.targetHospital || reqDoc?.hospital;
      if (hosp && targetHosp && hosp._id.toString() === targetHosp.toString()) {
        canViewPhone = true;
      }
      if (reqDoc?.requester && reqDoc.requester.toString() === callerUser._id.toString()) {
        canViewPhone = true;
      }
    }
  }

  if (!canViewPhone) {
    return donations.map((d) => {
      const plain = typeof d.toObject === 'function' ? d.toObject() : { ...d };
      if (plain.donor && typeof plain.donor === 'object') {
        const { phone, ...safeDonor } = plain.donor;
        plain.donor = safeDonor;
      }
      if (plain.donorProfile && typeof plain.donorProfile === 'object') {
        const { phone, ...safeProfile } = plain.donorProfile;
        plain.donorProfile = safeProfile;
      }
      return plain;
    });
  }

  return donations;
};

const getUserDonationHistory = async (userId) => {
  return await Donation.find({ donor: userId })
    .populate({
      path: 'request',
      populate: [
        { path: 'requester', select: 'name email phone' },
        { path: 'hospital', select: 'name phone address' },
      ],
    })
    .sort({ createdAt: -1 });
};

const getAllDonations = async () => {
  return await Donation.find()
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .populate('request', 'patientName bloodGroup unitsNeeded unitsFulfilled urgency address status hospital')
    .sort({ createdAt: -1 });
};

module.exports = {
  pledgeDonation,
  completeDonation,
  declineDonation,
  getHospitalPledges,
  getDonationsByRequest,
  getUserDonationHistory,
  getAllDonations,
};
