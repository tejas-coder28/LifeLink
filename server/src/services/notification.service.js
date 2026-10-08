const Notification = require('../repositories/notification.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const { canDonate, DONATION_COOLDOWN_DAYS } = require('../utils/bloodCompatibility');

/**
 * Creates in-app notifications for matched donors when a donor blood request opens
 */
const notifyMatchedDonorsForRequest = async (bloodRequest) => {
  if (!bloodRequest || !bloodRequest.bloodGroup) return { count: 0 };

  const requesterId = bloodRequest.requester?._id
    ? bloodRequest.requester._id.toString()
    : bloodRequest.requester?.toString();

  // Find candidate donors who are available
  const donors = await DonorProfile.find({ isAvailable: true }).populate('user', 'name email phone');

  const compatibleDonors = donors.filter(donor => {
    if (!donor.user) return false;
    // Exclude requester from their own request
    const donorUserId = donor.user._id ? donor.user._id.toString() : donor.user.toString();
    if (requesterId && donorUserId === requesterId) return false;
    // Compatibility check
    if (!canDonate(donor.bloodGroup, bloodRequest.bloodGroup)) return false;
    // Cooldown check (90 days)
    if (donor.lastDonationDate) {
      const diffMs = Date.now() - new Date(donor.lastDonationDate).getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysSince < DONATION_COOLDOWN_DAYS) return false;
    }
    return true;
  });

  const units = bloodRequest.unitsFromDonors || bloodRequest.unitsNeeded;
  const notificationsToInsert = compatibleDonors.map(donor => ({
    recipient: donor.user._id || donor.user,
    title: `🚨 Emergency Blood Request: ${bloodRequest.bloodGroup} Needed`,
    message: `Urgent request for ${bloodRequest.patientName} (${units} unit(s) needed, ${bloodRequest.urgency.toUpperCase()} urgency) at ${bloodRequest.address}.`,
    type: 'request_match',
    link: `/requests/${bloodRequest._id}`,
  }));

  if (notificationsToInsert.length > 0) {
    await Notification.insertMany(notificationsToInsert);
    console.log(`[Notification Engine] Created ${notificationsToInsert.length} notifications for request ${bloodRequest._id}`);
  }

  return { count: notificationsToInsert.length };
};

const getUserNotifications = async (userId) => {
  const uId = userId && userId._id ? userId._id.toString() : userId.toString();
  return await Notification.findByRecipient(uId, 20);
};

const markAsRead = async (notificationId, userId) => {
  return await Notification.markAsRead(notificationId, userId);
};

module.exports = {
  notifyMatchedDonorsForRequest,
  getUserNotifications,
  markAsRead,
};
