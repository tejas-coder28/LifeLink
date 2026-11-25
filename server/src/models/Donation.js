const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorProfile',
      default: null,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    unitsDonated: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pledged', 'completed', 'fulfilled', 'cancelled', 'released', 'rejected'],
      default: 'pledged',
    },
    hospitalName: {
      type: String,
      default: null,
    },
    donationDate: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    releasedReason: {
      type: String,
      default: null,
    },
    releaseReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
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

// Composite indexes
donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ donor: 1, request: 1 });
donationSchema.index({ donor: 1, status: 1, createdAt: -1 });
donationSchema.index({ request: 1, createdAt: -1 });

// Unique partial index: enforces max 1 active pledge ('pledged') per donor at the DB level
donationSchema.index(
  { donor: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pledged' },
    name: 'unique_active_pledge_per_donor',
  }
);

module.exports = mongoose.models.Donation || mongoose.model('Donation', donationSchema);
