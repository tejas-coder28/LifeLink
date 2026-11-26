const DonorProfileModel = require('../models/DonorProfile');
const { BaseRepository, isValidObjectId } = require('./base.repository');
const { registerRepository } = require('./registry');

class DonorProfileRepository extends BaseRepository {
  constructor() {
    super(DonorProfileModel);
  }

  async create(data, session = null) {
    const userId = data.user && data.user._id ? data.user._id.toString() : (data.user ? data.user.toString() : null);
    const payload = {
      ...data,
      user: userId,
      bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : '',
      location: data.location || { type: 'Point', coordinates: [77.2090, 28.6139] },
      address: data.address || '',
      lastDonationDate: data.lastDonationDate ? new Date(data.lastDonationDate) : null,
      isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
      age: data.age || null,
      gender: data.gender || null,
      healthFlags: data.healthFlags || ['none'],
      contactNumber: data.contactNumber || '',
      totalDonations: data.totalDonations || 0,
      completedDonations: data.completedDonations || data.totalDonations || 0,
      bloodGroupConfirmed: data.bloodGroupConfirmed !== undefined ? Boolean(data.bloodGroupConfirmed) : false,
      profileComplete: data.profileComplete !== undefined ? Boolean(data.profileComplete) : undefined,
      is18Plus: data.is18Plus !== undefined ? Boolean(data.is18Plus) : false,
      isWeight50KgPlus: data.isWeight50KgPlus !== undefined ? Boolean(data.isWeight50KgPlus) : false,
      consentContact: data.consentContact !== undefined ? Boolean(data.consentContact) : false,
      dob: data.dob || null,
    };
    return await super.create(payload, session);
  }

  async findByUserId(userId, session = null) {
    if (!userId) return null;
    const idStr = userId && userId._id ? userId._id.toString() : userId.toString();
    if (!isValidObjectId(idStr)) return null;
    return await this.findOne({ user: idStr }, session).exec();
  }

  async findCandidates(compatibleBloodGroups = null, availableOnly = true) {
    const filter = {};
    if (availableOnly) {
      filter.isAvailable = true;
    }
    if (compatibleBloodGroups && Array.isArray(compatibleBloodGroups) && compatibleBloodGroups.length > 0) {
      filter.bloodGroup = { $in: compatibleBloodGroups };
    }
    filter.profileComplete = { $ne: false };
    return await this.find(filter).exec();
  }
}

const donorProfileRepo = new DonorProfileRepository();
registerRepository('donorProfiles', donorProfileRepo);

module.exports = donorProfileRepo;
