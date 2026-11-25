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
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
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

donorRequestPingSchema.index({ donorId: 1, status: 1, sentAt: -1 });
donorRequestPingSchema.index({ requestId: 1, sentAt: -1 });
donorRequestPingSchema.index({ requestId: 1, status: 1 });
donorRequestPingSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
donorRequestPingSchema.index({ hospitalId: 1, sentAt: -1 });

module.exports = mongoose.models.DonorRequestPing || mongoose.model('DonorRequestPing', donorRequestPingSchema);
