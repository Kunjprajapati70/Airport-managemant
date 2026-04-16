/**
 * BoardingPass.js
 * One boarding pass per passenger per flight.
 * Generated at check-in time. Contains QR code data URL and all
 * information needed to render the visual boarding pass.
 */

const mongoose = require('mongoose');

const boardingPassSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────────────────────────────────
    booking:            { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',   required: true },
    flight:             { type: mongoose.Schema.Types.ObjectId, ref: 'Flight',    required: true },
    passenger:          { type: mongoose.Schema.Types.ObjectId, ref: 'Passenger', default: null },
    bookingPassengerId: { type: mongoose.Schema.Types.ObjectId }, // sub-doc _id in booking.passengers

    // ── Passenger snapshot ────────────────────────────────────────────────────
    passengerName: { type: String, required: true },
    pnr:           { type: String, required: true },

    // ── Seat ──────────────────────────────────────────────────────────────────
    seatNumber: { type: String, required: true },
    seatClass:  { type: String, required: true },

    // ── Flight snapshot ───────────────────────────────────────────────────────
    flightNumber:         { type: String },
    departureAirportCode: { type: String },
    arrivalAirportCode:   { type: String },
    departureAirportName: { type: String },
    arrivalAirportName:   { type: String },

    // ── Operational ───────────────────────────────────────────────────────────
    gate:         { type: String, default: 'TBD' },
    boardingTime: { type: Date },
    departureTime:{ type: Date },

    // ── QR code (base64 data URL) ─────────────────────────────────────────────
    qrCode: { type: String },

    // ── Boarding sequence (assigned at check-in time) ─────────────────────────
    sequenceNumber: { type: Number, default: null },

    // ── Status ────────────────────────────────────────────────────────────────
    isBoarded: { type: Boolean, default: false },
    boardedAt: { type: Date,    default: null },
    isValid:   { type: Boolean, default: true },

    // ── Check-in metadata ─────────────────────────────────────────────────────
    checkedInAt: { type: Date, default: Date.now },
    checkedInBy: { type: String, enum: ['online', 'counter', 'kiosk'], default: 'online' },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
boardingPassSchema.index({ booking: 1, bookingPassengerId: 1 }, { unique: true });
boardingPassSchema.index({ flight: 1, isBoarded: 1 });
boardingPassSchema.index({ pnr: 1 });

module.exports = mongoose.model('BoardingPass', boardingPassSchema);
