const Hospital = require('../models/Hospital');
const User = require('../models/User');

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
  hospital.inventory = inventoryData;
  await hospital.save();
  return hospital;
};

const getAllHospitals = async () => {
  return await Hospital.find().populate('user', 'name email phone accountType hospitalId');
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
  setHospitalVerification,
  deleteHospital,
};
