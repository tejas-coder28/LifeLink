/**
 * server/src/repositories/auditLog.repository.js
 *
 * Repository for recording security and operational audit log events
 * (request cancellations, edits, rate limits, sensitive administrative actions).
 */

const { BaseRepository } = require('./base.repository');
const { registerRepository } = require('./registry');

class AuditLogRepository extends BaseRepository {
  constructor() {
    super('audit_logs');
  }

  async record(entry = {}) {
    const now = new Date();
    const payload = {
      action: entry.action || 'unknown',
      targetId: entry.targetId ? entry.targetId.toString() : null,
      targetType: entry.targetType || 'BloodRequest',
      actor: entry.actor ? entry.actor.toString() : null,
      actorRole: entry.actorRole || 'user',
      hospitalId: entry.hospitalId ? entry.hospitalId.toString() : null,
      reasonCode: entry.reasonCode || '',
      note: entry.note || '',
      changedFields: entry.changedFields || [],
      metadata: entry.metadata || {},
      createdAt: entry.createdAt || now,
    };
    return await this.create(payload);
  }
}

const auditLogRepo = new AuditLogRepository();
registerRepository('auditLogs', auditLogRepo);

module.exports = auditLogRepo;

