const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const Donation = require('../repositories/donation.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const BloodRequest = require('../repositories/bloodRequest.repository');
const Hospital = require('../repositories/hospital.repository');
const Notification = require('../repositories/notification.repository');
const InventoryTransaction = require('../repositories/inventoryTransaction.repository');
const { getDb } = require('../config/db');

const COOLDOWN_DAYS = DONATION_COOLDOWN_DAYS;

const pledgeDonation = async (donorUserId, requestId, unitsDonated = 1) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Only open, matching, or partially_fulfilled requests can accept pledges
  if (!['open', 'matching', 'partially_fulfilled'].includes(request.status)) {
    const err = new Error(`Cannot pledge to blood request with status '${request.status}'`);
    err.statusCode = 400;
    throw err;
  }

  const donorProfile = await DonorProfile.findByUserId(donorUserId);
  if (!donorProfile) {
    const err = new Error('Donor profile not found. Please complete your donor profile first.');
    err.statusCode = 404;
    throw err;
  }

  // 1. Compatibility check: reject with 403 if medically incompatible
  if (!canDonate(donorProfile.bloodGroup, request.bloodGroup)) {
    const err = new Error(
      `Medically incompatible: Blood group ${donorProfile.bloodGroup} cannot donate to a patient needing ${request.bloodGroup}.`
    );
    err.statusCode = 403;
    throw err;
  }

  // 2. Cooldown check: reject with 403 if inside the 90-day window
  if (donorProfile.lastDonationDate) {
    const lastDate = new Date(donorProfile.lastDonationDate);
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

  // 3. Duplicate check: reject if duplicate pledge on the same request
  const existingPledges = await Donation.find({
    donor: donorUserId,
    request: requestId,
  });

  const duplicate = existingPledges.find(p => ['pledged', 'completed'].includes(p.status));
  if (duplicate) {
    const err = new Error('You have already pledged or completed a donation for this request');
    err.statusCode = 400;
    throw err;
  }

  const donation = await Donation.create({
    donor: donorUserId,
    donorProfile: donorProfile ? donorProfile._id : null,
    request: requestId,
    unitsDonated: Number(unitsDonated) || 1,
    status: 'pledged',
  });

  // Update request status to 'matching' if open
  if (request.status === 'open') {
    request.status = 'matching';
    await request.save();
  }

  // Notify requester
  await Notification.create({
    recipient: request.requester,
    title: '❤️ A Donor Has Pledged to Help!',
    message: `A donor has pledged to donate ${unitsDonated} unit(s) of ${request.bloodGroup} for ${request.patientName}.`,
    type: 'status_update',
    link: `/requests/${request._id}`,
  });

  return await donation.populate(['donor', 'request']);
};

/**
 * Confirm / complete a donation:
 * Atomic Firestore transaction prevents double use and ensures consistent inventory & donor stats.
 */
const completeDonation = async (donationId, callerUser = null) => {
  const db = getDb();

  const txResult = await db.runTransaction(async (transaction) => {
    const donationRef = Donation.collection.doc(donationId.toString());
    const donationSnap = await transaction.get(donationRef);
    if (!donationSnap.exists) {
      const err = new Error('Donation record not found');
      err.statusCode = 404;
      throw err;
    }
    const donation = Donation.normalize(donationSnap);

    if (donation.status === 'completed') {
      const err = new Error('Donation has already been completed');
      err.statusCode = 400;
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

    // Read request
    const reqRef = BloodRequest.collection.doc(donation.request.toString());
    const reqSnap = await transaction.get(reqRef);
    const requestData = reqSnap.exists ? BloodRequest.normalize(reqSnap) : null;

    // Authorization check
    if (callerUser && callerUser.accountType !== 'admin') {
      let isAuthorized = false;
      if (callerUser.accountType === 'hospital') {
        const callerHosp = await Hospital.findByUserId(callerUser._id);
        const targetHospId = requestData?.targetHospital || requestData?.hospital;
        if (callerHosp && targetHospId && targetHospId.toString() === callerHosp._id.toString()) {
          isAuthorized = true;
        }
        if (requestData?.requester && requestData.requester.toString() === callerUser._id.toString()) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        const err = new Error('Unauthorized: Only the owning hospital or an admin can confirm this donation');
        err.statusCode = 403;
        throw err;
      }
    }

    const now = new Date();

    // 1. Mark donation completed
    transaction.update(donationRef, {
      status: 'completed',
      completedAt: now,
      donationDate: now,
      updatedAt: now,
    });

    // 2. Read and update DonorProfile stats
    let donorGroup = requestData?.bloodGroup || 'O+';
    if (donation.donorProfile) {
      const dpRef = DonorProfile.collection.doc(donation.donorProfile.toString());
      const dpSnap = await transaction.get(dpRef);
      if (dpSnap.exists) {
        const dpData = dpSnap.data();
        donorGroup = dpData.bloodGroup || donorGroup;
        transaction.update(dpRef, {
          lastDonationDate: now,
          totalDonations: (Number(dpData.totalDonations) || 0) + 1,
          updatedAt: now,
        });
      }
    } else if (donation.donor) {
      // Find donor profile by user id
      const dpList = await DonorProfile._executeFind({ user: donation.donor.toString() });
      if (dpList.length > 0) {
        const dpRef = DonorProfile.collection.doc(dpList[0]._id);
        donorGroup = dpList[0].bloodGroup || donorGroup;
        transaction.update(dpRef, {
          lastDonationDate: now,
          totalDonations: (Number(dpList[0].totalDonations) || 0) + 1,
          updatedAt: now,
        });
      }
    }

    // 3. Update Hospital Inventory and log InventoryTransaction
    const targetHospId = requestData?.targetHospital || requestData?.hospital;
    if (targetHospId) {
      const hospRef = Hospital.collection.doc(targetHospId.toString());
      const hospSnap = await transaction.get(hospRef);
      if (hospSnap.exists) {
        const hospital = hospSnap.data();
        const inventory = hospital.inventory ? [...hospital.inventory] : [];
        const itemIndex = inventory.findIndex(i => i.bloodGroup === donorGroup);
        const unitsToAdd = Number(donation.unitsDonated) || 1;

        if (itemIndex === -1) {
          inventory.push({ bloodGroup: donorGroup, units: unitsToAdd });
        } else {
          inventory[itemIndex] = {
            ...inventory[itemIndex],
            units: (Number(inventory[itemIndex].units) || 0) + unitsToAdd,
          };
        }

        transaction.update(hospRef, {
          inventory,
          updatedAt: now,
        });

        const txRef = InventoryTransaction.collection.doc();
        transaction.set(txRef, {
          hospital: targetHospId.toString(),
          bloodGroup: donorGroup,
          change: unitsToAdd,
          reason: 'donation_received',
          request: requestData ? requestData._id : null,
          donor: donation.donor,
          actor: callerUser ? callerUser._id : donation.donor,
          notes: `Donation received from donor (${unitsToAdd} units of ${donorGroup})`,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 4. If request has no target hospital, auto-increment unitsFulfilled
    let requestFulfilled = false;
    if (requestData && !requestData.targetHospital) {
      const unitsFulfilled = (Number(requestData.unitsFulfilled) || 0) + (Number(donation.unitsDonated) || 1);
      const reqUpdates = {
        unitsFulfilled,
        updatedAt: now,
      };
      if (unitsFulfilled >= requestData.unitsNeeded) {
        reqUpdates.status = 'fulfilled';
        requestFulfilled = true;
      }
      transaction.update(reqRef, reqUpdates);
    }

    return {
      donation: { ...donation, status: 'completed', completedAt: now, donationDate: now },
      requestData,
      requestFulfilled,
    };
  });

  // Post-transaction notifications
  const patientName = txResult.requestData?.patientName || 'Emergency Patient';
  await Notification.create({
    recipient: txResult.donation.donor,
    title: '🎉 Blood Donation Confirmed!',
    message: `Your donation of ${txResult.donation.unitsDonated || 1} unit(s) for ${patientName} has been verified and confirmed by the hospital. Thank you for saving a life!`,
    type: 'status_update',
    link: '/donor?tab=history',
  });

  if (txResult.requestFulfilled && txResult.requestData) {
    const pingService = require('./ping.service');
    await pingService.cancelPendingPingsForRequest(txResult.requestData._id);
  }

  const finalDonation = await Donation.findById(donationId)
    .populate('donor', 'name email phone')
    .populate('donorProfile')
    .populate('request');

  return finalDonation;
};

const declineDonation = async (donationId, callerUser = null) => {
  const donation = await Donation.findById(donationId).populate('request');
  if (!donation) {
    const err = new Error('Donation record not found');
    err.statusCode = 404;
    throw err;
  }
  if (donation.status === 'completed') {
    const err = new Error('Cannot decline a donation that has already been completed');
    err.statusCode = 400;
    throw err;
  }
  if (donation.status === 'cancelled') {
    const err = new Error('Donation has already been cancelled');
    err.statusCode = 400;
    throw err;
  }

  // Authorization check: only owning hospital or admin can decline
  if (callerUser && callerUser.accountType !== 'admin') {
    let isAuthorized = false;
    if (callerUser.accountType === 'hospital') {
      const hospital = await Hospital.findByUserId(callerUser._id);
      const targetHospId = donation.request?.targetHospital || donation.request?.hospital;
      if (hospital && targetHospId && targetHospId.toString() === hospital._id.toString()) {
        isAuthorized = true;
      }
      if (donation.request?.requester && donation.request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const err = new Error('Unauthorized: Only the owning hospital or an admin can decline this donation');
      err.statusCode = 403;
      throw err;
    }
  }

  donation.status = 'cancelled';
  donation.cancelledAt = new Date();
  await donation.save();

  // Create Notification for the donor
  const patientName = donation.request?.patientName || 'Emergency Patient';
  await Notification.create({
    recipient: donation.donor,
    title: 'Donation Pledge Cancelled',
    message: `Your donation pledge for ${patientName} was marked as cancelled / no-show by the hospital.`,
    type: 'status_update',
    link: '/donor?tab=history',
  });

  // If the request was in matching status and there are no other active pledges, restore to open if needed
  const requestId = donation.request?._id || donation.request;
  const request = await BloodRequest.findById(requestId);
  if (request && request.status === 'matching') {
    const allPledges = await Donation.find({ request: request._id });
    const activePledges = allPledges.filter(p => p.status === 'pledged');
    if (activePledges.length === 0 && (request.unitsFulfilled || 0) < request.unitsNeeded) {
      request.status = 'open';
      await request.save();
    }
  }

  return await donation.populate(['donor', 'donorProfile', 'request']);
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

const getDonationsByRequest = async (requestId) => {
  return await Donation.find({ request: requestId })
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .sort({ createdAt: -1 });
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
