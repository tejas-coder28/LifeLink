const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const Donation = require('../models/Donation');
const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const Notification = require('../models/Notification');
const InventoryTransaction = require('../models/InventoryTransaction');

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

  const donorProfile = await DonorProfile.findOne({ user: donorUserId });
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
  const existingPledge = await Donation.findOne({
    donor: donorUserId,
    request: requestId,
    status: { $in: ['pledged', 'completed'] },
  });

  if (existingPledge) {
    const err = new Error('You have already pledged or completed a donation for this request');
    err.statusCode = 400;
    throw err;
  }

  const donation = await Donation.create({
    donor: donorUserId,
    donorProfile: donorProfile ? donorProfile._id : null,
    request: requestId,
    unitsDonated,
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

const completeDonation = async (donationId, callerUser = null) => {
  const donation = await Donation.findById(donationId).populate('request');
  if (!donation) {
    const err = new Error('Donation record not found');
    err.statusCode = 404;
    throw err;
  }
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

  // Authorization check: only owning hospital or admin can confirm
  if (callerUser && callerUser.accountType !== 'admin') {
    let isAuthorized = false;
    if (callerUser.accountType === 'hospital') {
      const hospital = await Hospital.findOne({ user: callerUser._id });
      const targetHospId = donation.request?.targetHospital || donation.request?.hospital;
      if (hospital && targetHospId && targetHospId.toString() === hospital._id.toString()) {
        isAuthorized = true;
      }
      if (donation.request?.requester && donation.request.requester.toString() === callerUser._id.toString()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const err = new Error('Unauthorized: Only the owning hospital or an admin can confirm this donation');
      err.statusCode = 403;
      throw err;
    }
  }

  donation.status = 'completed';
  donation.completedAt = new Date();
  donation.donationDate = new Date();
  await donation.save();

  // Update Donor Profile stats & last donation date
  const donorProfileUpdate = {
    lastDonationDate: new Date(),
    $inc: { totalDonations: 1 },
  };

  let donorProfileDoc = null;
  if (donation.donorProfile) {
    donorProfileDoc = await DonorProfile.findByIdAndUpdate(donation.donorProfile, donorProfileUpdate, { new: true });
  } else {
    donorProfileDoc = await DonorProfile.findOneAndUpdate(
      { user: donation.donor },
      donorProfileUpdate,
      { new: true }
    );
  }

  // Create Notification for the donor
  const patientName = donation.request?.patientName || 'Emergency Patient';
  await Notification.create({
    recipient: donation.donor,
    title: '🎉 Blood Donation Confirmed!',
    message: `Your donation of ${donation.unitsDonated} unit(s) for ${patientName} has been verified and confirmed by the hospital. Thank you for saving a life!`,
    type: 'status_update',
    link: '/donor?tab=history',
  });

  // Update Request and Hospital Inventory
  const request = await BloodRequest.findById(donation.request._id || donation.request);
  if (request) {
    const targetHospId = request.targetHospital || request.hospital;
    if (targetHospId) {
      const donorGroup = donorProfileDoc?.bloodGroup || donation.donorProfile?.bloodGroup || request.bloodGroup;
      // Increment that hospital's inventory for the donor's blood group
      await Hospital.updateOne(
        {
          _id: targetHospId,
          'inventory.bloodGroup': donorGroup,
        },
        {
          $inc: { 'inventory.$.units': donation.unitsDonated || 1 },
        }
      );

      await InventoryTransaction.create({
        hospital: targetHospId,
        bloodGroup: donorGroup,
        change: donation.unitsDonated || 1,
        reason: 'donation_received',
        request: request._id,
        donor: donation.donor,
        actor: callerUser ? callerUser._id : donation.donor,
        notes: `Donation received from donor (${donation.unitsDonated || 1} units of ${donorGroup})`,
      });
    }

    // For legacy/direct requests without target hospital, auto-increment unitsFulfilled
    if (!request.targetHospital) {
      request.unitsFulfilled = (request.unitsFulfilled || 0) + (donation.unitsDonated || 1);
      if (request.unitsFulfilled >= request.unitsNeeded) {
        request.status = 'fulfilled';
      }
      await request.save();
    }
  }

  return await donation.populate(['donor', 'donorProfile', 'request']);
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
      const hospital = await Hospital.findOne({ user: callerUser._id });
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

  // Donor's lastDonationDate is explicitly NOT modified

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
  const request = await BloodRequest.findById(donation.request._id || donation.request);
  if (request && request.status === 'matching') {
    const activePledges = await Donation.countDocuments({
      request: request._id,
      status: 'pledged',
    });
    if (activePledges === 0 && (request.unitsFulfilled || 0) < request.unitsNeeded) {
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
  const hospital = await Hospital.findOne({ user: callerUser._id });
  const filter = {
    $or: [{ requester: callerUser._id }],
  };
  if (hospital) {
    filter.$or.push({ hospital: hospital._id });
    filter.$or.push({ targetHospital: hospital._id });
  }

  const requests = await BloodRequest.find(filter).select('_id');
  const requestIds = requests.map((r) => r._id);

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
