const HospitalModel = require('../models/Hospital');
const { BaseRepository, normalizeDoc, isValidObjectId } = require('./base.repository');
const { registerRepository } = require('./registry');

const DEFAULT_INVENTORY = [
  { bloodGroup: 'A+', units: 10 },
  { bloodGroup: 'A-', units: 5 },
  { bloodGroup: 'B+', units: 12 },
  { bloodGroup: 'B-', units: 4 },
  { bloodGroup: 'AB+', units: 8 },
  { bloodGroup: 'AB-', units: 2 },
  { bloodGroup: 'O+', units: 15 },
  { bloodGroup: 'O-', units: 6 },
];

class HospitalRepository extends BaseRepository {
  constructor() {
    super(HospitalModel);
  }

  async create(data, session = null) {
    const userId = data.user && data.user._id ? data.user._id.toString() : (data.user ? data.user.toString() : null);
    const payload = {
      ...data,
      user: userId,
      inventory: data.inventory || DEFAULT_INVENTORY,
      location: data.location || { type: 'Point', coordinates: [77.2090, 28.6139] },
      isVerified: data.isVerified !== undefined ? Boolean(data.isVerified) : false,
      phone: data.phone || '',
      address: data.address || '',
      licenseNumber: data.licenseNumber || '',
    };
    return await super.create(payload, session);
  }

  async findByUserId(userId, session = null) {
    if (!userId) return null;
    const idStr = userId && userId._id ? userId._id.toString() : userId.toString();
    if (!isValidObjectId(idStr)) return null;
    return await this.findOne({ user: idStr }, session).exec();
  }

  /**
   * Atomically deducts blood units from hospital inventory inside a Mongo session.
   * Uses conditional update ($gte check) to guarantee no negative stock.
   */
  async deductStock(hospitalId, bloodGroup, unitsToDeduct, session = null) {
    const idStr = hospitalId && hospitalId._id ? hospitalId._id.toString() : hospitalId.toString();
    const updated = await this.model.findOneAndUpdate(
      {
        _id: idStr,
        inventory: {
          $elemMatch: {
            bloodGroup,
            units: { $gte: unitsToDeduct },
          },
        },
      },
      {
        $inc: { 'inventory.$.units': -unitsToDeduct },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after', ...(session ? { session } : {}) }
    ).lean({ virtuals: true }).exec();

    if (!updated) {
      const existing = await this.findById(idStr, session);
      if (!existing) {
        throw new Error('Hospital not found');
      }
      const item = (existing.inventory || []).find((i) => i.bloodGroup === bloodGroup);
      if (!item) {
        throw new Error(`Blood group ${bloodGroup} not present in hospital inventory`);
      }
      throw new Error(`Insufficient stock for ${bloodGroup} (available: ${item.units || 0}, needed: ${unitsToDeduct})`);
    }

    return normalizeDoc(updated, this);
  }

  /**
   * Atomically adds blood units to hospital inventory inside a Mongo session.
   */
  async addStock(hospitalId, bloodGroup, unitsToAdd, session = null) {
    const idStr = hospitalId && hospitalId._id ? hospitalId._id.toString() : hospitalId.toString();
    let updated = await this.model.findOneAndUpdate(
      {
        _id: idStr,
        'inventory.bloodGroup': bloodGroup,
      },
      {
        $inc: { 'inventory.$.units': unitsToAdd },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after', ...(session ? { session } : {}) }
    ).lean({ virtuals: true }).exec();

    if (!updated) {
      updated = await this.model.findOneAndUpdate(
        { _id: idStr },
        {
          $push: { inventory: { bloodGroup, units: unitsToAdd } },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after', ...(session ? { session } : {}) }
      ).lean({ virtuals: true }).exec();
    }

    if (!updated) {
      throw new Error('Hospital not found');
    }

    return normalizeDoc(updated, this);
  }
}

const hospitalRepo = new HospitalRepository();
registerRepository('hospitals', hospitalRepo);

module.exports = hospitalRepo;
