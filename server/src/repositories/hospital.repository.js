const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
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
    super('hospitals');
  }

  async create(data, transaction = null) {
    const payload = {
      ...data,
      user: data.user && data.user._id ? data.user._id.toString() : (data.user ? data.user.toString() : null),
      inventory: data.inventory || DEFAULT_INVENTORY,
      location: data.location || { type: 'Point', coordinates: [77.2090, 28.6139] },
      isVerified: data.isVerified !== undefined ? Boolean(data.isVerified) : false,
      phone: data.phone || '',
      address: data.address || '',
      licenseNumber: data.licenseNumber || '',
    };
    return await super.create(payload, transaction);
  }

  async findByUserId(userId) {
    const idStr = userId && userId._id ? userId._id.toString() : userId.toString();
    return await this._executeFindOne({ user: idStr });
  }

  /**
   * Deducts blood units from hospital inventory inside a transaction.
   * Strictly enforces no negative stock.
   */
  async deductStock(hospitalId, bloodGroup, unitsToDeduct, transaction) {
    const hospRef = this.collection.doc(hospitalId.toString());
    const snap = await transaction.get(hospRef);
    if (!snap.exists) {
      throw new Error('Hospital not found');
    }

    const hospital = snap.data();
    const inventory = hospital.inventory ? [...hospital.inventory] : [...DEFAULT_INVENTORY];
    const itemIndex = inventory.findIndex(item => item.bloodGroup === bloodGroup);

    if (itemIndex === -1) {
      throw new Error(`Blood group ${bloodGroup} not present in hospital inventory`);
    }

    const currentUnits = inventory[itemIndex].units || 0;
    if (currentUnits < unitsToDeduct) {
      throw new Error(`Insufficient stock for ${bloodGroup} (available: ${currentUnits}, needed: ${unitsToDeduct})`);
    }

    inventory[itemIndex] = {
      ...inventory[itemIndex],
      units: currentUnits - unitsToDeduct,
    };

    const now = new Date();
    transaction.update(hospRef, {
      inventory,
      updatedAt: now,
    });

    return normalizeDoc({ id: hospRef.id, data: () => ({ ...hospital, inventory, updatedAt: now }) }, this);
  }

  /**
   * Adds blood units to hospital inventory inside a transaction.
   */
  async addStock(hospitalId, bloodGroup, unitsToAdd, transaction) {
    const hospRef = this.collection.doc(hospitalId.toString());
    const snap = await transaction.get(hospRef);
    if (!snap.exists) {
      throw new Error('Hospital not found');
    }

    const hospital = snap.data();
    const inventory = hospital.inventory ? [...hospital.inventory] : [...DEFAULT_INVENTORY];
    const itemIndex = inventory.findIndex(item => item.bloodGroup === bloodGroup);

    if (itemIndex === -1) {
      inventory.push({ bloodGroup, units: unitsToAdd });
    } else {
      inventory[itemIndex] = {
        ...inventory[itemIndex],
        units: (inventory[itemIndex].units || 0) + unitsToAdd,
      };
    }

    const now = new Date();
    transaction.update(hospRef, {
      inventory,
      updatedAt: now,
    });

    return normalizeDoc({ id: hospRef.id, data: () => ({ ...hospital, inventory, updatedAt: now }) }, this);
  }
}

const hospitalRepo = new HospitalRepository();
registerRepository('hospitals', hospitalRepo);

module.exports = hospitalRepo;
