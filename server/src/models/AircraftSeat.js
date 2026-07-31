const mongoose = require('mongoose');
const { SEAT_CLASS, SEAT_STATUS } = require('../config/constants');

const aircraftSeatSchema = new mongoose.Schema({
  aircraft:   { type: mongoose.Schema.Types.ObjectId, ref: 'Aircraft', required: true },
  seatNumber: { type: String, required: true },
  row:    { type: Number, required: true },
  column: { type: String, required: true },
  class:  { type: String, enum: Object.values(SEAT_CLASS), required: true },
  status: { type: String, enum: Object.values(SEAT_STATUS), default: SEAT_STATUS.AVAILABLE },
  isWindow:    { type: Boolean, default: false },
  isAisle:     { type: Boolean, default: false },
  isMiddle:    { type: Boolean, default: false },
  isExitRow:   { type: Boolean, default: false },
  extraLegroom:{ type: Boolean, default: false },
  price:       { type: Number, default: 0 },
}, { timestamps: true });

aircraftSeatSchema.index({ aircraft: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('AircraftSeat', aircraftSeatSchema);
