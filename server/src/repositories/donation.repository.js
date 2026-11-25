const DonationModel = require('../models/Donation');
const { BaseRepository } = require('./base.repository');
const { registerRepository } = require('./registry');

class DonationRepository extends BaseRepository {
  constructor() {
    super(DonationModel);
  }

  async create(data, session = null) {
    const donorId = data.donor && data.donor._id ? data.donor._id.toString() : data.donor?.toString();
    const donorProfId = data.donorProfile && data.donorProfile._id ? data.donorProfile._id.toString() : (data.donorProfile ? data.donorProfile.toString() : null);
    const requestId = data.request && data.request._id ? data.request._id.toString() : data.request?.toString();

    const payload = {
      ...data,
      donor: donorId,
      donorProfile: donorProfId,
      request: requestId,
      unitsDonated: Number(data.unitsDonated) || 1,
      status: data.status || 'pledged',
      donationDate: data.donationDate ? new Date(data.donationDate) : new Date(),
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : null,
      notes: data.notes || '',
    };

    return await super.create(payload, session);
  }
}

const donationRepo = new DonationRepository();
registerRepository('donations', donationRepo);

module.exports = donationRepo;
