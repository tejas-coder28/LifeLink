const LoginLog = require('../repositories/loginLog.repository');
const Notification = require('../repositories/notification.repository');

/**
 * Periodically or on-demand cleans up expired records based on TTL policy.
 */
async function cleanupExpiredRecords() {
  const [logsCleaned, notifsCleaned] = await Promise.all([
    LoginLog.cleanupExpired(),
    Notification.cleanupExpired(),
  ]);
  console.log(`[TTL Cleanup] Purged ${logsCleaned} expired login logs and ${notifsCleaned} expired notifications.`);
  return { logsCleaned, notifsCleaned };
}

module.exports = {
  cleanupExpiredRecords,
};
