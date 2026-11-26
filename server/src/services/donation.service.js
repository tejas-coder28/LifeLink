const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const { calculateEligibility, validateDonatedAt } = require('../utils/eligibility');
const { MAX_UNITS_PER_DONOR_PER_PLEDGE, formatUnits } = require('../config/bloodUnits');
const Donation = require('../repositories/donation.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const BloodRequest = require('../repositories/bloodRequest.repository');
const Hospital = require('../repositories/hospital.repository');
const Notification = require('../repositories/notification.repository');
const InventoryTransaction = require('../repositories/inventoryTransaction.repository');
const { withTransaction } = require('../config/mongo');

const COOLDOWN_DAYS = DONATION_COOLDOWN_DAYS;

/**
 * Shared eligibility check for donor pledges inside or outside transactions.
 */
function assertDonorEligible(currentProfile, requestBloodGroup) {
  if (!currentProfile) {
    const err = new Error('Donor profile not found. Please complete your donor profile first.');
    err.statusCode = 404;
    throw err;
  }

  if (currentProfile.profileComplete === false) {
    const err = new Error('Please complete your donor profile before pledging.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Compatibility check
  if (!canDonate(currentProfile.bloodGroup, requestBloodGroup)) {
    const err = new Error(
      `Medically incompatible: Blood group ${currentProfile.bloodGroup} cannot donate to a patient needing ${requestBloodGroup}.`
    );
    err.statusCode = 403;
    throw err;
  }

  // 2. Cooldown check: reject with 403 if inside the 90-day window (uses shared eligibility helper)
  const eligibility = calculateEligibility(currentProfile.lastDonationDate);
  if (!eligibility.isEligible) {
    const err = new Error(
      `Donation cooldown active: You must wait 90 days between donations (${eligibility.daysLeft} day(s) remaining).`
    );
    err.statusCode = 403;
    throw err;
  }

  // 3. Standby / availability check
  if (currentProfile.isAvailable === false) {
    const err = new Error('Donor is currently marked as unavailable/standby offline. Please toggle your standby status online to pledge.');
    err.statusCode = 403;
    throw err;
  }
}

const pledgeDonation = async (donorUserId, requestId, unitsDonated) => {
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

  const donorIdStr = donorUserId.toString();
  const reqIdStr = requestId.toString();

  const txResult = await withTransaction(async (session) => {
    const request = await BloodRequest.findById(reqIdStr, session);
    const currentProfile = await DonorProfile.findByUserId(donorIdStr, session);
    const existingForReq = await Donation.find({ donor: donorIdStr, request: reqIdStr }, session);
    const activePledges = await Donation.find({ donor: donorIdStr, status: 'pledged' }, session);

    if (!currentProfile) {
      const err = new Error('Donor profile not found. Please complete your donor profile first.');
      err.statusCode = 404;
      throw err;
    }

    if (currentProfile.profileComplete === false) {
      const err = new Error('Please complete your donor profile before pledging.');
      err.statusCode = 400;
      throw err;
    }

    // Duplicate pledge check for same request
    const duplicate = existingForReq.find((p) => ['pledged', 'completed'].includes(p.status));
    if (duplicate) {
      const err = new Error('You have already pledged or completed a donation for this request');
      err.statusCode = 409;
      throw err;
    }

    // Active pledge check for ANY other request (transactional guard alongside partial unique index)
    const otherActivePledge = activePledges.find((p) => {
      const pReqId = p.request?._id ? p.request._id.toString() : p.request?.toString();
      return pReqId !== reqIdStr;
    });
    if (otherActivePledge) {
      let reqLabel = 'another request';
      try {
        const existingReq = await BloodRequest.findById(otherActivePledge.request, session);
        reqLabel = existingReq?.patientName || existingReq?._id?.toString()?.slice(-6) || reqLabel;
      } catch (_) { }
      const err = new Error(`You already have a pending pledge for "${reqLabel}". Cancel it before pledging to a new request.`);
      err.statusCode = 409;
      throw err;
    }

    if (!request) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    if (!['open', 'matching', 'partially_fulfilled'].includes(request.status)) {
      const err = new Error(`Cannot pledge to blood request with status '${request.status}'`);
      err.statusCode = 400;
      throw err;
    }

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

    // Shared eligibility assertion
    assertDonorEligible(currentProfile, request.bloodGroup);

    // Resolve hospital name
    let resolvedHospitalName = null;
    const hospitalId = request.targetHospital || request.hospital;
    if (hospitalId) {
      const hospDoc = await Hospital.findById(hospitalId, session);
      resolvedHospitalName = hospDoc?.name || null;
    }

    const now = new Date();
    let createdDonation;
    try {
      createdDonation = await Donation.create(
        {
          donor: donorIdStr,
          donorProfile: currentProfile._id,
          request: reqIdStr,
          unitsDonated: pledgeUnits,
          status: 'pledged',
          hospitalName: resolvedHospitalName || null,
          pledgedAt: now,
          donatedAt: null,
          confirmedAt: null,
          donationDate: now,
          createdAt: now,
          updatedAt: now,
        },
        session
      );
    } catch (err) {
      if (err && (err.code === 11000 || /E11000|duplicate key/i.test(err.message))) {
        const conflictErr = new Error('You already have an active pending pledge. Cancel it before pledging to a new request.');
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      throw err;
    }

    if (request.status === 'open') {
      await BloodRequest.findByIdAndUpdate(
        reqIdStr,
        { status: 'matching', updatedAt: now },
        {},
        session
      );
    }

    if (request.requester) {
      await Notification.create(
        {
          recipient: request.requester.toString(),
          title: '❤️ A Donor Has Pledged to Help!',
          message: `A donor has pledged to donate ${formatUnits(pledgeUnits)} of ${request.bloodGroup} for ${request.patientName}.`,
          type: 'status_update',
          link: `/requests/${request._id}`,
        },
        session
      );
    }

    return { donationId: createdDonation._id };
  });

  return await Donation.findById(txResult.donationId)
    .populate('donor')
    .populate('request');
};

/**
 * Confirm / fulfill a donation atomically with Mongo session.
 * Reads all documents before performing any writes.
 * Validates donatedAt against pledgedAt, confirmation time, and role-based backdate limits.
 * Updates donor.lastDonationDate to the latest donatedAt across fulfilled donations.
 * Idempotent: confirming an already-fulfilled pledge returns 409.
 */
const completeDonation = async (donationId, callerUser = null, options = {}) => {
  let callerHospitalId = null;
  if (callerUser && callerUser.accountType === 'hospital') {
    const hosp = await Hospital.findByUserId(callerUser._id);
    if (hosp) callerHospitalId = hosp._id.toString();
  }

  const donatedAtInput =
    options && typeof options === 'object' && options.donatedAt !== undefined
      ? options.donatedAt
      : undefined;

  const txResult = await withTransaction(async (session) => {
    // ── READ PHASE (all reads strictly precede all writes) ─────────────────
    const donation = await Donation.findById(donationId, session);
    if (!donation) {
      const err = new Error('Donation record not found');
      err.statusCode = 404;
      throw err;
    }
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

    const requestId = (donation.request?._id || donation.request)?.toString();
    if (!requestId) {
      const err = new Error('Associated blood request not found');
      err.statusCode = 404;
      throw err;
    }

    const requestData = await BloodRequest.findById(requestId, session);
    if (!requestData) {
      const err = new Error('Blood request not found');
      err.statusCode = 404;
      throw err;
    }

    // Authorization check
    const isAdmin = Boolean(callerUser && callerUser.accountType === 'admin');
    if (callerUser && !isAdmin) {
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

    let donorProfile = donation.donorProfile
      ? await DonorProfile.findById(donation.donorProfile, session)
      : null;
    if (!donorProfile && donation.donor) {
      donorProfile = await DonorProfile.findByUserId(donation.donor, session);
    }

    const donorUserId = (donation.donor?._id || donation.donor)?.toString();
    const existingFulfilledDonations = donorUserId
      ? await Donation.find(
          { donor: donorUserId, status: { $in: ['completed', 'fulfilled'] } },
          session
        )
      : [];

    const targetHospId = (requestData.targetHospital || requestData.hospital)?.toString();
    const hospitalData = targetHospId ? await Hospital.findById(targetHospId, session) : null;

    // ── DATE VALIDATION (zero writes before validation passes) ─────────────
    const now = new Date();
    const pledgedAtDate = donation.pledgedAt
      ? new Date(donation.pledgedAt)
      : (donation.createdAt ? new Date(donation.createdAt) : now);

    const dateCheck = validateDonatedAt({
      donatedAt: donatedAtInput,
      pledgedAt: pledgedAtDate,
      confirmationDate: now,
      isAdmin,
    });
    if (!dateCheck.valid) {
      const err = new Error(dateCheck.error);
      err.statusCode = dateCheck.statusCode || 400;
      throw err;
    }

    const finalDonatedAt = dateCheck.donatedAtDate;
    const confirmedAt = dateCheck.confirmationDate;

    // Determine donor.lastDonationDate = donatedAt of the latest fulfilled donation
    let latestDonatedAt = finalDonatedAt;
    for (const prev of existingFulfilledDonations) {
      if (prev._id && prev._id.toString() === donationId.toString()) continue;
      const prevDateRaw = prev.donatedAt || prev.confirmedAt || prev.completedAt || prev.fulfilledAt || prev.donationDate;
      if (prevDateRaw) {
        const prevDate = new Date(prevDateRaw);
        if (!isNaN(prevDate.getTime()) && prevDate.getTime() > latestDonatedAt.getTime()) {
          latestDonatedAt = prevDate;
        }
      }
    }

    const donorGroup = donorProfile?.bloodGroup || requestData.bloodGroup || 'O+';
    const unitsDonated = Number(donation.unitsDonated) || 1;

    // ── WRITE PHASE ─────────────────────────────────────────────────────────
    // 1. Update donation (pledged -> completed)
    await Donation.findByIdAndUpdate(
      donationId,
      {
        status: 'completed',
        pledgedAt: pledgedAtDate,
        donatedAt: finalDonatedAt,
        confirmedAt,
        completedAt: confirmedAt,
        fulfilledAt: confirmedAt,
        fulfilledBy: callerHospitalId || (callerUser ? callerUser._id.toString() : null),
        donationDate: finalDonatedAt,
        updatedAt: now,
      },
      {},
      session
    );

    // 2. Update request fulfillment counts and status
    const currentFulfilled = Number(requestData.unitsFulfilled || 0);
    const newUnitsFulfilled = currentFulfilled + unitsDonated;
    const totalNeeded = Number(requestData.unitsNeeded || 1);
    const newStatus = newUnitsFulfilled >= totalNeeded ? 'fulfilled' : 'partially_fulfilled';

    await BloodRequest.findByIdAndUpdate(
      requestId,
      {
        unitsFulfilled: newUnitsFulfilled,
        status: newStatus,
        updatedAt: now,
      },
      {},
      session
    );

    // 3. Update donor profile cooldown (= latest donatedAt) & donation counts
    if (donorProfile) {
      const currentCompleted = Number(donorProfile.completedDonations || donorProfile.totalDonations || 0);
      const newCompleted = currentCompleted + unitsDonated;
      await DonorProfile.findByIdAndUpdate(
        donorProfile._id,
        {
          lastDonationDate: latestDonatedAt,
          completedDonations: newCompleted,
          totalDonations: newCompleted,
          updatedAt: now,
        },
        {},
        session
      );
    }

    // 4. Add donated blood units to hospital inventory + ledger entry
    if (hospitalData) {
      await Hospital.addStock(hospitalData._id, donorGroup, unitsDonated, session);
      await InventoryTransaction.create(
        {
          hospital: hospitalData._id,
          bloodGroup: donorGroup,
          change: unitsDonated,
          reason: 'donation_received',
          request: requestData._id,
          donor: donation.donor,
          actor: callerUser ? callerUser._id : donation.donor,
          notes: `Donation received from donor (${unitsDonated} unit(s) of ${donorGroup})`,
          createdAt: now,
          updatedAt: now,
        },
        session
      );
    }

    // 5. Notify donor
    const patientName = requestData.patientName || 'Emergency Patient';
    await Notification.create(
      {
        recipient: donation.donor,
        title: '🎉 Blood Donation Confirmed!',
        message: `Your donation of ${unitsDonated} unit(s) for ${patientName} has been verified and confirmed by the hospital. Thank you for saving a life!`,
        type: 'status_update',
        link: '/donor?tab=history',
      },
      session
    );

    return {
      requestId,
      isRequestNowFulfilled: newStatus === 'fulfilled',
    };
  });

  if (txResult.isRequestNowFulfilled) {
    const pingService = require('./ping.service');
    await pingService.cancelPendingPingsForRequest(txResult.requestId);
  }

  return await Donation.findById(donationId)
    .populate('donor', 'name email phone')
    .populate('donorProfile')
    .populate('request');
};

const declineDonation = async (donationId, callerUser = null) => {
  let callerHospitalId = null;
  if (callerUser && callerUser.accountType === 'hospital') {
    const hosp = await Hospital.findByUserId(callerUser._id);
    if (hosp) callerHospitalId = hosp._id.toString();
  }

  await withTransaction(async (session) => {
    const donation = await Donation.findById(donationId, session);
    if (!donation) {
      const err = new Error('Donation record not found');
      err.statusCode = 404;
      throw err;
    }
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

    const requestId = (donation.request?._id || donation.request)?.toString();
    const requestData = requestId ? await BloodRequest.findById(requestId, session) : null;

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
    await Donation.findByIdAndUpdate(
      donationId,
      {
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
      },
      {},
      session
    );

    const patientName = requestData?.patientName || 'Emergency Patient';
    await Notification.create(
      {
        recipient: donation.donor,
        title: 'Donation Pledge Cancelled',
        message: `Your donation pledge for ${patientName} was marked as cancelled / no-show by the hospital.`,
        type: 'status_update',
        link: '/donor?tab=history',
      },
      session
    );

    // Restore request from 'matching' to 'open' if no other active pledges exist
    if (requestData && requestData.status === 'matching') {
      const remainingActive = await Donation.countDocuments(
        { request: requestData._id, status: 'pledged' },
        session
      );
      if (remainingActive === 0 && (Number(requestData.unitsFulfilled) || 0) < Number(requestData.unitsNeeded)) {
        await BloodRequest.findByIdAndUpdate(requestData._id, { status: 'open', updatedAt: now }, {}, session);
      }
    }
  });

  return await Donation.findById(donationId)
    .populate('donor')
    .populate('donorProfile')
    .populate('request');
};

const getHospitalPledges = async (callerUser) => {
  if (callerUser.accountType === 'admin') {
    const all = await Donation.find()
      .populate('donor', 'name email phone')
      .populate('donorProfile', 'bloodGroup phone location')
      .populate('request', 'patientName bloodGroup unitsNeeded unitsFulfilled status address urgency hospital requiredByDate')
      .sort({ createdAt: -1 });
    return all.map(normalizeDonationDates);
  }

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

  const list = await Donation.find({ request: { $in: requestIds } })
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .populate('request', 'patientName bloodGroup unitsNeeded unitsFulfilled status address urgency hospital targetHospital requiredByDate')
    .sort({ createdAt: -1 });
  return list.map(normalizeDonationDates);
};

const getDonationsByRequest = async (requestId, callerUser = null) => {
  const donations = await Donation.find({ request: requestId })
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .sort({ createdAt: -1 });

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
      const plain = normalizeDonationDates(d);
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

  return donations.map(normalizeDonationDates);
};

const normalizeDonationDates = (doc) => {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const isFulfilled = plain.status === 'completed' || plain.status === 'fulfilled';
  const isReleased = ['released', 'cancelled', 'rejected'].includes(plain.status);
  const pledgedAt = plain.pledgedAt || plain.createdAt || null;
  const confirmedAt = plain.confirmedAt || (isFulfilled ? (plain.fulfilledAt || plain.completedAt || null) : null);
  const donatedAt = plain.donatedAt || (isFulfilled ? (confirmedAt || plain.donationDate || null) : null);
  const releasedAt = plain.releasedAt || (isReleased ? (plain.cancelledAt || plain.updatedAt || null) : null);

  return {
    ...plain,
    pledgedAt,
    confirmedAt,
    donatedAt,
    releasedAt,
  };
};

const getUserDonationHistory = async (userId) => {
  const donations = await Donation.find({ donor: userId })
    .populate({
      path: 'request',
      populate: [
        { path: 'requester', select: 'name email phone' },
        { path: 'hospital', select: 'name phone address' },
        { path: 'targetHospital', select: 'name phone address' },
      ],
    })
    .sort({ createdAt: -1 });

  return donations.map((d) => {
    const plain = normalizeDonationDates(d);
    if (!plain.hospitalName) {
      plain.hospitalName = plain.request?.targetHospital?.name || plain.request?.hospital?.name || plain.hospital?.name || null;
    }
    return plain;
  });
};

const getAllDonations = async () => {
  const all = await Donation.find()
    .populate('donor', 'name email phone')
    .populate('donorProfile', 'bloodGroup phone location')
    .populate('request', 'patientName bloodGroup unitsNeeded unitsFulfilled urgency address status hospital targetHospital')
    .sort({ createdAt: -1 });
  return all.map(normalizeDonationDates);
};

const cancelPledge = async (donorUserId, donationId) => {
  await withTransaction(async (session) => {
    const donation = await Donation.findById(donationId, session);
    if (!donation) {
      const err = new Error('Pledge not found');
      err.statusCode = 404;
      throw err;
    }

    const ownerStr = donation.donor?._id ? donation.donor._id.toString() : donation.donor?.toString();
    if (ownerStr !== donorUserId.toString()) {
      const err = new Error('You can only cancel your own pledge');
      err.statusCode = 403;
      throw err;
    }

    if (donation.status !== 'pledged') {
      const err = new Error(`Cannot cancel a pledge with status '${donation.status}'`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    await Donation.findByIdAndUpdate(
      donationId,
      { status: 'cancelled', cancelledAt: now, updatedAt: now },
      {},
      session
    );

    const requestId = donation.request?._id || donation.request;
    if (requestId) {
      const reqDoc = await BloodRequest.findById(requestId.toString(), session);
      if (reqDoc && reqDoc.status === 'matching') {
        const remainingActive = await Donation.countDocuments(
          { request: reqDoc._id, status: 'pledged' },
          session
        );
        if (remainingActive === 0 && (Number(reqDoc.unitsFulfilled) || 0) < Number(reqDoc.unitsNeeded)) {
          await BloodRequest.findByIdAndUpdate(reqDoc._id, { status: 'open', updatedAt: now }, {}, session);
        }
      }
    }
  });

  return await Donation.findById(donationId);
};

module.exports = {
  assertDonorEligible,
  pledgeDonation,
  completeDonation,
  declineDonation,
  getHospitalPledges,
  getDonationsByRequest,
  getUserDonationHistory,
  getAllDonations,
  cancelPledge,
};
