/**
 * notificationController.js
 * Manages the notification inbox for each user.
 *
 * Endpoints:
 *   GET    /api/notifications              - paginated list with unread count
 *   PATCH  /api/notifications/read-all    - mark all as read
 *   PATCH  /api/notifications/:id/read    - mark one as read
 *   DELETE /api/notifications/:id         - delete one
 *   DELETE /api/notifications             - clear all
 *   POST   /api/notifications/test        - send a test notification (dev only)
 *   POST   /api/notifications/broadcast   - admin broadcast to all users
 */

const Notification = require('../models/Notification');
const User         = require('../models/User');
const AppError     = require('../utils/AppError');
const { emitToUser, broadcast } = require('../socket');
const { NOTIFICATION_TYPES, ROLES } = require('../config/constants');

// ── GET /api/notifications ────────────────────────────────────────────────────
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { isRead, type, page = 1, limit = 30 } = req.query;

    const query = { user: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type)                 query.type   = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) { next(err); }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return next(new AppError('Notification not found.', 404));
    res.json({ success: true, message: 'Notification marked as read.', notification: notif });
  } catch (err) { next(err); }
};

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
exports.deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id:  req.params.id,
      user: req.user._id,
    });
    if (!notif) return next(new AppError('Notification not found.', 404));
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) { next(err); }
};

// ── DELETE /api/notifications ─────────────────────────────────────────────────
exports.clearAll = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ user: req.user._id });
    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) cleared.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) { next(err); }
};

// ── POST /api/notifications/test (dev only) ───────────────────────────────────
exports.sendTest = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError('Test notifications are not available in production.', 403));
    }

    const { type = NOTIFICATION_TYPES.SYSTEM, title = 'Test Notification', message = 'This is a test notification.' } = req.body;

    const notif = await Notification.create({
      user:     req.user._id,
      type,
      title,
      message,
      priority: 'normal',
    });

    emitToUser(req.user._id.toString(), 'notification', notif);

    res.json({ success: true, message: 'Test notification sent.', notification: notif });
  } catch (err) { next(err); }
};

// ── POST /api/notifications/broadcast (admin only) ───────────────────────────
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, type = NOTIFICATION_TYPES.SYSTEM, targetRole, priority = 'normal' } = req.body;

    if (!title || !message) {
      return next(new AppError('Title and message are required.', 400));
    }

    // Find target users
    const query = { isActive: true };
    if (targetRole) query.role = targetRole;

    const users = await User.find(query).select('_id').lean();

    let count = 0;
    for (const user of users) {
      const notif = await Notification.create({
        user:     user._id,
        type,
        title,
        message,
        priority,
      });
      emitToUser(user._id.toString(), 'notification', notif);
      count++;
    }

    res.json({
      success: true,
      message: `Broadcast sent to ${count} user(s).`,
      count,
    });
  } catch (err) { next(err); }
};
