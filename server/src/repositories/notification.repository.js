const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  async create(data, transaction = null) {
    const recipientId = data.recipient && data.recipient._id ? data.recipient._id.toString() : data.recipient?.toString();
    const now = new Date();
    // Default 30-day TTL expiry for notifications (Firestore TTL policy support)
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const payload = {
      ...data,
      recipient: recipientId,
      title: data.title || '',
      message: data.message || '',
      type: data.type || 'general',
      isRead: Boolean(data.isRead),
      link: data.link || '',
      expiresAt,
    };

    return await super.create(payload, transaction);
  }

  async insertMany(docs = []) {
    const formatted = docs.map(d => {
      const recipientId = d.recipient && d.recipient._id ? d.recipient._id.toString() : d.recipient?.toString();
      const now = new Date();
      return {
        ...d,
        recipient: recipientId,
        title: d.title || '',
        message: d.message || '',
        type: d.type || 'general',
        isRead: Boolean(d.isRead),
        link: d.link || '',
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      };
    });
    return await super.insertMany(formatted);
  }

  async findByRecipient(userId, limit = 20) {
    const idStr = userId && userId._id ? userId._id.toString() : userId.toString();
    return await this.find({ recipient: idStr })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async markAsRead(notificationId, userId) {
    const notif = await this.findById(notificationId);
    if (!notif) throw new Error('Notification not found');
    const uId = userId && userId._id ? userId._id.toString() : userId.toString();
    if (notif.recipient.toString() !== uId) {
      throw new Error('Unauthorized');
    }
    return await this.findByIdAndUpdate(notificationId, { isRead: true });
  }

  /**
   * Cleanup expired notifications (expiry check / TTL fallback)
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

const notificationRepo = new NotificationRepository();
registerRepository('notifications', notificationRepo);

module.exports = notificationRepo;
