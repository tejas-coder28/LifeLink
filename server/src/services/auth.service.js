const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Hospital = require('../models/Hospital');
const { JWT_SECRET } = require('../middleware/auth.middleware');

const generateToken = (id, accountType) => {
  return jwt.sign({ id, accountType }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (userData) => {
  const { name, email, password, accountType: reqAccountType, role, phone, bloodGroup } = userData;

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error('User already exists with this email address');
  }

  // Support legacy role input mapping
  let accountType = reqAccountType;
  if (!accountType) {
    if (role === 'hospital') accountType = 'hospital';
    else accountType = 'user';
  }

  // Security guard: admin accounts can ONLY be created by the seed script.
  // Block any attempt to register as admin via the API.
  if (accountType === 'admin') {
    throw new Error("Admin accounts cannot be created via public registration.");
  }

  const user = await User.create({
    name,
    email,
    password,
    accountType: accountType || 'user',
    phone: phone || '',
  });

  // Automatically create linked domain entity based on accountType
  if (user.accountType === 'user') {
    await DonorProfile.create({
      user: user._id,
      bloodGroup: bloodGroup || 'O+',
      bloodGroupConfirmed: Boolean(bloodGroup),
      contactNumber: user.phone || '',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
    });
  } else if (user.accountType === 'hospital') {
    const hospital = await Hospital.create({
      user: user._id,
      name: `${user.name} Medical Center`,
      phone: user.phone || '',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
    });
    user.hospitalId = hospital._id;
    await user.save();
  }

  const token = generateToken(user._id, user.accountType);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    hospitalId: user.hospitalId,
    role: user.accountType, // Backwards compatibility
    phone: user.phone,
    bloodGroup: user.accountType === 'user' ? (bloodGroup || 'O+') : undefined,
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new Error('Invalid email or password');
  }

  let bloodGroup = undefined;
  if (user.accountType === 'user') {
    const donorProfile = await DonorProfile.findOne({ user: user._id }).select('bloodGroup');
    bloodGroup = donorProfile?.bloodGroup;
  }

  const token = generateToken(user._id, user.accountType);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    hospitalId: user.hospitalId,
    role: user.accountType, // Backwards compatibility
    phone: user.phone,
    bloodGroup,
    token,
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  let profile = null;
  if (user.accountType === 'user') {
    profile = await DonorProfile.findOne({ user: user._id });
  } else if (user.accountType === 'hospital') {
    profile = await Hospital.findOne({ user: user._id });
  }

  return {
    user,
    profile,
  };
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
