const Notification = require('../models/Notification');
const DonorProfile = require('../models/DonorProfile');
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
    if (requesterId && donor.user._id.toString() === requesterId) return false;
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
    recipient: donor.user._id,
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
  return await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(20);
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new Error('Notification not found');

  notification.isRead = true;
  await notification.save();
  return notification;
};

module.exports = {
  notifyMatchedDonorsForRequest,
  getUserNotifications,
  markAsRead,
};
