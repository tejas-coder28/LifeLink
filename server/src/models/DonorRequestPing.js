const mongoose = require('mongoose');

const donorRequestPingSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
      default: 'pending',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find pings per request and donor
donorRequestPingSchema.index({ requestId: 1, donorId: 1 });
donorRequestPingSchema.index({ donorId: 1, status: 1 });

module.exports = mongoose.model('DonorRequestPing', donorRequestPingSchema);
