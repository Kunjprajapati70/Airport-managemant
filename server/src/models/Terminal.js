const mongoose = require('mongoose');

const terminalSchema = new mongoose.Schema({
  airport: { type: mongoose.Schema.Types.ObjectId, ref: 'Airport', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['domestic', 'international', 'mixed'], default: 'mixed' },
  totalGates:  { type: Number, default: 0 },
  facilities:  [{ type: String }],
  isActive:    { type: Boolean, default: true },
  description: { type: String },
}, { timestamps: true });

terminalSchema.index({ airport: 1, code: 1 }, { unique: true });
module.exports = mongoose.model('Terminal', terminalSchema);
