const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeId: { type: String, unique: true, required: true },
  department: { type: String, required: true },
  position:   { type: String, required: true },
  airport:    { type: mongoose.Schema.Types.ObjectId, ref: 'Airport' },
  airline:    { type: mongoose.Schema.Types.ObjectId, ref: 'Airline' },
  dateOfJoining: { type: Date },
  salary:        { type: Number },
  shift: { type: String, enum: ['morning', 'afternoon', 'night', 'rotating'], default: 'morning' },
  isOnLeave:   { type: Boolean, default: false },
  leaveReason: { type: String },
  leaveFrom:   { type: Date },
  leaveTo:     { type: Date },
  certifications: [{ type: String }],
  emergencyContact: { type: String },
  isActive: { type: Boolean, default: true },
  notes:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
