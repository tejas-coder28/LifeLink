const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Emergency Donor Network Analysis',
    },
    summary: {
      type: String,
      default: '',
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    recommendations: {
      type: [String],
      default: [],
    },
    rawResponse: {
      type: String,
      default: '',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
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

aiInsightSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AIInsight || mongoose.model('AIInsight', aiInsightSchema);
