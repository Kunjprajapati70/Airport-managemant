/**
 * Aircraft.js
 * Aircraft registration and status tracking.
 * Status controls whether the aircraft can be assigned to flights.
 * maintenance/grounded status blocks flight assignment.
 */

const mongoose = require('mongoose');
const { AIRCRAFT_STATUS } = require('../config/constants');

const aircraftSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    registrationNumber: {
      type:      String,
      required:  [true, 'Registration number is required'],
      unique:    true,
      uppercase: true,
      trim:      true,
    },
    model:        { type: String, required: [true, 'Model is required'], trim: true },
    manufacturer: { type: String, trim: true, default: null },

    // ── Ownership ─────────────────────────────────────────────────────────────
    airline: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Airline',
      required: [true, 'Airline is required'],
    },

    // ── Capacity ──────────────────────────────────────────────────────────────
    totalSeats:      { type: Number, required: true, min: 1 },
    economySeats:    { type: Number, default: 0, min: 0 },
    businessSeats:   { type: Number, default: 0, min: 0 },
    firstClassSeats: { type: Number, default: 0, min: 0 },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    { values: Object.values(AIRCRAFT_STATUS), message: 'Invalid aircraft status: {VALUE}' },
      default: AIRCRAFT_STATUS.AVAILABLE,
    },

    // ── Specifications ────────────────────────────────────────────────────────
    yearManufactured: { type: Number, default: null },
    maxRange:         { type: Number, default: null }, // km
    cruisingSpeed:    { type: Number, default: null }, // km/h
    maxTakeoffWeight: { type: Number, default: null }, // tonnes

    // ── Maintenance tracking ──────────────────────────────────────────────────
    lastMaintenanceDate:  { type: Date, default: null },
    nextMaintenanceDue:   { type: Date, default: null },
    totalFlightHours:     { type: Number, default: 0, min: 0 },
    maintenanceIntervalHours: { type: Number, default: 500 }, // hours between routine maintenance

    // ── Grounding reason ──────────────────────────────────────────────────────
    groundingReason: { type: String, default: null },
    groundedAt:      { type: Date,   default: null },

    // ── Media ─────────────────────────────────────────────────────────────────
    image: { type: String, default: null },

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
aircraftSchema.index({ airline: 1, status: 1 });
aircraftSchema.index({ status: 1, isActive: 1 });
aircraftSchema.index({ nextMaintenanceDue: 1 });

// ── Virtual: is maintenance due ───────────────────────────────────────────────
aircraftSchema.virtual('isMaintenanceDue').get(function () {
  if (!this.nextMaintenanceDue) return false;
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new Date(this.nextMaintenanceDue) <= sevenDays;
});

// ── Virtual: can be assigned to flights ───────────────────────────────────────
aircraftSchema.virtual('isAssignable').get(function () {
  return this.isActive &&
    this.status !== AIRCRAFT_STATUS.MAINTENANCE &&
    this.status !== AIRCRAFT_STATUS.GROUNDED &&
    this.status !== AIRCRAFT_STATUS.RETIRED;
});

module.exports = mongoose.model('Aircraft', aircraftSchema);
