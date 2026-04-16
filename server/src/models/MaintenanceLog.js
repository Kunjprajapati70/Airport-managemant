/**
 * MaintenanceLog.js
 * Tracks every maintenance event for an aircraft.
 * When a log is created, the aircraft is automatically set to MAINTENANCE status.
 * When a log is completed, the aircraft is returned to AVAILABLE.
 *
 * Parts list is embedded — each part has name, quantity, unit cost.
 * Total cost = labour cost + sum of parts costs.
 */

const mongoose = require('mongoose');
const { MAINTENANCE_STATUS } = require('../config/constants');

const partSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  partNumber:{ type: String, trim: true, default: null },
  quantity:  { type: Number, required: true, min: 1 },
  unitCost:  { type: Number, default: 0, min: 0 },
}, { _id: true });

const maintenanceLogSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────────────────────────────────
    aircraft:    { type: mongoose.Schema.Types.ObjectId, ref: 'Aircraft', required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },

    // ── Classification ────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['routine', 'repair', 'inspection', 'overhaul', 'emergency'],
      required: [true, 'Maintenance type is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    { values: Object.values(MAINTENANCE_STATUS), message: 'Invalid maintenance status: {VALUE}' },
      default: MAINTENANCE_STATUS.SCHEDULED,
    },

    // ── Details ───────────────────────────────────────────────────────────────
    title:       { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: null },

    // ── Schedule ──────────────────────────────────────────────────────────────
    scheduledDate:  { type: Date, required: [true, 'Scheduled date is required'] },
    startedAt:      { type: Date, default: null },
    completedAt:    { type: Date, default: null },
    estimatedHours: { type: Number, default: null, min: 0 },
    actualHours:    { type: Number, default: null, min: 0 },

    // ── Cost ──────────────────────────────────────────────────────────────────
    labourCost: { type: Number, default: 0, min: 0 },
    parts:      [partSchema],

    // ── Next service ──────────────────────────────────────────────────────────
    nextServiceDue:  { type: Date,   default: null },
    nextServiceType: { type: String, default: null },

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes:          { type: String, default: null },
    internalNotes:  { type: String, default: null },

    // ── Completion sign-off ───────────────────────────────────────────────────
    signedOffBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    signedOffAt:  { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
maintenanceLogSchema.index({ aircraft: 1, status: 1 });
maintenanceLogSchema.index({ scheduledDate: 1 });
maintenanceLogSchema.index({ status: 1, priority: 1 });

// ── Virtual: total cost ───────────────────────────────────────────────────────
maintenanceLogSchema.virtual('totalCost').get(function () {
  const partsCost = (this.parts ?? []).reduce((sum, p) => sum + (p.unitCost * p.quantity), 0);
  return (this.labourCost ?? 0) + partsCost;
});

// ── Virtual: is overdue ───────────────────────────────────────────────────────
maintenanceLogSchema.virtual('isOverdue').get(function () {
  if (['completed', 'overdue'].includes(this.status)) return this.status === 'overdue';
  return this.scheduledDate && new Date(this.scheduledDate) < new Date() && this.status === 'scheduled';
});

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
