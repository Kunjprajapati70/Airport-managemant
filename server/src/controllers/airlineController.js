const Airline = require('../models/Airline');
const auditLog = require('../middleware/auditLogger');

exports.getAll = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
    const airlines = await Airline.find(query).populate('hubAirports', 'name code city').sort({ name: 1 });
    res.json({ success: true, airlines, total: airlines.length });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const airline = await Airline.findById(req.params.id).populate('hubAirports', 'name code city');
    if (!airline) return res.status(404).json({ success: false, message: 'Airline not found.' });
    res.json({ success: true, airline });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const airline = await Airline.create(req.body);
    await auditLog(req, 'CREATE', 'Airline', airline._id, `Created airline ${airline.code}`);
    res.status(201).json({ success: true, message: 'Airline created.', airline });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const before = await Airline.findById(req.params.id);
    const airline = await Airline.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!airline) return res.status(404).json({ success: false, message: 'Airline not found.' });
    await auditLog(req, 'UPDATE', 'Airline', airline._id, `Updated airline ${airline.code}`, before, airline);
    res.json({ success: true, message: 'Airline updated.', airline });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const airline = await Airline.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!airline) return res.status(404).json({ success: false, message: 'Airline not found.' });
    await auditLog(req, 'DELETE', 'Airline', airline._id, `Deactivated airline ${airline.code}`);
    res.json({ success: true, message: 'Airline deactivated.' });
  } catch (error) { next(error); }
};
