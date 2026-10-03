const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { notifyMatchedDonorsForRequest } = require('./notification.service');

const createRequest = async (userId, requestData) => {
  const {
    patientName,
    bloodGroup,
    unitsNeeded,
    urgency,
    address,
    coordinates,
    hospitalId,
    requiredByDate,
    notes,
  } = requestData;

  // Verification gate: if the requester is a hospital account, they must be verified
  // Individual users are allowed to post requests without this check
  const requester = await User.findById(userId).select('accountType');
  if (requester && requester.accountType === 'hospital') {
    const hospitalProfile = await Hospital.findOne({ user: userId }).select('isVerified name');
    if (!hospitalProfile || !hospitalProfile.isVerified) {
      throw new Error(
        'Your hospital account is pending admin approval. You cannot post blood requests until verified.'
      );
    }
  }

  const bloodRequest = await BloodRequest.create({
    requester: userId,
    hospital: hospitalId || null,
    patientName,
    bloodGroup,
    unitsNeeded,
    urgency: urgency || 'high',
    address,
    location: {
      type: 'Point',
      coordinates: coordinates || [77.2090, 28.6139],
    },
    requiredByDate: requiredByDate ? new Date(requiredByDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    notes: notes || '',
    status: 'open',
  });

  const populatedRequest = await bloodRequest.populate('requester', 'name email phone');

  // Trigger Notification Stub to alert top candidate donors
  try {
    const notificationResult = await notifyMatchedDonorsForRequest(populatedRequest);
    if (notificationResult && notificationResult.count) {
      bloodRequest.matchedDonorsCount = notificationResult.count;
      await bloodRequest.save();
    }
  } catch (err) {
    console.error('Failed to notify donors:', err.message);
  }

  return bloodRequest;
};

const getRequests = async (filters = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.bloodGroup) query.bloodGroup = filters.bloodGroup;
  if (filters.requesterId) query.requester = filters.requesterId;
  if (filters.urgency) query.urgency = filters.urgency;

  return await BloodRequest.find(query)
    .populate('requester', 'name email phone')
    .populate('hospital', 'name phone address')
    .sort({ createdAt: -1 });
};

const getRequestById = async (id) => {
  const request = await BloodRequest.findById(id)
    .populate('requester', 'name email phone')
    .populate('hospital', 'name phone address');

  if (!request) throw new Error('Blood request not found');
  return request;
};

const updateRequestStatus = async (id, status) => {
  const request = await BloodRequest.findById(id);
  if (!request) throw new Error('Blood request not found');

  request.status = status;
  await request.save();

  return await request.populate('requester', 'name email phone');
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
};
