const LoginLogModel = require('../models/LoginLog');
const { BaseRepository } = require('./base.repository');
const { registerRepository } = require('./registry');

class LoginLogRepository extends BaseRepository {
  constructor() {
    super(LoginLogModel);
  }

  async recordLogin(userId, email, ip = '', userAgent = '') {
    const now = new Date();
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

  async cleanupExpired() {
    const now = new Date();
    const res = await this.deleteMany({ expiresAt: { $lte: now } });
    return res.deletedCount || 0;
  }
}

const loginLogRepo = new LoginLogRepository();
registerRepository('loginLogs', loginLogRepo);

module.exports = loginLogRepo;
