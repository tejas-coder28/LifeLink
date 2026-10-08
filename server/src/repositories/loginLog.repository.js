const { BaseRepository } = require('./base.repository');
const { registerRepository } = require('./registry');

class LoginLogRepository extends BaseRepository {
  constructor() {
    super('loginLogs');
  }

  async recordLogin(userId, email, ip = '', userAgent = '') {
    const now = new Date();
    // 30 days TTL expiry timestamp for Firestore TTL policy
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return await this.create({
      userId: userId ? userId.toString() : null,
      email: (email || '').trim().toLowerCase(),
      ip,
      userAgent,
      loginAt: now,
      expiresAt,
    });
  }

  /**
   * Cleanup expired login log records (expiry check / fallback)
   */
  async cleanupExpired() {
    const now = new Date();
    const expiredDocs = await this.find({ expiresAt: { $lte: now } });
    if (expiredDocs.length === 0) return 0;
    const batch = this.db.batch();
    for (const d of expiredDocs) {
      batch.delete(this.collection.doc(d._id));
    }
    await batch.commit();
    return expiredDocs.length;
  }
}

const loginLogRepo = new LoginLogRepository();
registerRepository('loginLogs', loginLogRepo);

module.exports = loginLogRepo;
