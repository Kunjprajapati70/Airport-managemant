/**
 * SecurityCheck.js
 * One security check record per passenger per flight.
 * Created automatically at check-in time.
 * Updated by security officers at the security desk.
 *
 * The status field controls boarding:
 *   pending  → boarding allowed (default — not yet reviewed)
 *   cleared  → boarding allowed
 *   flagged  → boarding BLOCKED until reviewed
 *   rejected → boarding BLOCKED permanently
 */

const mongoose = require('mongoose');
const { SECURITY_STATUS } = require('../config/constants');

// ── Restricted item log entry ─────────────────────────────────────────────────
const restrictedItemSchema = new mongoose.Schema({
  item:        { type: String, required: true },
  description: { type: String, default: null },
  action:      { type: String, enum: ['confiscated', 'returned', 'allowed', 'escalated'], default: 'confiscated' },
  loggedAt:    { type: Date, default: Date.now },
  loggedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: true });

// ── Incident log entry ────────────────────────────────────────────────────────
const incidentLogSchema = new mongoose.Schema({
  type:        { type: String, enum: ['document_issue', 'baggage_issue', 'behaviour', 'watchlist_match', 'other'], required: true },
  description: { type: String, required: true },
  severity:    { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  loggedAt:    { type: Date, default: Date.now },
  loggedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: true });

// ── Main schema ───────────────────────────────────────────────────────────────
const securityCheckSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────────────────────────────────
    booking:            { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',   required: true },
    flight:             { type: mongoose.Schema.Types.ObjectId, ref: 'Flight',    required: true },
    passenger:          { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', default: null },
    bookingPassengerId: { type: mongoose.Schema.Types.ObjectId }, // sub-doc _id in booking.passengers

    // ── Passenger snapshot ────────────────────────────────────────────────────
    passengerName:   { type: String, required: true },
    passportNumber:  { type: String, default: null },
    nationality:     { type: String, default: null },
    seatNumber:      { type: String, default: null },
    seatClass:       { type: String, default: null },

    // ── Officer ───────────────────────────────────────────────────────────────
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    { values: Object.values(SECURITY_STATUS), message: 'Invalid security status: {VALUE}' },
      default: SECURITY_STATUS.PENDING,
    },

    // ── Verification checklist ────────────────────────────────────────────────
    documentVerified:    { type: Boolean, default: false },
    baggageCleared:      { type: Boolean, default: false },
    biometricVerified:   { type: Boolean, default: false },
    visaVerified:        { type: Boolean, default: false },

    // ── Watchlist ─────────────────────────────────────────────────────────────
    isWatchlisted:   { type: Boolean, default: false },
    watchlistReason: { type: String,  default: null },

    // ── Flag / rejection ──────────────────────────────────────────────────────
    flagReason:    { type: String, default: null },
    rejectedAt:    { type: Date,   default: null },
    clearedAt:     { type: Date,   default: null },

    // ── Restricted items log ──────────────────────────────────────────────────
    restrictedItems: [restrictedItemSchema],

    // ── Incident log ──────────────────────────────────────────────────────────
    incidents: [incidentLogSchema],

    // ── General notes ─────────────────────────────────────────────────────────
    incidentNotes: { type: String, default: null },

    // ── Boarding override (admin can override a rejection) ────────────────────
    boardingOverride:       { type: Boolean, default: false },
    boardingOverrideBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    boardingOverrideReason: { type: String, default: null },
    boardingOverrideAt:     { type: Date,   default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
securityCheckSchema.index({ booking: 1, bookingPassengerId: 1 }, { unique: true });
securityCheckSchema.index({ flight: 1, status: 1 });
securityCheckSchema.index({ isWatchlisted: 1 });
securityCheckSchema.index({ status: 1, createdAt: -1 });

// ── Virtual: can board ────────────────────────────────────────────────────────
securityCheckSchema.virtual('canBoard').get(function () {
  if (this.boardingOverride) return true;
  return this.status !== SECURITY_STATUS.REJECTED && this.status !== SECURITY_STATUS.FLAGGED;
});

module.exports = mongoose.model('SecurityCheck', securityCheckSchema);
