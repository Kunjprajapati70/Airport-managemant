/**
 * Notification.js
 * In-app notification document. One per user per event.
 * Supports all notification types across the system.
 * Indexed for fast unread queries.
 */

const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    // ── Recipient ─────────────────────────────────────────────────────────────
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // ── Content ───────────────────────────────────────────────────────────────
    type: {
      type:     String,
      enum:     Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // ── Extra payload (for deep-linking or display enrichment) ────────────────
    data: { type: mongoose.Schema.Types.Mixed, default: null },

    // ── Priority ──────────────────────────────────────────────────────────────
    priority: {
      type:    String,
      enum:    ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // ── Read state ────────────────────────────────────────────────────────────
    isRead: { type: Boolean, default: false },
    readAt: { type: Date,    default: null },

    // ── Related entities (for deep-linking) ───────────────────────────────────
    flight:  { type: mongoose.Schema.Types.ObjectId, ref: 'Flight',  default: null },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },

    // ── Expiry (optional — some alerts auto-expire) ───────────────────────────
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true }); // TTL index

module.exports = mongoose.model('Notification', notificationSchema);
