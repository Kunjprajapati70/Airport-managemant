const mongoose = require('mongoose');

const gateSchema = new mongoose.Schema({
  terminal: { type: mongoose.Schema.Types.ObjectId, ref: 'Terminal', required: true },
  airport:  { type: mongoose.Schema.Types.ObjectId, ref: 'Airport',  required: true },
  gateNumber: { type: String, required: true },
  type:   { type: String, enum: ['domestic', 'international', 'mixed'], default: 'mixed' },
  status: { type: String, enum: ['available', 'occupied', 'maintenance', 'closed'], default: 'available' },
  hasJetbridge:    { type: Boolean, default: true },
  maxAircraftSize: { type: String, enum: ['small', 'medium', 'large', 'wide_body'], default: 'medium' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

gateSchema.index({ terminal: 1, gateNumber: 1 }, { unique: true });
module.exports = mongoose.model('Gate', gateSchema);
