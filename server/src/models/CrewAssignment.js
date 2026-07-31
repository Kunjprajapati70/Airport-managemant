const mongoose = require('mongoose');

const crewAssignmentSchema = new mongoose.Schema({
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  staff:  { type: mongoose.Schema.Types.ObjectId, ref: 'Staff',  required: true },
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: {
    type: String,
    enum: ['captain', 'first_officer', 'cabin_crew', 'purser', 'ground_crew'],
    required: true,
  },
  assignedAt:  { type: Date, default: Date.now },
  assignedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isConfirmed: { type: Boolean, default: false },
  notes:       { type: String },
}, { timestamps: true });

crewAssignmentSchema.index({ flight: 1, staff: 1 }, { unique: true });
module.exports = mongoose.model('CrewAssignment', crewAssignmentSchema);
