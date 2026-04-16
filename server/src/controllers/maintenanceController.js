/**
 * maintenanceController.js
 * Full aircraft maintenance lifecycle management.
 *
 * Endpoints:
 *   GET  /api/maintenance/stats          - maintenance statistics
 *   GET  /api/maintenance/due            - aircraft due for maintenance
 *   GET  /api/maintenance                - all logs (filterable)
 *   GET  /api/maintenance/:id            - single log detail
 *   POST /api/maintenance                - create log (sets aircraft → maintenance)
 *   PUT  /api/maintenance/:id            - update log
 *   PATCH /api/maintenance/:id/start     - mark in-progress
 *   PATCH /api/maintenance/:id/complete  - mark completed (returns aircraft → available)
 *   POST /api/maintenance/aircraft/:id/ground   - ground an aircraft
 *   POST /api/maintenance/aircraft/:id/unground - unground an aircraft
 *   GET  /api/maintenance/aircraft/:id   - maintenance history for an aircraft
 */

const MaintenanceLog = require('../models/MaintenanceLog');
const Aircraft       = require('../models/Aircraft');
const Notification   = require('../models/Notification');
const AppError       = require('../utils/AppError');
const auditLog       = require('../middleware/auditLogger');
const { emitToUser } = require('../socket');
const {
  AIRCRAFT_STATUS,
  MAINTENANCE_STATUS,
  NOTIFICATION_TYPES,
} = require('../config/constants');

// ── Shared populate ───────────────────────────────────────────────────────────
const LOG_POPULATE = [
  { path: 'aircraft',    select: 'registrationNumber model manufacturer airline status nextMaintenanceDue totalFlightHours',
    populate: { path: 'airline', select: 'name code' },
  },
  { path: 'performedBy', select: 'firstName lastName role' },
  { path: 'assignedTo',  select: 'firstName lastName role' },
  { path: 'signedOffBy', select: 'firstName lastName role' },
];

// ── Helper: auto-mark overdue logs ────────────────────────────────────────────
const markOverdueLogs = async () => {
  await MaintenanceLog.updateMany(
    {
      status:        MAINTENANCE_STATUS.SCHEDULED,
      scheduledDate: { $lt: new Date() },
    },
    { status: MAINTENANCE_STATUS.OVERDUE }
  );
};

