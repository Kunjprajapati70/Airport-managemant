/**
 * Baggage.js
 * Tracks a single piece of baggage from registration through claim.
 * Each bag has a unique tag number, weight validation, excess fee calculation,
 * and an append-only tracking history array.
 */

const mongoose = require('mongoose');
const { BAGGAGE_STATUS } = require('../config/constants');

const trackingEventSchema = new mongoose.Schema({
  status:    { type: String, required: true },
  location:  { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timestamp: { type: Date, default: Date.now },
  notes:     { type: String, default: null },
}, { _id: true });

const baggageSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────────────────────────────────
    booking:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',   required: true },
    flight:    { type: mongoose.Schema.Types.ObjectId, ref: 'Flight',    required: true },
    passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', default: null },

    // ── Passenger snapshot ────────────────────────────────────────────────────
    passengerName: { type: String, default: null },

    // ── Tag ───────────────────────────────────────────────────────────────────
    tagNumber: {
      type:     String,
      required: true,
      unique:   true,
      uppercase: true,
      trim:     true,
    },

    // ── Weight ────────────────────────────────────────────────────────────────
    weight:        { type: Number, required: true, min: 0.1 },
    allowedWeight: { type: Number, required: true },
    excessWeight:  { type: Number, default: 0, min: 0 },
    excessFee:     { type: Number, default: 0, min: 0 },
    excessFeePaid: { type: Boolean, default: false },
    excessFeePaidAt: { type: Date, default: null },

    // ── Type & description ────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['checked', 'carry_on', 'oversized', 'fragile', 'special'],
      default: 'checked',
    },
    description: { type: String, default: null },
    color:       { type: String, default: null },
    brand:       { type: String, default: null },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    { values: Object.values(BAGGAGE_STATUS), message: 'Invalid baggage status: {VALUE}' },
      default: BAGGAGE_STATUS.REGISTERED,
    },

    // ── Tracking history (append-only) ────────────────────────────────────────
    trackingHistory: [trackingEventSchema],

    // ── Lost baggage ──────────────────────────────────────────────────────────
    isLost:          { type: Boolean, default: false },
    lostReportedAt:  { type: Date,    default: null },
    lostDescription: { type: String,  default: null },
    foundAt:         { type: Date,    default: null },
    foundLocation:   { type: String,  default: null },

    // ── Complaint reference ───────────────────────────────────────────────────
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
baggageSchema.index({ booking: 1 });
baggageSchema.index({ flight: 1, status: 1 });
baggageSchema.index({ isLost: 1 });

// ── Virtual: latest tracking event ───────────────────────────────────────────
baggageSchema.virtual('latestEvent').get(function () {
  if (!this.trackingHistory?.length) return null;
  return this.trackingHistory[this.trackingHistory.length - 1];
});

module.exports = mongoose.model('Baggage', baggageSchema);
