const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class InventoryTransactionRepository extends BaseRepository {
  constructor() {
    super('inventoryTransactions');
  }

  async create(data, transaction = null) {
    const hospitalId = data.hospital && data.hospital._id ? data.hospital._id.toString() : data.hospital?.toString();
    const requestId = data.request && data.request._id ? data.request._id.toString() : (data.request ? data.request.toString() : null);
    const donorId = data.donor && data.donor._id ? data.donor._id.toString() : (data.donor ? data.donor.toString() : null);
    const actorId = data.actor && data.actor._id ? data.actor._id.toString() : (data.actor ? data.actor.toString() : null);

    const payload = {
      ...data,
      hospital: hospitalId,
      bloodGroup: data.bloodGroup,
      change: Number(data.change) || 0,
      reason: data.reason,
      request: requestId,
      donor: donorId,
      actor: actorId,
      notes: data.notes || '',
    };

    return await super.create(payload, transaction);
  }

  async findByHospital(hospitalId, limit = 20) {
    const idStr = hospitalId && hospitalId._id ? hospitalId._id.toString() : hospitalId.toString();
    return await this.find({ hospital: idStr })
      .populate('actor', 'name email accountType')
      .populate('donor', 'name email')
      .populate('request', 'patientName bloodGroup unitsNeeded')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

const inventoryTransactionRepo = new InventoryTransactionRepository();
registerRepository('inventoryTransactions', inventoryTransactionRepo);

module.exports = inventoryTransactionRepo;