// ── GET /api/maintenance/stats ────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    await markOverdueLogs();

    const [statusStats, typeStats, costStats, aircraftStats] = await Promise.all([
      MaintenanceLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      MaintenanceLog.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      MaintenanceLog.aggregate([
        { $match: { status: MAINTENANCE_STATUS.COMPLETED } },
        { $group: {
          _id:         null,
          totalLabour: { $sum: '$labourCost' },
          totalHours:  { $sum: '$actualHours' },
        }},
      ]),
      Aircraft.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus   = Object.fromEntries(statusStats.map((s) => [s._id, s.count]));
    const byType     = Object.fromEntries(typeStats.map((s) => [s._id, s.count]));
    const byAircraft = Object.fromEntries(aircraftStats.map((s) => [s._id, s.count]));

    res.json({
      success: true,
      stats: {
        logs: {
          total:    Object.values(byStatus).reduce((a, b) => a + b, 0),
          byStatus,
          byType,
        },
        costs: {
          totalLabour: costStats[0]?.totalLabour ?? 0,
          totalHours:  costStats[0]?.totalHours  ?? 0,
        },
        aircraft: {
          total:       Object.values(byAircraft).reduce((a, b) => a + b, 0),
          byStatus:    byAircraft,
          inMaintenance: byAircraft[AIRCRAFT_STATUS.MAINTENANCE] ?? 0,
          grounded:      byAircraft[AIRCRAFT_STATUS.GROUNDED]    ?? 0,
          available:     byAircraft[AIRCRAFT_STATUS.AVAILABLE]   ?? 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/maintenance/due ──────────────────────────────────────────────────
exports.getDueAircraft = async (req, res, next) => {
  try {
    const { days = 14 } = req.query;
    const cutoff = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

    const aircraft = await Aircraft.find({
      $or: [
        { nextMaintenanceDue: { $lte: cutoff } },
        { status: { $in: [AIRCRAFT_STATUS.MAINTENANCE, AIRCRAFT_STATUS.GROUNDED] } },
      ],
      isActive: true,
    })
      .populate('airline', 'name code')
      .sort({ nextMaintenanceDue: 1 })
      .lean();

    res.json({ success: true, aircraft, total: aircraft.length });
  } catch (err) { next(err); }
};

// ── GET /api/maintenance ──────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    await markOverdueLogs();

    const {
      aircraft, status, type, priority,
      page = 1, limit = 20,
    } = req.query;

    const query = {};
    if (aircraft) query.aircraft = aircraft;
    if (status)   query.status   = status;
    if (type)     query.type     = type;
    if (priority) query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      MaintenanceLog.find(query)
        .populate(LOG_POPULATE)
        .skip(skip)
        .limit(Number(limit))
        .sort({ scheduledDate: -1 })
        .lean(),
      MaintenanceLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/maintenance/:id ──────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id)
      .populate(LOG_POPULATE)
      .lean();

    if (!log) return next(new AppError('Maintenance log not found.', 404));
    res.json({ success: true, log });
  } catch (err) { next(err); }
};

// ── POST /api/maintenance ─────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { aircraft: aircraftId, type, priority } = req.body;

    // Validate aircraft exists
    const aircraft = await Aircraft.findById(aircraftId);
    if (!aircraft) return next(new AppError('Aircraft not found.', 404));
    if (!aircraft.isActive) return next(new AppError('Aircraft is not active.', 400));

    // Block if already in maintenance (unless emergency)
    if (aircraft.status === AIRCRAFT_STATUS.MAINTENANCE && type !== 'emergency') {
      return next(new AppError(
        `Aircraft ${aircraft.registrationNumber} is already under maintenance. Use type "emergency" to add an urgent log.`,
        400
      ));
    }

    const log = await MaintenanceLog.create({
      ...req.body,
      performedBy: req.user._id,
      assignedTo:  req.body.assignedTo || req.user._id,
    });

    // Set aircraft to maintenance status
    await Aircraft.findByIdAndUpdate(aircraftId, {
      status: AIRCRAFT_STATUS.MAINTENANCE,
    });

    const populated = await MaintenanceLog.findById(log._id).populate(LOG_POPULATE).lean();

    await auditLog(
      req, 'CREATE', 'Maintenance', log._id,
      `Created ${type} maintenance log for ${aircraft.registrationNumber}: ${req.body.title}`
    );

    res.status(201).json({
      success: true,
      message: `Maintenance log created. Aircraft ${aircraft.registrationNumber} set to maintenance status.`,
      log: populated,
    });
  } catch (err) { next(err); }
};

// ── PUT /api/maintenance/:id ──────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const existing = await MaintenanceLog.findById(req.params.id);
    if (!existing) return next(new AppError('Maintenance log not found.', 404));

    const log = await MaintenanceLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(LOG_POPULATE).lean();

    await auditLog(req, 'UPDATE', 'Maintenance', log._id, `Updated maintenance log for aircraft`);
    res.json({ success: true, message: 'Maintenance log updated.', log });
  } catch (err) { next(err); }
};

// ── PATCH /api/maintenance/:id/start ─────────────────────────────────────────
exports.startMaintenance = async (req, res, next) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) return next(new AppError('Maintenance log not found.', 404));

    if (log.status === MAINTENANCE_STATUS.COMPLETED) {
      return next(new AppError('Cannot start a completed maintenance log.', 400));
    }

    log.status    = MAINTENANCE_STATUS.IN_PROGRESS;
    log.startedAt = new Date();
    if (!log.performedBy) log.performedBy = req.user._id;
    await log.save();

    await auditLog(req, 'START', 'Maintenance', log._id, `Started maintenance on aircraft`);
    res.json({ success: true, message: 'Maintenance started.', log });
  } catch (err) { next(err); }
};

