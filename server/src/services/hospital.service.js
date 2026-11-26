const Hospital = require('../repositories/hospital.repository');
const User = require('../repositories/user.repository');
const InventoryTransaction = require('../repositories/inventoryTransaction.repository');
const AuditLog = require('../repositories/auditLog.repository');
const { withTransaction } = require('../config/mongo');

const getHospitalByUserId = async (userId) => {
  let hospital = await Hospital.findOne({ user: userId }).populate('user', 'name email phone accountType hospitalId');
  if (!hospital) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    hospital = await Hospital.create({
      user: userId,
      name: `${user.name} Center`,
      phone: user.phone || '',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
    });
    hospital = await hospital.populate('user', 'name email phone accountType hospitalId');
  }
  return hospital;
};

const updateInventoryByUserId = async (userId, inventoryData) => {
  return await withTransaction(async (session) => {
    const hospital = await Hospital.findOne({ user: userId }, session);
    if (!hospital) {
      throw new Error('Hospital profile not found');
    }

    const oldInventoryMap = new Map();
    (hospital.inventory || []).forEach((item) => {
      oldInventoryMap.set(item.bloodGroup, item.units || 0);
    });

    const transactionsToCreate = [];
    (inventoryData || []).forEach((item) => {
      const prevUnits = oldInventoryMap.get(item.bloodGroup) || 0;
      const diff = (item.units || 0) - prevUnits;
      if (diff !== 0) {
        transactionsToCreate.push({
          hospital: hospital._id,
          bloodGroup: item.bloodGroup,
          change: diff,
          reason: 'manual_update',
          actor: userId,
          notes: `Manual inventory adjustment (${diff > 0 ? '+' : ''}${diff} units)`,
        });
      }
    });

    const updated = await Hospital.findByIdAndUpdate(
      hospital._id,
      { inventory: inventoryData },
      {},
      session
    );

    if (transactionsToCreate.length > 0) {
      await InventoryTransaction.insertMany(transactionsToCreate, session);
    }

    return updated;
  });
};

const getAllHospitals = async () => {
  return await Hospital.find().populate('user', 'name email phone accountType hospitalId');
};

const getVerifiedHospitals = async () => {
  return await Hospital.find({ isVerified: true })
    .populate('user', 'name email phone accountType hospitalId')
    .sort({ name: 1 });
};

const getInventoryTransactions = async (hospitalId, limit = 20) => {
  return await InventoryTransaction.find({ hospital: hospitalId })
    .populate('actor', 'name email accountType')
    .populate('donor', 'name email')
    .populate('request', 'patientName bloodGroup unitsNeeded')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Admin: approve or reject a hospital atomically inside Mongo session
const setHospitalVerification = async (hospitalId, isVerified) => {
  const updated = await withTransaction(async (session) => {
    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { isVerified: Boolean(isVerified) },
      {},
      session
    );
    if (!hospital) {
      const err = new Error('Hospital not found');
      err.statusCode = 404;
      throw err;
    }

    await AuditLog.record(
      {
        action: isVerified ? 'hospital_approved' : 'hospital_verification_revoked',
        targetId: hospital._id,
        targetType: 'Hospital',
        hospitalId: hospital._id,
        metadata: { isVerified: Boolean(isVerified) },
      },
      session
    );

    return hospital;
  });

  return await updated.populate('user', 'name email phone accountType hospitalId');
};

// Admin: delete a hospital record
const deleteHospital = async (hospitalId) => {
  const hospital = await Hospital.findByIdAndDelete(hospitalId);
  if (!hospital) throw new Error('Hospital not found');
  return hospital;
};

module.exports = {
  getHospitalByUserId,
  updateInventoryByUserId,
  getAllHospitals,
  getVerifiedHospitals,
  getInventoryTransactions,
  setHospitalVerification,
  deleteHospital,
};
