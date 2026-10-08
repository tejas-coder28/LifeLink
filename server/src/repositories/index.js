const User = require('./user.repository');
const Hospital = require('./hospital.repository');
const DonorProfile = require('./donorProfile.repository');
const BloodRequest = require('./bloodRequest.repository');
const Donation = require('./donation.repository');
const InventoryTransaction = require('./inventoryTransaction.repository');
const DonorRequestPing = require('./donorRequestPing.repository');
const Notification = require('./notification.repository');
const AIInsight = require('./aiInsight.repository');
const LoginLog = require('./loginLog.repository');
const { BaseRepository } = require('./base.repository');

module.exports = {
  User,
  Hospital,
  DonorProfile,
  BloodRequest,
  Donation,
  InventoryTransaction,
  DonorRequestPing,
  Notification,
  AIInsight,
  LoginLog,
  BaseRepository,
};
