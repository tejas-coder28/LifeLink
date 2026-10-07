const DonorRequestPing = require('../models/DonorRequestPing');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { canSeekDonors } = require('../utils/requestRules');

/**
 * Creates or updates a ping from a hospital to a matched candidate donor
 */
const notifyDonor = async (requestId, donorId, hospitalUserId) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const error = new Error('Blood request not found');
    error.statusCode = 404;
    throw error;
  }

  if (!canSeekDonors(request)) {
    const error = new Error('Request is already fulfilled');
    error.statusCode = 409;
    throw error;
  }

  const hospitalUser = await User.findById(hospitalUserId);
  const hospitalName = hospitalUser?.name || 'Medical Center';

  // Check if a ping already exists for this request + donor
  let ping = await DonorRequestPing.findOne({ requestId, donorId });

  if (ping) {
    ping.status = 'pending';
    ping.sentAt = new Date();
    ping.respondedAt = null;
    await ping.save();
  } else {
    ping = await DonorRequestPing.create({
      requestId,
      donorId,
      hospitalId: hospitalUserId,
      status: 'pending',
      sentAt: new Date(),
    });
  }

  // Create in-app notification doc for the donor
  await Notification.create({
    recipient: donorId,
    title: `🚨 Urgent Blood Request Ping from ${hospitalName}`,
    message: `${hospitalName} requested your ${request.bloodGroup} donation for patient ${request.patientName} (${request.unitsNeeded} unit(s), ${request.urgency.toUpperCase()} urgency).`,
    type: 'ping_received',
    link: `/donor/dashboard?tab=pings`,
  });

  return ping;
};

/**
 * Responds to a ping (donor accepts or declines)
 */
const respondToPing = async (pingId, donorUserId, decision) => {
  if (!['accepted', 'rejected'].includes(decision)) {
    throw new Error("Invalid decision. Must be 'accepted' or 'rejected'");
  }

  const ping = await DonorRequestPing.findById(pingId).populate('requestId');
  if (!ping) {
    throw new Error('Request ping not found');
  }

  // Ownership Check: verify assigned donor is responding
  if (ping.donorId.toString() !== donorUserId.toString()) {
    throw new Error('Unauthorized: You can only respond to request pings sent to you');
  }

  ping.status = decision;
  ping.respondedAt = new Date();
  await ping.save();

  const donorUser = await User.findById(donorUserId);
  const donorName = donorUser?.name || 'Candidate Donor';
  const patientName = ping.requestId?.patientName || 'Patient';

  // Notify hospital
  await Notification.create({
    recipient: ping.hospitalId,
    title: `Donor Response: ${decision === 'accepted' ? 'Accepted ✅' : 'Declined ❌'}`,
    message: `${donorName} has ${decision} your donation ping for ${patientName}.`,
    type: 'ping_response',
    link: `/hospital/dashboard`,
  });

  return ping;
};

/**
 * Returns all pings for a specific blood request
 */
const getRequestPings = async (requestId) => {
  return await DonorRequestPing.find({ requestId })
    .populate('donorId', 'name email phone bloodGroup')
    .sort({ sentAt: -1 });
};

/**
 * Returns all pending pings for a donor
 */
const getPendingPingsForDonor = async (donorUserId) => {
  return await DonorRequestPing.find({ donorId: donorUserId, status: 'pending' })
    .populate({
      path: 'requestId',
      select: 'patientName bloodGroup unitsNeeded urgency address location requiredByDate status notes',
    })
    .populate('hospitalId', 'name email phone')
    .sort({ sentAt: -1 });
};

/**
 * Cancels all pending pings for a request that has been fulfilled.
 * Sends short notification ("Request fulfilled, thank you") to each donor.
 */
const cancelPendingPingsForRequest = async (requestId) => {
  const pendingPings = await DonorRequestPing.find({
    requestId,
    status: 'pending',
  });

  if (!pendingPings || pendingPings.length === 0) {
    return [];
  }

  await DonorRequestPing.updateMany(
    { requestId, status: 'pending' },
    { $set: { status: 'cancelled', respondedAt: new Date() } }
  );

  for (const ping of pendingPings) {
    await Notification.create({
      recipient: ping.donorId,
      title: 'Request fulfilled, thank you',
      message: 'Request fulfilled, thank you',
      type: 'status_update',
      link: '/donor/dashboard',
    });
  }

  return pendingPings;
};

module.exports = {
  notifyDonor,
  respondToPing,
  getRequestPings,
  getPendingPingsForDonor,
  cancelPendingPingsForRequest,
};
