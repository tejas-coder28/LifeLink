const jwt = require('jsonwebtoken');
const User = require('../repositories/user.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const Hospital = require('../repositories/hospital.repository');
const { JWT_SECRET } = require('../middleware/auth.middleware');

const generateToken = (id, accountType) => {
  return jwt.sign({ id, accountType }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (userData) => {
  const { name, email, password, accountType: reqAccountType, role, phone, bloodGroup } = userData;

  const normalizedEmail = (email || '').trim().toLowerCase();
  const userExists = await User.findByEmail(normalizedEmail);
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

  // Atomically create user with unique email transaction
  const user = await User.create({
    name,
    email: normalizedEmail,
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
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await User.findByEmail(normalizedEmail);

  if (!user || !(await user.matchPassword(password))) {
    throw new Error('Invalid email or password');
  }

  let bloodGroup = undefined;
  if (user.accountType === 'user') {
    const donorProfile = await DonorProfile.findByUserId(user._id);
    bloodGroup = donorProfile?.bloodGroup;
  }

  const token = generateToken(user._id, user.accountType);

  try {
    const LoginLog = require('../repositories/loginLog.repository');
    await LoginLog.recordLogin(user._id, user.email);
  } catch (logErr) {
    // Non-blocking log recording
  }

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
    profile = await DonorProfile.findByUserId(user._id);
  } else if (user.accountType === 'hospital') {
    profile = await Hospital.findByUserId(user._id);
  }

  return {
    user,
    profile,
  };
};

/**
 * Google Login via Firebase Auth ID token verification.
 * Existing email logs in unchanged.
 * New email returns needsProfile if bloodGroup not provided,
 * then creates a "user" (never admin or hospital) with donor profile.
 */
const loginWithGoogle = async ({ idToken, bloodGroup, phone }) => {
  const crypto = require('crypto');
  const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');
  const { getAuth } = require('../config/db');

  let decoded;
  try {
    const auth = getAuth();
    decoded = await auth.verifyIdToken(idToken);
  } catch (err) {
    const error = new Error('Invalid or expired Google authentication token');
    error.statusCode = 401;
    throw error;
  }

  if (!decoded.email_verified) {
    const error = new Error('Google email address must be verified to continue');
    error.statusCode = 401;
    throw error;
  }

  const email = (decoded.email || '').trim().toLowerCase();
  let user = await User.findByEmail(email);

  if (user) {
    // Existing user logs in unchanged
    let userBloodGroup = undefined;
    if (user.accountType === 'user') {
      const donorProfile = await DonorProfile.findByUserId(user._id);
      userBloodGroup = donorProfile?.bloodGroup;
    }

    const token = generateToken(user._id, user.accountType);

    try {
      const LoginLog = require('../repositories/loginLog.repository');
      await LoginLog.recordLogin(user._id, user.email);
    } catch (logErr) {
      // Non-blocking log recording
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      hospitalId: user.hospitalId,
      role: user.accountType,
      phone: user.phone,
      bloodGroup: userBloodGroup,
      token,
    };
  }

  // New user: requires bloodGroup before creating account
  if (!bloodGroup) {
    return {
      needsProfile: true,
      email: decoded.email,
      name: decoded.name || '',
    };
  }

  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    const error = new Error(`Invalid blood group. Must be one of: ${BLOOD_GROUPS.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const generatedPassword = crypto.randomBytes(24).toString('hex');
  const userName = decoded.name || email.split('@')[0];

  // Strictly create as accountType 'user' (never admin or hospital)
  user = await User.create({
    name: userName,
    email,
    password: generatedPassword,
    accountType: 'user',
    phone: phone || '',
  });

  await DonorProfile.create({
    user: user._id,
    bloodGroup,
    bloodGroupConfirmed: true,
    contactNumber: phone || '',
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139],
    },
  });

  const token = generateToken(user._id, user.accountType);

  try {
    const LoginLog = require('../repositories/loginLog.repository');
    await LoginLog.recordLogin(user._id, user.email);
  } catch (logErr) {
    // Non-blocking log recording
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    hospitalId: user.hospitalId,
    role: user.accountType,
    phone: user.phone,
    bloodGroup,
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  generateToken,
  loginWithGoogle,
};
