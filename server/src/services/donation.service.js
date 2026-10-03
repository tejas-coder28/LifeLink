const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');
const Donation = require('../models/Donation');
const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const Notification = require('../models/Notification');

const COOLDOWN_DAYS = DONATION_COOLDOWN_DAYS;

const pledgeDonation = async (donorUserId, requestId, unitsDonated = 1) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
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

const completeDonation = async (donationId) => {
  const donation = await Donation.findById(donationId);
  if (!donation) throw new Error('Donation record not found');
  if (donation.status === 'completed') {
    throw new Error('Donation has already been completed');
  }

  donation.status = 'completed';
  donation.donationDate = new Date();
  await donation.save();

  // Update Donor Profile stats & last donation date
  if (donation.donorProfile) {
    await DonorProfile.findByIdAndUpdate(donation.donorProfile, {
      lastDonationDate: new Date(),
      $inc: { totalDonations: 1 },
    });
  } else {
    await DonorProfile.findOneAndUpdate(
      { user: donation.donor },
      { lastDonationDate: new Date(), $inc: { totalDonations: 1 } }
    );
  }

  // Update Request status to fulfilled
  const request = await BloodRequest.findById(donation.request);
  if (request) {
    request.status = 'fulfilled';
    await request.save();

    // If hospital linked, update inventory
    if (request.hospital) {
      await Hospital.findByIdAndUpdate(request.hospital, {
        $inc: { 'inventory.$[elem].units': donation.unitsDonated },
      }, {
        arrayFilters: [{ 'elem.bloodGroup': request.bloodGroup }],
      });
    }
  }

  return await donation.populate(['donor', 'request']);
};

const getDonationsByRequest = async (requestId) => {
  return await Donation.find({ request: requestId })
    .populate('donor', 'name email phone')
    .sort({ createdAt: -1 });
};

const getUserDonationHistory = async (userId) => {
  return await Donation.find({ donor: userId })
    .populate({
      path: 'request',
      populate: { path: 'requester', select: 'name email phone' },
    })
    .sort({ createdAt: -1 });
};

const getAllDonations = async () => {
  return await Donation.find()
    .populate('donor', 'name email phone')
    .populate('request', 'patientName bloodGroup unitsNeeded urgency address status')
    .sort({ createdAt: -1 });
};

module.exports = {
  pledgeDonation,
  completeDonation,
  getDonationsByRequest,
  getUserDonationHistory,
  getAllDonations,
};
