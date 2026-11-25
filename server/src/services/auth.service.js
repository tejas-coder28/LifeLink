const jwt = require('jsonwebtoken');
const User = require('../repositories/user.repository');
const DonorProfile = require('../repositories/donorProfile.repository');
const Hospital = require('../repositories/hospital.repository');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { withTransaction } = require('../config/mongo');

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

  let accountType = reqAccountType;
  if (!accountType) {
    if (role === 'hospital') accountType = 'hospital';
    else accountType = 'user';
  }

  // Security guard: admin accounts can ONLY be created by the seed script.
  if (accountType === 'admin') {
    throw new Error('Admin accounts cannot be created via public registration.');
  }

  const createdUser = await withTransaction(async (session) => {
    let user = await User.create(
      {
        name,
        email: normalizedEmail,
        password,
        accountType: accountType || 'user',
        phone: phone || '',
      },
      session
    );

    if (user.accountType === 'user') {
      await DonorProfile.create(
        {
          user: user._id,
          bloodGroup: bloodGroup || 'O+',
          bloodGroupConfirmed: Boolean(bloodGroup),
          contactNumber: user.phone || '',
          location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139],
          },
        },
        session
      );
    } else if (user.accountType === 'hospital') {
      const hospital = await Hospital.create(
        {
          user: user._id,
          name: `${user.name} Medical Center`,
          phone: user.phone || '',
          location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139],
          },
        },
        session
      );
      user = await User.findByIdAndUpdate(user._id, { hospitalId: hospital._id }, {}, session);
    }

    return user;
  });

  const token = generateToken(createdUser._id, createdUser.accountType);

  return {
    _id: createdUser._id,
    id: createdUser._id,
    name: createdUser.name,
    email: createdUser.email,
    accountType: createdUser.accountType,
    hospitalId: createdUser.hospitalId,
    role: createdUser.accountType,
    phone: createdUser.phone,
    bloodGroup: createdUser.accountType === 'user' ? (bloodGroup || 'O+') : undefined,
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
  } catch (_) {
    // Non-blocking log recording
  }

  return {
    _id: user._id,
    id: user._id,
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
 * Google Login via Firebase Auth ID token verification + MongoDB user store.
 * Existing email logs in unchanged.
 * New email returns needsProfile if bloodGroup not provided,
 * then creates a "user" (never admin or hospital) with donor profile atomically.
 */
const loginWithGoogle = async ({ idToken, bloodGroup, phone }) => {
  const crypto = require('crypto');
  const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');
  const { getAuth, getProjectId } = require('../config/db');

  let decoded;
  try {
    const auth = getAuth();
    decoded = await auth.verifyIdToken(idToken);
  } catch (err) {
    const errClass = err.name || err.code || 'TokenVerificationError';
    console.error(`[GoogleAuth] Error: ${errClass}`);
    const error = new Error(
      err.statusCode === 503
        ? err.message
        : 'Invalid or expired Google authentication token. Please try again.'
    );
    error.statusCode = err.statusCode || 401;
    throw error;
  }

  // Verify the ID token belongs to the matching Firebase project
  const activeProjectId = getProjectId();
  const tokenProjectId = decoded.firebase?.project_id || decoded.aud;
  if (activeProjectId && tokenProjectId && tokenProjectId !== activeProjectId) {
    console.error('[GoogleAuth] Error: ProjectMismatchError');
    const error = new Error('Authentication project mismatch. Please check your Firebase configuration.');
    error.statusCode = 401;
    throw error;
  }

  if (!decoded.email_verified) {
    console.error('[GoogleAuth] Error: EmailNotVerifiedError');
    const error = new Error('Google email address must be verified to continue.');
    error.statusCode = 401;
    throw error;
  }

  const email = (decoded.email || '').trim().toLowerCase();
  let user = await User.findByEmail(email);

  if (user) {
    if (user.accountType === 'hospital' || user.accountType === 'admin') {
      console.error('[GoogleAuth] Error: AccountTypeNotAllowedError');
      const error = new Error(`Account type '${user.accountType}' is not permitted to sign in via Google. Please use email and password.`);
      error.statusCode = 403;
      error.code = 'ACCOUNT_TYPE_NOT_ALLOWED';
      throw error;
    }

    let userBloodGroup = undefined;
    if (user.accountType === 'user') {
      const donorProfile = await DonorProfile.findByUserId(user._id);
      userBloodGroup = donorProfile?.bloodGroup;
    }

    const token = generateToken(user._id, user.accountType);

    try {
      const LoginLog = require('../repositories/loginLog.repository');
      await LoginLog.recordLogin(user._id, user.email);
    } catch (_) {
      // Non-blocking
    }

    return {
      _id: user._id,
      id: user._id,
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

  user = await withTransaction(async (session) => {
    const created = await User.create(
      {
        name: userName,
        email,
        password: generatedPassword,
        accountType: 'user',
        phone: phone || '',
      },
      session
    );

    await DonorProfile.create(
      {
        user: created._id,
        bloodGroup,
        bloodGroupConfirmed: true,
        contactNumber: phone || '',
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139],
        },
      },
      session
    );

    return created;
  });

  const token = generateToken(user._id, user.accountType);

  try {
    const LoginLog = require('../repositories/loginLog.repository');
    await LoginLog.recordLogin(user._id, user.email);
  } catch (_) {
    // Non-blocking
  }

  return {
    _id: user._id,
    id: user._id,
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
  loginWithGoogle,
};
