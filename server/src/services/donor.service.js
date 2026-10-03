const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const { compatibleDonorGroups } = require('../utils/bloodCompatibility');

const getProfileByUserId = async (userId) => {
  let profile = await DonorProfile.findOne({ user: userId }).populate('user', 'name email phone accountType hospitalId');
  if (!profile) {
    // If not existing yet, create default
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    profile = await DonorProfile.create({
      user: userId,
      bloodGroup: 'O+',
      contactNumber: user.phone || '',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
    });
    profile = await profile.populate('user', 'name email phone accountType hospitalId');
  }
  return profile;
};

const updateProfileByUserId = async (userId, updateData) => {
  const { bloodGroup, coordinates, address, lastDonationDate, isAvailable, age, gender, healthFlags, contactNumber } = updateData;

  let profile = await DonorProfile.findOne({ user: userId });
  if (!profile) {
    profile = new DonorProfile({ user: userId, bloodGroup: bloodGroup || 'O+' });
  }

  if (bloodGroup) {
    profile.bloodGroup = bloodGroup;
    profile.bloodGroupConfirmed = true;
  }
  if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
    profile.location = {
      type: 'Point',
      coordinates: [coordinates[0], coordinates[1]], // [lng, lat]
    };
  }
  if (address !== undefined) profile.address = address;
  if (lastDonationDate !== undefined) profile.lastDonationDate = lastDonationDate;
  if (isAvailable !== undefined) profile.isAvailable = isAvailable;
  if (age !== undefined) profile.age = age;
  if (gender !== undefined) profile.gender = gender;
  if (healthFlags !== undefined) profile.healthFlags = healthFlags;
  if (contactNumber !== undefined) {
    profile.contactNumber = contactNumber;
    await User.findByIdAndUpdate(userId, { phone: contactNumber });
  }

  await profile.save();
  return await profile.populate('user', 'name email phone accountType hospitalId');
};

const searchDonors = async ({ bloodGroup, lat, lng, radiusKm = 50, availableOnly = true }) => {
  const query = {};

  if (availableOnly) {
    query.isAvailable = true;
  }

  if (bloodGroup && bloodGroup !== 'ALL') {
    const compatibleGroups = compatibleDonorGroups(bloodGroup);
    query.bloodGroup = { $in: compatibleGroups };
  }

  if (lat && lng) {
    const radiusInMeters = radiusKm * 1000;
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: radiusInMeters,
      },
    };
  }

  const donors = await DonorProfile.find(query)
    .populate('user', 'name email phone accountType hospitalId')
    .limit(50);

  return donors;
};

const getAllDonors = async () => {
  return await DonorProfile.find().populate('user', 'name email phone accountType hospitalId');
};

module.exports = {
  getProfileByUserId,
  updateProfileByUserId,
  searchDonors,
  getAllDonors,
};
