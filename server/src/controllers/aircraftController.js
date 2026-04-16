const Aircraft = require('../models/Aircraft');
const AircraftSeat = require('../models/AircraftSeat');
const { AIRCRAFT_STATUS, SEAT_CLASS } = require('../config/constants');
const auditLog = require('../middleware/auditLogger');

exports.getAll = async (req, res, next) => {
  try {
    const { airline, status, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (airline) query.airline = airline;
    if (status) query.status = status;
    if (search) query.$or = [
      { registrationNumber: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } },
    ];
    const skip = (page - 1) * limit;
    const [aircraft, total] = await Promise.all([
      Aircraft.find(query).populate('airline', 'name code logo').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Aircraft.countDocuments(query),
    ]);
    res.json({ success: true, aircraft, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.findById(req.params.id).populate('airline', 'name code logo');
    if (!aircraft) return res.status(404).json({ success: false, message: 'Aircraft not found.' });
    res.json({ success: true, aircraft });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.create(req.body);
    // Auto-generate seat layout
    await generateSeatLayout(aircraft);
    await auditLog(req, 'CREATE', 'Aircraft', aircraft._id, `Registered aircraft ${aircraft.registrationNumber}`);
    res.status(201).json({ success: true, message: 'Aircraft registered.', aircraft });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const before = await Aircraft.findById(req.params.id);
    // Prevent assigning aircraft under maintenance
    if (req.body.status === AIRCRAFT_STATUS.ASSIGNED) {
      const current = await Aircraft.findById(req.params.id);
      if (current.status === AIRCRAFT_STATUS.MAINTENANCE) {
        return res.status(400).json({ success: false, message: 'Cannot assign aircraft under maintenance.' });
      }
    }
    const aircraft = await Aircraft.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!aircraft) return res.status(404).json({ success: false, message: 'Aircraft not found.' });
    await auditLog(req, 'UPDATE', 'Aircraft', aircraft._id, `Updated aircraft ${aircraft.registrationNumber}`, before, aircraft);
    res.json({ success: true, message: 'Aircraft updated.', aircraft });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!aircraft) return res.status(404).json({ success: false, message: 'Aircraft not found.' });
    await auditLog(req, 'DELETE', 'Aircraft', aircraft._id, `Deactivated aircraft ${aircraft.registrationNumber}`);
    res.json({ success: true, message: 'Aircraft deactivated.' });
  } catch (error) { next(error); }
};

exports.getSeats = async (req, res, next) => {
  try {
    const seats = await AircraftSeat.find({ aircraft: req.params.id }).sort({ row: 1, column: 1 });
    res.json({ success: true, seats });
  } catch (error) { next(error); }
};

// Generate seat layout based on aircraft config
const generateSeatLayout = async (aircraft) => {
  const seats = [];
  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];

  let row = 1;
  // First class rows
  const firstRows = Math.ceil(aircraft.firstClassSeats / 4);
  for (let r = 1; r <= firstRows; r++) {
    ['A', 'B', 'C', 'D'].forEach((col, i) => {
      seats.push({
        aircraft: aircraft._id,
        seatNumber: `${r}${col}`,
        row: r,
        column: col,
        class: SEAT_CLASS.FIRST,
        isWindow: col === 'A' || col === 'D',
        isAisle: col === 'B' || col === 'C',
        price: 150,
      });
    });
    row++;
  }

  // Business class rows
  const bizRows = Math.ceil(aircraft.businessSeats / 6);
  for (let r = row; r < row + bizRows; r++) {
    columns.forEach((col, i) => {
      seats.push({
        aircraft: aircraft._id,
        seatNumber: `${r}${col}`,
        row: r,
        column: col,
        class: SEAT_CLASS.BUSINESS,
        isWindow: col === 'A' || col === 'F',
        isAisle: col === 'C' || col === 'D',
        isMiddle: col === 'B' || col === 'E',
        price: 75,
      });
    });
  }
  row += bizRows;

  // Economy rows
  const ecoRows = Math.ceil(aircraft.economySeats / 6);
  for (let r = row; r < row + ecoRows; r++) {
    columns.forEach((col, i) => {
      seats.push({
        aircraft: aircraft._id,
        seatNumber: `${r}${col}`,
        row: r,
        column: col,
        class: SEAT_CLASS.ECONOMY,
        isWindow: col === 'A' || col === 'F',
        isAisle: col === 'C' || col === 'D',
        isMiddle: col === 'B' || col === 'E',
        isExitRow: r === row + Math.floor(ecoRows / 2),
        extraLegroom: r === row + Math.floor(ecoRows / 2),
        price: 0,
      });
    });
  }

  if (seats.length > 0) {
    await AircraftSeat.insertMany(seats, { ordered: false }).catch(() => {});
  }
};
