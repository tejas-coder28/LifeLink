const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
    },
    units: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
    },
    licenseNumber: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
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
    phone: {
      type: String,
      default: '',
    },
    inventory: {
      type: [inventoryItemSchema],
      default: [
        { bloodGroup: 'A+', units: 10 },
        { bloodGroup: 'A-', units: 5 },
        { bloodGroup: 'B+', units: 12 },
        { bloodGroup: 'B-', units: 4 },
        { bloodGroup: 'AB+', units: 8 },
        { bloodGroup: 'AB-', units: 2 },
        { bloodGroup: 'O+', units: 15 },
        { bloodGroup: 'O-', units: 6 },
      ],
    },
    isVerified: {
      type: Boolean,
      default: false, // Admin must approve before hospital can post requests
    },
  },
  {
    timestamps: true,
  }
);

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
