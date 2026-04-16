const mongoose = require('mongoose');

const parkingBaySchema = new mongoose.Schema({
  airport:   { type: mongoose.Schema.Types.ObjectId, ref: 'Airport', required: true },
  bayNumber: { type: String, required: true },
  type:   { type: String, enum: ['contact', 'remote', 'cargo', 'maintenance'], default: 'contact' },
  status: { type: String, enum: ['available', 'occupied', 'maintenance', 'reserved'], default: 'available' },
  maxAircraftSize: { type: String, enum: ['small', 'medium', 'large', 'wide_body'], default: 'medium' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

parkingBaySchema.index({ airport: 1, bayNumber: 1 }, { unique: true });
module.exports = mongoose.model('ParkingBay', parkingBaySchema);
