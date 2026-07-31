/**
 * Complaint.js
 * Passenger complaint / lost baggage report.
 * Supports multiple complaint types with priority, assignment, and resolution tracking.
 */

const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // ── Reporter ──────────────────────────────────────────────────────────────
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

    // ── Related entities ──────────────────────────────────────────────────────
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    flight:  { type: mongoose.Schema.Types.ObjectId, ref: 'Flight',  default: null },
    baggage: { type: mongoose.Schema.Types.ObjectId, ref: 'Baggage', default: null },

    // ── Complaint details ─────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['lost_baggage', 'damaged_baggage', 'delayed_baggage', 'flight_delay', 'service', 'staff', 'refund', 'other'],
      required: true,
    },
    subject:     { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },

    // ── Workflow ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // ── Assignment & resolution ───────────────────────────────────────────────
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolution:  { type: String, default: null },
    resolvedAt:  { type: Date,   default: null },

    // ── Baggage-specific fields ───────────────────────────────────────────────
    baggageTagNumber:   { type: String, default: null },
    baggageDescription: { type: String, default: null },
    baggageColor:       { type: String, default: null },
    lastSeenLocation:   { type: String, default: null },

    // ── Attachments (file paths) ──────────────────────────────────────────────
    attachments: [{ type: String }],

    // ── Internal notes ────────────────────────────────────────────────────────
    internalNotes: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
complaintSchema.index({ user: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ baggage: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
