const mongoose = require('mongoose');

const airportSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  code:     { type: String, required: true, unique: true, uppercase: true, trim: true },
  icaoCode: { type: String, uppercase: true, trim: true },
  city:     { type: String, required: true },
  country:  { type: String, required: true },
  timezone: { type: String, default: 'UTC' },
  latitude:  { type: Number },
  longitude: { type: Number },
  elevation: { type: Number },
  website:   { type: String },
  phone:     { type: String },
  email:     { type: String },
  isActive:  { type: Boolean, default: true },
  image:     { type: String, default: null },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Airport', airportSchema);