// ── PATCH /api/maintenance/:id/complete ──────────────────────────────────────
exports.completeMaintenance = async (req, res, next) => {
  try {
    const { actualHours, notes, nextServiceDue, nextServiceType, labourCost } = req.body;

    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) return next(new AppError('Maintenance log not found.', 404));

    if (log.status === MAINTENANCE_STATUS.COMPLETED) {
      return next(new AppError('Maintenance log is already completed.', 400));
    }

    log.status      = MAINTENANCE_STATUS.COMPLETED;
    log.completedAt = new Date();
    log.signedOffBy = req.user._id;
    log.signedOffAt = new Date();
    if (actualHours)    log.actualHours    = Number(actualHours);
    if (notes)          log.notes          = notes;
    if (nextServiceDue) log.nextServiceDue = new Date(nextServiceDue);
    if (nextServiceType)log.nextServiceType= nextServiceType;
    if (labourCost !== undefined) log.labourCost = Number(labourCost);
    await log.save();

    // Return aircraft to available status
    const aircraft = await Aircraft.findByIdAndUpdate(
      log.aircraft,
      {
        status:              AIRCRAFT_STATUS.AVAILABLE,
        lastMaintenanceDate: new Date(),
        nextMaintenanceDue:  nextServiceDue ? new Date(nextServiceDue) : undefined,
      },
      { new: true }
    );

    await auditLog(
      req, 'COMPLETE', 'Maintenance', log._id,
      `Completed maintenance on ${aircraft?.registrationNumber}. Aircraft returned to available.`
    );

    const populated = await MaintenanceLog.findById(log._id).populate(LOG_POPULATE).lean();
    res.json({
      success: true,
      message: `Maintenance completed. Aircraft ${aircraft?.registrationNumber} is now available.`,
      log: populated,
    });
  } catch (err) { next(err); }
};

// ── POST /api/maintenance/aircraft/:id/ground ─────────────────────────────────
exports.groundAircraft = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const aircraft = await Aircraft.findById(req.params.id);
    if (!aircraft) return next(new AppError('Aircraft not found.', 404));

    if (aircraft.status === AIRCRAFT_STATUS.GROUNDED) {
      return next(new AppError('Aircraft is already grounded.', 400));
    }

    await Aircraft.findByIdAndUpdate(req.params.id, {
      status:          AIRCRAFT_STATUS.GROUNDED,
      groundingReason: reason,
      groundedAt:      new Date(),
    });

    await auditLog(
      req, 'GROUND', 'Aircraft', aircraft._id,
      `Grounded aircraft ${aircraft.registrationNumber}: ${reason}`
    );

    res.json({
      success: true,
      message: `Aircraft ${aircraft.registrationNumber} has been grounded.`,
    });
  } catch (err) { next(err); }
};

// ── POST /api/maintenance/aircraft/:id/unground ───────────────────────────────
exports.ungroundAircraft = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.findById(req.params.id);
    if (!aircraft) return next(new AppError('Aircraft not found.', 404));

    if (aircraft.status !== AIRCRAFT_STATUS.GROUNDED) {
      return next(new AppError('Aircraft is not grounded.', 400));
    }

    await Aircraft.findByIdAndUpdate(req.params.id, {
      status:          AIRCRAFT_STATUS.AVAILABLE,
      groundingReason: null,
      groundedAt:      null,
    });

    await auditLog(
      req, 'UNGROUND', 'Aircraft', aircraft._id,
      `Ungrounded aircraft ${aircraft.registrationNumber}`
    );

    res.json({
      success: true,
      message: `Aircraft ${aircraft.registrationNumber} has been ungrounded and is now available.`,
    });
  } catch (err) { next(err); }
};

// ── GET /api/maintenance/aircraft/:id ─────────────────────────────────────────
exports.getAircraftHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total, aircraft] = await Promise.all([
      MaintenanceLog.find({ aircraft: req.params.id })
        .populate(LOG_POPULATE)
        .skip(skip)
        .limit(Number(limit))
        .sort({ scheduledDate: -1 })
        .lean(),
      MaintenanceLog.countDocuments({ aircraft: req.params.id }),
      Aircraft.findById(req.params.id).populate('airline', 'name code').lean(),
    ]);

    if (!aircraft) return next(new AppError('Aircraft not found.', 404));

    res.json({
      success: true,
      aircraft,
      logs,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};
