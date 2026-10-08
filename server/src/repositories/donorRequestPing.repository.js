const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class DonorRequestPingRepository extends BaseRepository {
  constructor() {
    super('donorRequestPings');
  }

  async create(data, transaction = null) {
    const requestId = data.requestId && data.requestId._id ? data.requestId._id.toString() : data.requestId?.toString();
    const donorId = data.donorId && data.donorId._id ? data.donorId._id.toString() : data.donorId?.toString();
    const hospitalId = data.hospitalId && data.hospitalId._id ? data.hospitalId._id.toString() : data.hospitalId?.toString();

    const payload = {
      ...data,
      requestId,
      donorId,
      hospitalId,
      status: data.status || 'pending',
      sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
      respondedAt: data.respondedAt ? new Date(data.respondedAt) : null,
    };

    return await super.create(payload, transaction);
  }

  async findByRequestAndDonor(requestId, donorId) {
    const rId = requestId && requestId._id ? requestId._id.toString() : requestId.toString();
    const dId = donorId && donorId._id ? donorId._id.toString() : donorId.toString();
    return await this._executeFindOne({ requestId: rId, donorId: dId });
  }

  async findByRequestId(requestId) {
    const rId = requestId && requestId._id ? requestId._id.toString() : requestId.toString();
    return await this.find({ requestId: rId })
      .populate('donorId', 'name email phone bloodGroup')
      .sort({ sentAt: -1 });
  }

  async findPendingByDonor(donorId) {
    const dId = donorId && donorId._id ? donorId._id.toString() : donorId.toString();
    return await this.find({ donorId: dId, status: 'pending' })
      .populate('requestId', 'patientName bloodGroup unitsNeeded urgency address location requiredByDate status notes')
      .populate('hospitalId', 'name email phone')
      .sort({ sentAt: -1 });
  }
}

const donorRequestPingRepo = new DonorRequestPingRepository();
registerRepository('donorRequestPings', donorRequestPingRepo);

module.exports = donorRequestPingRepo;
