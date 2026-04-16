const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  passportNumber: { type: String, trim: true },
  nationalId:     { type: String, trim: true },
  nationality:    { type: String },
  dateOfBirth:    { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  address:    { type: String },
  city:       { type: String },
  country:    { type: String },
  postalCode: { type: String },
  emergencyContactName:     { type: String },
  emergencyContactPhone:    { type: String },
  emergencyContactRelation: { type: String },
  mealPreference: {
    type: String,
    enum: ['standard', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'diabetic', 'none'],
    default: 'standard',
  },
  seatPreference: { type: String, enum: ['window', 'aisle', 'middle', 'no_preference'], default: 'no_preference' },
  specialAssistance:        { type: Boolean, default: false },
  specialAssistanceDetails: { type: String },
  frequentFlyerNumber:  { type: String },
  frequentFlyerAirline: { type: mongoose.Schema.Types.ObjectId, ref: 'Airline' },
  passportExpiry: { type: Date },
  issuingCountry: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Passenger', passengerSchema);
