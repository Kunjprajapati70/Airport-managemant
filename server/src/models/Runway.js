const mongoose = require('mongoose');

const runwaySchema = new mongoose.Schema({
  airport:   { type: mongoose.Schema.Types.ObjectId, ref: 'Airport', required: true },
  runwayId:  { type: String, required: true },
  length:    { type: Number },
  width:     { type: Number },
  surface:   { type: String, enum: ['asphalt', 'concrete', 'gravel', 'grass'], default: 'asphalt' },
  status:    { type: String, enum: ['active', 'inactive', 'maintenance', 'closed'], default: 'active' },
  maxAircraftWeight: { type: Number },
  isActive:  { type: Boolean, default: true },
  notes:     { type: String },
}, { timestamps: true });

runwaySchema.index({ airport: 1, runwayId: 1 }, { unique: true });
module.exports = mongoose.model('Runway', runwaySchema);
