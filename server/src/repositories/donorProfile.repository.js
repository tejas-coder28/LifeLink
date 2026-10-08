const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class DonorProfileRepository extends BaseRepository {
  constructor() {
    super('donorProfiles');
  }

  async create(data, transaction = null) {
    const userId = data.user && data.user._id ? data.user._id.toString() : (data.user ? data.user.toString() : null);
    const payload = {
      ...data,
      user: userId,
      bloodGroup: data.bloodGroup || 'O+',
      location: data.location || { type: 'Point', coordinates: [77.2090, 28.6139] },
      address: data.address || '',
      lastDonationDate: data.lastDonationDate ? new Date(data.lastDonationDate) : null,
      isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
      age: data.age || null,
      gender: data.gender || null,
      healthFlags: data.healthFlags || ['none'],
      contactNumber: data.contactNumber || '',
      totalDonations: data.totalDonations || 0,
      bloodGroupConfirmed: data.bloodGroupConfirmed !== undefined ? Boolean(data.bloodGroupConfirmed) : false,
    };
    return await super.create(payload, transaction);
  }

  async findByUserId(userId) {
    if (!userId) return null;
    const idStr = userId && userId._id ? userId._id.toString() : userId.toString();
    return await this._executeFindOne({ user: idStr });
  }

  /**
   * Efficient Firestore query for candidates matching blood group and availability.
   * Keeps reads low by filtering directly on the database layer.
   */
  async findCandidates(compatibleBloodGroups = null, availableOnly = true) {
    const filter = {};
    if (availableOnly) {
      filter.isAvailable = true;
    }
    if (compatibleBloodGroups && Array.isArray(compatibleBloodGroups) && compatibleBloodGroups.length > 0) {
      filter.bloodGroup = { $in: compatibleBloodGroups };
    }
    return await this._executeFind(filter);
  }
}

const donorProfileRepo = new DonorProfileRepository();
registerRepository('donorProfiles', donorProfileRepo);

module.exports = donorProfileRepo;
