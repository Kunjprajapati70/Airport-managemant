/**
 * Flight.js
 * Core flight document. Stores the full lifecycle of a flight from
 * scheduling through arrival, including all resource assignments,
 * pricing, seat counts, and operational timestamps.
 */

const mongoose = require('mongoose');
const { FLIGHT_STATUS } = require('../config/constants');

const flightSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    flightNumber: {
      type:     String,
      required: [true, 'Flight number is required'],
      uppercase: true,
      trim:     true,
    },
    airline: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Airline',
      required: [true, 'Airline is required'],
    },
    aircraft: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Aircraft',
      required: [true, 'Aircraft is required'],
    },

    // ── Route ─────────────────────────────────────────────────────────────────
    departureAirport: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Airport',
      required: [true, 'Departure airport is required'],
    },
    arrivalAirport: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Airport',
      required: [true, 'Arrival airport is required'],
    },

    // ── Schedule ──────────────────────────────────────────────────────────────
    scheduledDeparture: { type: Date, required: [true, 'Scheduled departure is required'] },
    scheduledArrival:   { type: Date, required: [true, 'Scheduled arrival is required'] },
    estimatedDeparture: { type: Date, default: null },
    estimatedArrival:   { type: Date, default: null },
    actualDeparture:    { type: Date, default: null },
    actualArrival:      { type: Date, default: null },

    // ── Resource assignments ──────────────────────────────────────────────────
    departureTerminal: { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', default: null },
    arrivalTerminal:   { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', default: null },
    departureGate:     { type: mongoose.Schema.Types.ObjectId, ref: 'Gate',     default: null },
    arrivalGate:       { type: mongoose.Schema.Types.ObjectId, ref: 'Gate',     default: null },
    runway:            { type: mongoose.Schema.Types.ObjectId, ref: 'Runway',   default: null },
    parkingBay:        { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingBay', default: null },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    { values: Object.values(FLIGHT_STATUS), message: 'Invalid flight status: {VALUE}' },
      default: FLIGHT_STATUS.SCHEDULED,
    },

    // ── Pricing ───────────────────────────────────────────────────────────────
    economyPrice:    { type: Number, required: [true, 'Economy price is required'],    min: 0 },
    businessPrice:   { type: Number, required: [true, 'Business price is required'],   min: 0 },
    firstClassPrice: { type: Number, required: [true, 'First class price is required'], min: 0 },

    // ── Seat tracking ─────────────────────────────────────────────────────────
    totalSeats:     { type: Number, default: 0 },
    bookedSeats:    { type: Number, default: 0 },
    availableSeats: { type: Number, default: 0 },

    // ── Delay info ────────────────────────────────────────────────────────────
    delayReason:  { type: String, default: null },
    delayMinutes: { type: Number, default: 0 },

    // ── Cancellation ──────────────────────────────────────────────────────────
    cancellationReason: { type: String, default: null },
    cancelledAt:        { type: Date,   default: null },
    cancelledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // ── Operational windows (auto-computed on create) ─────────────────────────
    checkInOpenTime:   { type: Date, default: null },
    checkInCloseTime:  { type: Date, default: null },
    boardingOpenTime:  { type: Date, default: null },
    boardingCloseTime: { type: Date, default: null },

    // ── Soft delete ───────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    notes:    { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
flightSchema.index({ flightNumber: 1, scheduledDeparture: 1 });
flightSchema.index({ departureAirport: 1, arrivalAirport: 1, scheduledDeparture: 1 });
flightSchema.index({ status: 1, isActive: 1 });
flightSchema.index({ airline: 1, scheduledDeparture: 1 });
flightSchema.index({ aircraft: 1, scheduledDeparture: 1 });
flightSchema.index({ departureGate: 1, scheduledDeparture: 1 });
flightSchema.index({ runway: 1, scheduledDeparture: 1 });

// ── Virtual: flight duration in minutes ───────────────────────────────────────
flightSchema.virtual('durationMinutes').get(function () {
  if (!this.scheduledDeparture || !this.scheduledArrival) return null;
  return Math.round((this.scheduledArrival - this.scheduledDeparture) / 60000);
});

// ── Virtual: is the flight currently delayed ──────────────────────────────────
flightSchema.virtual('isDelayed').get(function () {
  return this.status === 'delayed' || this.delayMinutes > 0;
});

module.exports = mongoose.model('Flight', flightSchema);
