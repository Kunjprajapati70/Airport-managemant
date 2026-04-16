const mongoose = require('mongoose');

const airlineSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  code:     { type: String, required: true, unique: true, uppercase: true, trim: true },
  icaoCode: { type: String, uppercase: true, trim: true },
  country:  { type: String, required: true },
  logo:     { type: String, default: null },
  website:  { type: String },
  phone:    { type: String },
  email:    { type: String },
  foundedYear:   { type: Number },
  headquarters:  { type: String },
  isActive:      { type: Boolean, default: true },
  description:   { type: String },
  hubAirports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Airport' }],
}, { timestamps: true });

module.exports = mongoose.model('Airline', airlineSchema);
