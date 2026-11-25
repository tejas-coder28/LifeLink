const mongoose = require('mongoose');

const editHistoryEntrySchema = new mongoose.Schema(
  {
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editedAt: { type: Date, default: Date.now },
    changedFields: { type: [String], default: [] },
  },
  { _id: false }
);

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
    hospitalName: {
      type: String,
      default: '',
    },
    patientName: {
      type: String,
      default: '',
      trim: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: 'A+',
    },
    unitsNeeded: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
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
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
    },
    status: {
      type: String,
      enum: [
        'pending_hospital_review',
        'open',
        'matching',
        'partially_fulfilled',
        'fulfilled',
        'cancelled',
        'closed',
        'rejected',
        'hospital_no_response',
        'expired',
        'legacy',
      ],
      default: 'pending_hospital_review',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [77.2090, 28.6139],
      },
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    requiredByDate: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    matchedDonorsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    lastEditedAt: {
      type: Date,
      default: null,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    editHistory: {
      type: [editHistoryEntrySchema],
      default: [],
    },
    cancelReason: {
      type: String,
      default: null,
    },
    cancelReasonLabel: {
      type: String,
      default: null,
    },
    cancelInternalNote: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closeNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

// Equivalent composite indexes from firestore.indexes.json + geo
bloodRequestSchema.index({ status: 1, createdAt: -1 });
bloodRequestSchema.index({ targetHospital: 1, createdAt: -1 });
bloodRequestSchema.index({ targetHospital: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ requester: 1, createdAt: -1 });
bloodRequestSchema.index({ requester: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ bloodGroup: 1, createdAt: -1 });
bloodRequestSchema.index({ bloodGroup: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ urgency: 1, createdAt: -1 });
bloodRequestSchema.index({ urgency: 1, status: 1, createdAt: -1 });
bloodRequestSchema.index({ hospital: 1, createdAt: -1 });
bloodRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.BloodRequest || mongoose.model('BloodRequest', bloodRequestSchema);
