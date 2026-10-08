const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class BloodRequestRepository extends BaseRepository {
  constructor() {
    super('bloodRequests');
  }

  async create(data, transaction = null) {
    const requesterId = data.requester && data.requester._id ? data.requester._id.toString() : data.requester?.toString();
    const hospitalId = data.hospital && data.hospital._id ? data.hospital._id.toString() : (data.hospital ? data.hospital.toString() : null);
    const targetHospId = data.targetHospital && data.targetHospital._id ? data.targetHospital._id.toString() : (data.targetHospital ? data.targetHospital.toString() : null);

    const payload = {
      ...data,
      requester: requesterId,
      hospital: hospitalId,
      targetHospital: targetHospId,
      patientName: data.patientName || '',
      bloodGroup: data.bloodGroup || 'A+',
      unitsNeeded: Number(data.unitsNeeded) || 1,
      unitsFromStock: Number(data.unitsFromStock) || 0,
      unitsFromDonors: Number(data.unitsFromDonors) || 0,
      unitsFulfilled: Number(data.unitsFulfilled) || 0,
      urgency: data.urgency || 'high',
      status: data.status || 'pending_hospital_review',
      location: data.location || { type: 'Point', coordinates: [77.2090, 28.6139] },
      address: data.address || '',
      requiredByDate: data.requiredByDate ? new Date(data.requiredByDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      reviewedAt: data.reviewedAt ? new Date(data.reviewedAt) : null,
      rejectionReason: data.rejectionReason || '',
      notes: data.notes || '',
      matchedDonorsCount: Number(data.matchedDonorsCount) || 0,
    };

    return await super.create(payload, transaction);
  }
}

const bloodRequestRepo = new BloodRequestRepository();
registerRepository('bloodRequests', bloodRequestRepo);

module.exports = bloodRequestRepo;
