const NotificationModel = require('../models/Notification');
const { BaseRepository, isValidObjectId } = require('./base.repository');
const { registerRepository } = require('./registry');

class NotificationRepository extends BaseRepository {
  constructor() {
    super(NotificationModel);
  }

  async create(data, session = null) {
    const recipientId = data.recipient && data.recipient._id ? data.recipient._id.toString() : data.recipient?.toString();
    const now = new Date();
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

    return await super.create(payload, session);
  }

  async insertMany(docs = [], session = null) {
    const formatted = docs.map((d) => {
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
    return await super.insertMany(formatted, session);
  }

  async findByRecipient(userId, limit = 20) {
    const idStr = userId && userId._id ? userId._id.toString() : userId.toString();
    if (!isValidObjectId(idStr)) return [];
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

  async cleanupExpired() {
    const now = new Date();
    const res = await this.deleteMany({ expiresAt: { $lte: now } });
    return res.deletedCount || 0;
  }
}

const notificationRepo = new NotificationRepository();
registerRepository('notifications', notificationRepo);

module.exports = notificationRepo;
