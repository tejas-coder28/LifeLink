const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    units: {
      type: Number,
      default: 0,
      min: [0, 'Inventory units cannot be negative'],
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
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
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
      trim: true,
    },
    inventory: {
      type: [inventoryItemSchema],
      default: () => [
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

hospitalSchema.index({ isVerified: 1, name: 1 });
hospitalSchema.index({ isVerified: 1, createdAt: -1 });
hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
