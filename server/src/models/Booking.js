/**
 * Booking.js
 * Core booking document. Each booking represents one or more passengers
 * on a single flight. Passengers are embedded sub-documents so the full
 * booking snapshot is self-contained.
 */

const mongoose = require('mongoose');
const { BOOKING_STATUS, SEAT_CLASS } = require('../config/constants');

// ── Embedded passenger sub-document ──────────────────────────────────────────
const bookingPassengerSchema = new mongoose.Schema({
  // Link to Passenger profile (optional — guest bookings won't have this)
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', default: null },

  // Identity snapshot (captured at booking time)
  firstName:      { type: String, required: true, trim: true },
  lastName:       { type: String, required: true, trim: true },
  passportNumber: { type: String, trim: true, default: null },
  dateOfBirth:    { type: Date,   default: null },
  nationality:    { type: String, default: null },

  // Seat assignment
  seatNumber: { type: String, default: null },
  seatClass:  { type: String, enum: Object.values(SEAT_CLASS) },

  // Preferences
  mealPreference:           { type: String, default: 'standard' },
  specialAssistance:        { type: Boolean, default: false },
  specialAssistanceDetails: { type: String, default: null },

  // Operational status
  checkinStatus: {
    type: String,
    enum: ['not_checked_in', 'checked_in', 'boarded', 'no_show'],
    default: 'not_checked_in',
  },
  boardingPassGenerated: { type: Boolean, default: false },
  securityCleared:       { type: Boolean, default: false },
});

// ── Main booking schema ───────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    pnr: {
      type:     String,
      required: true,
      unique:   true,
      uppercase: true,
      trim:     true,
    },
    bookingReference: {
      type:   String,
      unique: true,
      sparse: true,
    },

    // ── Relationships ─────────────────────────────────────────────────────────
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },

    // ── Passengers ────────────────────────────────────────────────────────────
    passengers: [bookingPassengerSchema],
    seatClass:  { type: String, enum: Object.values(SEAT_CLASS), required: true },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },

    // ── Pricing ───────────────────────────────────────────────────────────────
    basePrice:   { type: Number, required: true, min: 0 },
    taxes:       { type: Number, default: 0,     min: 0 },
    fees:        { type: Number, default: 0,     min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency:    { type: String, default: 'USD' },

    // ── Cancellation ──────────────────────────────────────────────────────────
    cancellationReason: { type: String, default: null },
    cancelledAt:        { type: Date,   default: null },
    cancellationFee:    { type: Number, default: 0 },
    refundAmount:       { type: Number, default: 0 },

    // ── Reschedule ────────────────────────────────────────────────────────────
    originalFlight:  { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', default: null },
    rescheduledAt:   { type: Date, default: null },
    rescheduleFee:   { type: Number, default: 0 },

    // ── Metadata ──────────────────────────────────────────────────────────────
    bookedAt: { type: Date, default: Date.now },
    source:   { type: String, enum: ['web', 'mobile', 'counter', 'agent'], default: 'web' },
    notes:    { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ flight: 1, status: 1 });
// pnr already has unique:true on the field — no need for a separate index
bookingSchema.index({ createdAt: -1 });

// ── Virtual: passenger count ──────────────────────────────────────────────────
bookingSchema.virtual('passengerCount').get(function () {
  return this.passengers?.length ?? 0;
});

module.exports = mongoose.model('Booking', bookingSchema);
