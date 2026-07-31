const Airport = require('../models/Airport');
const auditLog = require('../middleware/auditLogger');

exports.getAll = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];
    const airports = await Airport.find(query).sort({ name: 1 });
    res.json({ success: true, airports, total: airports.length });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const airport = await Airport.findById(req.params.id);
    if (!airport) return res.status(404).json({ success: false, message: 'Airport not found.' });
    res.json({ success: true, airport });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const airport = await Airport.create(req.body);
    await auditLog(req, 'CREATE', 'Airport', airport._id, `Created airport ${airport.code}`);
    res.status(201).json({ success: true, message: 'Airport created.', airport });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const before = await Airport.findById(req.params.id);
    const airport = await Airport.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!airport) return res.status(404).json({ success: false, message: 'Airport not found.' });
    await auditLog(req, 'UPDATE', 'Airport', airport._id, `Updated airport ${airport.code}`, before, airport);
    res.json({ success: true, message: 'Airport updated.', airport });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const airport = await Airport.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!airport) return res.status(404).json({ success: false, message: 'Airport not found.' });
    await auditLog(req, 'DELETE', 'Airport', airport._id, `Deactivated airport ${airport.code}`);
    res.json({ success: true, message: 'Airport deactivated.' });
  } catch (error) { next(error); }
};
