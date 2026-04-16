const Terminal = require('../models/Terminal');
const Gate = require('../models/Gate');
const Runway = require('../models/Runway');
const ParkingBay = require('../models/ParkingBay');
const auditLog = require('../middleware/auditLogger');

// ─── TERMINALS ───────────────────────────────────────────────────────────────
exports.getTerminals = async (req, res, next) => {
  try {
    const { airport } = req.query;
    const query = airport ? { airport } : {};
    const terminals = await Terminal.find(query).populate('airport', 'name code city').sort({ name: 1 });
    res.json({ success: true, terminals });
  } catch (error) { next(error); }
};

exports.createTerminal = async (req, res, next) => {
  try {
    const terminal = await Terminal.create(req.body);
    await auditLog(req, 'CREATE', 'Terminal', terminal._id, `Created terminal ${terminal.code}`);
    res.status(201).json({ success: true, message: 'Terminal created.', terminal });
  } catch (error) { next(error); }
};

exports.updateTerminal = async (req, res, next) => {
  try {
    const terminal = await Terminal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!terminal) return res.status(404).json({ success: false, message: 'Terminal not found.' });
    await auditLog(req, 'UPDATE', 'Terminal', terminal._id, `Updated terminal ${terminal.code}`);
    res.json({ success: true, message: 'Terminal updated.', terminal });
  } catch (error) { next(error); }
};

exports.deleteTerminal = async (req, res, next) => {
  try {
    await Terminal.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Terminal deactivated.' });
  } catch (error) { next(error); }
};

// ─── GATES ───────────────────────────────────────────────────────────────────
exports.getGates = async (req, res, next) => {
  try {
    const { terminal, airport, status } = req.query;
    const query = {};
    if (terminal) query.terminal = terminal;
    if (airport) query.airport = airport;
    if (status) query.status = status;
    const gates = await Gate.find(query)
      .populate('terminal', 'name code')
      .populate('airport', 'name code')
      .sort({ gateNumber: 1 });
    res.json({ success: true, gates });
  } catch (error) { next(error); }
};

exports.createGate = async (req, res, next) => {
  try {
    const gate = await Gate.create(req.body);
    await auditLog(req, 'CREATE', 'Gate', gate._id, `Created gate ${gate.gateNumber}`);
    res.status(201).json({ success: true, message: 'Gate created.', gate });
  } catch (error) { next(error); }
};

exports.updateGate = async (req, res, next) => {
  try {
    const gate = await Gate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!gate) return res.status(404).json({ success: false, message: 'Gate not found.' });
    await auditLog(req, 'UPDATE', 'Gate', gate._id, `Updated gate ${gate.gateNumber}`);
    res.json({ success: true, message: 'Gate updated.', gate });
  } catch (error) { next(error); }
};

exports.deleteGate = async (req, res, next) => {
  try {
    await Gate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Gate deactivated.' });
  } catch (error) { next(error); }
};

// ─── RUNWAYS ─────────────────────────────────────────────────────────────────
exports.getRunways = async (req, res, next) => {
  try {
    const { airport, status } = req.query;
    const query = {};
    if (airport) query.airport = airport;
    if (status) query.status = status;
    const runways = await Runway.find(query).populate('airport', 'name code').sort({ runwayId: 1 });
    res.json({ success: true, runways });
  } catch (error) { next(error); }
};

exports.createRunway = async (req, res, next) => {
  try {
    const runway = await Runway.create(req.body);
    await auditLog(req, 'CREATE', 'Runway', runway._id, `Created runway ${runway.runwayId}`);
    res.status(201).json({ success: true, message: 'Runway created.', runway });
  } catch (error) { next(error); }
};

exports.updateRunway = async (req, res, next) => {
  try {
    const runway = await Runway.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!runway) return res.status(404).json({ success: false, message: 'Runway not found.' });
    res.json({ success: true, message: 'Runway updated.', runway });
  } catch (error) { next(error); }
};

exports.deleteRunway = async (req, res, next) => {
  try {
    await Runway.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Runway deactivated.' });
  } catch (error) { next(error); }
};

// ─── PARKING BAYS ────────────────────────────────────────────────────────────
exports.getParkingBays = async (req, res, next) => {
  try {
    const { airport, status } = req.query;
    const query = {};
    if (airport) query.airport = airport;
    if (status) query.status = status;
    const bays = await ParkingBay.find(query).populate('airport', 'name code').sort({ bayNumber: 1 });
    res.json({ success: true, bays });
  } catch (error) { next(error); }
};

exports.createParkingBay = async (req, res, next) => {
  try {
    const bay = await ParkingBay.create(req.body);
    res.status(201).json({ success: true, message: 'Parking bay created.', bay });
  } catch (error) { next(error); }
};

exports.updateParkingBay = async (req, res, next) => {
  try {
    const bay = await ParkingBay.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bay) return res.status(404).json({ success: false, message: 'Parking bay not found.' });
    res.json({ success: true, message: 'Parking bay updated.', bay });
  } catch (error) { next(error); }
};

exports.deleteParkingBay = async (req, res, next) => {
  try {
    await ParkingBay.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Parking bay deactivated.' });
  } catch (error) { next(error); }
};
