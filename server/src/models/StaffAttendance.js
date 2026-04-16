const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
  staff:    { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  date:     { type: Date, required: true },
  checkIn:  { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['present', 'absent', 'late', 'half_day', 'on_leave'], default: 'present' },
  hoursWorked: { type: Number },
  notes:       { type: String },
}, { timestamps: true });

staffAttendanceSchema.index({ staff: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema);
