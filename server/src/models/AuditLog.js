const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      default: 'unknown',
    },
    targetId: {
      type: String,
      default: null,
    },
    targetType: {
      type: String,
      default: 'BloodRequest',
    },
    actor: {
      type: String,
      default: null,
    },
    actorRole: {
      type: String,
      default: 'user',
    },
    hospitalId: {
      type: String,
      default: null,
    },
    reasonCode: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
    },
    changedFields: {
      type: [String],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'audit_logs',
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

auditLogSchema.index({ targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
