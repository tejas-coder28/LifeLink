const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    targetHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
    },
    unitsNeeded: {
      type: Number,
      required: [true, 'Units needed is required'],
      min: 1,
    },
    unitsFromStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitsFromDonors: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitsFulfilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        default: [77.2090, 28.6139],
      },
    },
    address: {
      type: String,
      required: [true, 'Hospital / Delivery address is required'],
    },
    status: {
      type: String,
      enum: [
        'pending_hospital_review',
        'open',
        'matching',
        'partially_fulfilled',
        'fulfilled',
        'rejected',
        'hospital_no_response',
        'cancelled',
        'expired',
        'legacy',
      ],
      default: 'pending_hospital_review',
    },
    requiredByDate: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours from now
    },
    notes: {
      type: String,
      default: '',
    },
    matchedDonorsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
