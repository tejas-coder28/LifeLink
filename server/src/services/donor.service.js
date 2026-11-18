const DonorProfile = require('../repositories/donorProfile.repository');
const User = require('../repositories/user.repository');
const { compatibleDonorGroups } = require('../utils/bloodCompatibility');
const { calculateHaversineDistance } = require('../utils/geo');
const { isProfileComplete } = require('./donorBadge.service');

const getProfileByUserId = async (userId) => {
  let profile = await DonorProfile.findOne({ user: userId }).populate('user', 'name email phone accountType hospitalId');
  if (!profile) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    profile = await DonorProfile.create({
      user: userId,
      bloodGroup: '',
      bloodGroupConfirmed: false,
      contactNumber: user.phone || '',
      profileComplete: false,
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
    });
    profile = await profile.populate('user', 'name email phone accountType hospitalId');
  }
  const complete = isProfileComplete(profile);
  return {
    ...profile,
    profileComplete: profile.profileComplete !== undefined ? profile.profileComplete : complete,
  };
};

const updateProfileByUserId = async (userId, updateData) => {
  const {
    bloodGroup,
    coordinates,
    address,
    lastDonationDate,
    isAvailable,
    age,
    gender,
    healthFlags,
    contactNumber,
    is18Plus,
    isWeight50KgPlus,
    consentContact,
    dob,
  } = updateData;

  let profile = await DonorProfile.findOne({ user: userId });
  if (!profile) {
    profile = await DonorProfile.create({
      user: userId,
      bloodGroup: bloodGroup || '',
      bloodGroupConfirmed: Boolean(bloodGroup),
      contactNumber: contactNumber || '',
      profileComplete: false,
    });
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
  if (lastDonationDate !== undefined) profile.lastDonationDate = lastDonationDate ? new Date(lastDonationDate) : null;
  if (isAvailable !== undefined) profile.isAvailable = isAvailable;
  if (age !== undefined) profile.age = age;
  if (gender !== undefined) profile.gender = gender;
  if (healthFlags !== undefined) profile.healthFlags = healthFlags;
  if (contactNumber !== undefined) {
    profile.contactNumber = contactNumber;
    await User.findByIdAndUpdate(userId, { phone: contactNumber });
  }
  if (is18Plus !== undefined) profile.is18Plus = Boolean(is18Plus);
  if (isWeight50KgPlus !== undefined) profile.isWeight50KgPlus = Boolean(isWeight50KgPlus);
  if (consentContact !== undefined) profile.consentContact = Boolean(consentContact);
  if (dob !== undefined) profile.dob = dob;

  profile.profileComplete = isProfileComplete(profile);

  await profile.save();
  const populated = await profile.populate('user', 'name email phone accountType hospitalId');
  return {
    ...populated,
    profileComplete: profile.profileComplete,
  };
};

const searchDonors = async ({ bloodGroup, lat, lng, radiusKm = 50, availableOnly = true }) => {
  let compatibleGroups = null;
  if (bloodGroup && bloodGroup !== 'ALL') {
    compatibleGroups = compatibleDonorGroups(bloodGroup);
  }

  // Filter by availability and blood group in Firestore
  let donors = await DonorProfile.findCandidates(compatibleGroups, availableOnly);
  donors = await DonorProfile.populateDocs(donors, [
    { path: 'user', select: 'name email phone accountType hospitalId' },
  ]);

  // Compute Haversine distance in code to avoid complex geo queries and keep reads low
  if (lat && lng) {
    const originCoords = [parseFloat(lng), parseFloat(lat)];
    donors = donors
      .map(d => {
        const dCoords = d.location?.coordinates || [77.2090, 28.6139];
        const distanceKm = calculateHaversineDistance(originCoords, dCoords);
        return { donor: d, distanceKm };
      })
      .filter(item => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(item => item.donor);
  }

  return donors.slice(0, 50);
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
