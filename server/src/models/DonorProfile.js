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
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [77.2090, 28.6139], // Default New Delhi coordinates
      },
    },
    address: {
      type: String,
      default: '',
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
      min: 18,
      max: 65,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    healthFlags: {
      type: [String],
      default: ['none'],
    },
    contactNumber: {
      type: String,
      default: '',
    },
    totalDonations: {
      type: Number,
      default: 0,
    },
    bloodGroupConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for proximity matching engine queries
donorProfileSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DonorProfile', donorProfileSchema);
