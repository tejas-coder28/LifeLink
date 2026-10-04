const Hospital = require('../models/Hospital');
const User = require('../models/User');
const InventoryTransaction = require('../models/InventoryTransaction');

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
  let hospital = await Hospital.findOne({ user: userId });
  if (!hospital) {
    throw new Error('Hospital profile not found');
  }

  // Calculate stock differences to log in InventoryTransaction
  const oldInventoryMap = new Map();
  (hospital.inventory || []).forEach(item => {
    oldInventoryMap.set(item.bloodGroup, item.units || 0);
  });

  const transactionsToCreate = [];
  (inventoryData || []).forEach(item => {
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

  hospital.inventory = inventoryData;
  await hospital.save();

  if (transactionsToCreate.length > 0) {
    await InventoryTransaction.insertMany(transactionsToCreate);
  }

  return hospital;
};

const getAllHospitals = async () => {
  return await Hospital.find().populate('user', 'name email phone accountType hospitalId');
};

const getVerifiedHospitals = async () => {
  return await Hospital.find({ isVerified: true })
    .select('_id name address location phone isVerified')
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

// Admin: approve or reject a hospital (sets isVerified true/false)
const setHospitalVerification = async (hospitalId, isVerified) => {
  const hospital = await Hospital.findByIdAndUpdate(
    hospitalId,
    { isVerified },
    { new: true }
  ).populate('user', 'name email phone accountType hospitalId');
  if (!hospital) throw new Error('Hospital not found');
  return hospital;
};

// Admin: delete a hospital record (and optionally its user)
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

