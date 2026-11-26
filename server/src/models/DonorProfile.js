const mongoose = require('mongoose');

const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bloodGroup: {
      type: String,
      default: '',
      enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    bloodGroupConfirmed: {
      type: Boolean,
      default: false,
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
    lastDonationDate: {
      type: Date,
      default: null,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      default: null,
    },
    dob: {
      type: String,
      default: null,
    },
    healthFlags: {
      type: [String],
      default: () => ['none'],
    },
    contactNumber: {
      type: String,
      default: '',
      trim: true,
    },
    completedDonations: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDonations: {
      type: Number,
      default: 0,
      min: 0,
    },
    profileComplete: {
      type: Boolean,
      default: undefined,
    },
    is18Plus: {
      type: Boolean,
      default: false,
    },
    isWeight50KgPlus: {
      type: Boolean,
      default: false,
    },
    consentContact: {
      type: Boolean,
      default: false,
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

donorProfileSchema.index({ isAvailable: 1, bloodGroup: 1 });
donorProfileSchema.index({ isAvailable: 1, createdAt: -1 });
donorProfileSchema.index({ bloodGroup: 1, createdAt: -1 });
donorProfileSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.DonorProfile || mongoose.model('DonorProfile', donorProfileSchema);
