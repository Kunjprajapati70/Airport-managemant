/**
 * securityController.js
 * Full security clearance lifecycle management.
 *
 * Endpoints:
 *   GET  /api/security                        - list all checks (staff)
 *   GET  /api/security/stats                  - security statistics
 *   GET  /api/security/flight/:flightId        - all checks for a flight
 *   GET  /api/security/:id                    - single check detail
 *   PATCH /api/security/:id                   - update check (verify, flag, clear, reject)
 *   POST /api/security/:id/restricted-item    - log a restricted item
 *   POST /api/security/:id/incident           - log an incident
 *   POST /api/security/:id/override           - admin boarding override
 *   GET  /api/security/passenger/:bookingId/:passengerId - check for a specific passenger
 */

const SecurityCheck = require('../models/SecurityCheck');
const Booking       = require('../models/Booking');
const Notification  = require('../models/Notification');
const AppError      = require('../utils/AppError');
const auditLog      = require('../middleware/auditLogger');
const { emitToUser } = require('../socket');
const { SECURITY_STATUS, NOTIFICATION_TYPES } = require('../config/constants');

// ── Shared populate ───────────────────────────────────────────────────────────
const SEC_POPULATE = [
  { path: 'flight',    select: 'flightNumber scheduledDeparture departureAirport arrivalAirport',
    populate: [
      { path: 'departureAirport', select: 'code city' },
      { path: 'arrivalAirport',   select: 'code city' },
    ],
  },
  { path: 'booking',   select: 'pnr user' },
  { path: 'checkedBy', select: 'firstName lastName role' },
  { path: 'boardingOverrideBy', select: 'firstName lastName role' },
  { path: 'restrictedItems.loggedBy', select: 'firstName lastName' },
  { path: 'incidents.loggedBy',       select: 'firstName lastName' },
];

// ── Helper: notify passenger ──────────────────────────────────────────────────
const notifyPassenger = async (check, title, message) => {
  try {
    const booking = await Booking.findById(check.booking).select('user');
    if (!booking) return;
    const notif = await Notification.create({
      user:    booking.user,
      type:    NOTIFICATION_TYPES.SECURITY_ALERT,
      title,
      message,
      booking: booking._id,
      flight:  check.flight,
    });
    emitToUser(booking.user.toString(), 'notification', notif);
  } catch (err) {
    console.error('Security notification error:', err.message);
  }
};

// ── GET /api/security/stats ───────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [statusStats, watchlistCount, incidentCount, restrictedCount] = await Promise.all([
      SecurityCheck.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SecurityCheck.countDocuments({ isWatchlisted: true }),
      SecurityCheck.aggregate([
        { $project: { incidentCount: { $size: '$incidents' } } },
        { $group: { _id: null, total: { $sum: '$incidentCount' } } },
      ]),
      SecurityCheck.aggregate([
        { $project: { restrictedCount: { $size: '$restrictedItems' } } },
        { $group: { _id: null, total: { $sum: '$restrictedCount' } } },
      ]),
    ]);

    const byStatus = Object.fromEntries(statusStats.map((s) => [s._id, s.count]));
    const total    = Object.values(byStatus).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      stats: {
        total,
        byStatus,
        watchlisted:       watchlistCount,
        totalIncidents:    incidentCount[0]?.total ?? 0,
        restrictedItems:   restrictedCount[0]?.total ?? 0,
        clearanceRate:     total > 0 ? Math.round(((byStatus.cleared ?? 0) / total) * 100) : 0,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/security ─────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const {
      flight, status, isWatchlisted, search,
      page = 1, limit = 20,
    } = req.query;

    const query = {};
    if (flight)       query.flight       = flight;
    if (status)       query.status       = status;
    if (isWatchlisted !== undefined) query.isWatchlisted = isWatchlisted === 'true';
    if (search) {
      query.passengerName = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [checks, total] = await Promise.all([
      SecurityCheck.find(query)
        .populate(SEC_POPULATE)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      SecurityCheck.countDocuments(query),
    ]);

    res.json({
      success: true,
      checks,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/security/flight/:flightId ────────────────────────────────────────
exports.getFlightSecurityStatus = async (req, res, next) => {
  try {
    const checks = await SecurityCheck.find({ flight: req.params.flightId })
      .populate(SEC_POPULATE)
      .sort({ createdAt: 1 })
      .lean();

    const summary = {
      total:      checks.length,
      pending:    checks.filter((c) => c.status === 'pending').length,
      cleared:    checks.filter((c) => c.status === 'cleared').length,
      flagged:    checks.filter((c) => c.status === 'flagged').length,
      rejected:   checks.filter((c) => c.status === 'rejected').length,
      watchlisted:checks.filter((c) => c.isWatchlisted).length,
      canBoard:   checks.filter((c) => c.status !== 'rejected' && c.status !== 'flagged').length,
    };

    res.json({ success: true, checks, summary });
  } catch (err) { next(err); }
};

// ── GET /api/security/:id ─────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const check = await SecurityCheck.findById(req.params.id)
      .populate(SEC_POPULATE)
      .lean();

    if (!check) return next(new AppError('Security check not found.', 404));
    res.json({ success: true, check });
  } catch (err) { next(err); }
};

// ── PATCH /api/security/:id ───────────────────────────────────────────────────
exports.updateCheck = async (req, res, next) => {
  try {
    const {
      status,
      documentVerified,
      baggageCleared,
      biometricVerified,
      visaVerified,
      flagReason,
      incidentNotes,
      isWatchlisted,
      watchlistReason,
      passportNumber,
      nationality,
    } = req.body;

    const check = await SecurityCheck.findById(req.params.id);
    if (!check) return next(new AppError('Security check not found.', 404));

    const previousStatus = check.status;

    // Apply updates
    if (status            !== undefined) check.status            = status;
    if (documentVerified  !== undefined) check.documentVerified  = documentVerified;
    if (baggageCleared    !== undefined) check.baggageCleared    = baggageCleared;
    if (biometricVerified !== undefined) check.biometricVerified = biometricVerified;
    if (visaVerified      !== undefined) check.visaVerified      = visaVerified;
    if (flagReason        !== undefined) check.flagReason        = flagReason;
    if (incidentNotes     !== undefined) check.incidentNotes     = incidentNotes;
    if (isWatchlisted     !== undefined) check.isWatchlisted     = isWatchlisted;
    if (watchlistReason   !== undefined) check.watchlistReason   = watchlistReason;
    if (passportNumber    !== undefined) check.passportNumber    = passportNumber;
    if (nationality       !== undefined) check.nationality       = nationality;

    check.checkedBy = req.user._id;

    // Set timestamps
    if (status === SECURITY_STATUS.CLEARED  && !check.clearedAt)  check.clearedAt  = new Date();
    if (status === SECURITY_STATUS.REJECTED && !check.rejectedAt) check.rejectedAt = new Date();

    await check.save();

    // ── Sync booking passenger security status ────────────────────────────────
    if (check.bookingPassengerId) {
      const booking = await Booking.findById(check.booking);
      if (booking) {
        const pIdx = booking.passengers.findIndex(
          (p) => p._id.toString() === check.bookingPassengerId.toString()
        );
        if (pIdx !== -1) {
          booking.passengers[pIdx].securityCleared = status === SECURITY_STATUS.CLEARED;
          await booking.save();
        }
      }
    }

    // ── Notify passenger on significant status changes ────────────────────────
    if (status && status !== previousStatus) {
      if (status === SECURITY_STATUS.CLEARED) {
        await notifyPassenger(
          check,
          '✅ Security Cleared',
          `${check.passengerName}, your security check has been completed. You are cleared to board.`
        );
      } else if (status === SECURITY_STATUS.FLAGGED) {
        await notifyPassenger(
          check,
          '⚠️ Security Flag',
          `${check.passengerName}, your boarding has been temporarily held for additional security review. Please proceed to the security desk.`
        );
      } else if (status === SECURITY_STATUS.REJECTED) {
        await notifyPassenger(
          check,
          '🚫 Boarding Denied',
          `${check.passengerName}, you have been denied boarding for this flight. Please contact airport security for assistance.`
        );
      }
    }

    await auditLog(
      req, 'SECURITY_CHECK', 'Security', check._id,
      `Security check for ${check.passengerName}: ${previousStatus} → ${status || previousStatus}`
    );

    const populated = await SecurityCheck.findById(check._id).populate(SEC_POPULATE).lean();
    res.json({ success: true, message: 'Security check updated.', check: populated });
  } catch (err) { next(err); }
};

// ── POST /api/security/:id/restricted-item ────────────────────────────────────
exports.logRestrictedItem = async (req, res, next) => {
  try {
    const { item, description, action } = req.body;

    const check = await SecurityCheck.findById(req.params.id);
    if (!check) return next(new AppError('Security check not found.', 404));

    check.restrictedItems.push({
      item,
      description: description || null,
      action:      action || 'confiscated',
      loggedAt:    new Date(),
      loggedBy:    req.user._id,
    });

    // Auto-flag if item is confiscated
    if (action === 'confiscated' || action === 'escalated') {
      if (check.status === SECURITY_STATUS.PENDING) {
        check.status    = SECURITY_STATUS.FLAGGED;
        check.flagReason = `Restricted item found: ${item}`;
        check.checkedBy  = req.user._id;
      }
    }

    await check.save();

    await auditLog(
      req, 'RESTRICTED_ITEM', 'Security', check._id,
      `Restricted item logged for ${check.passengerName}: ${item} (${action})`
    );

    res.json({ success: true, message: 'Restricted item logged.', check });
  } catch (err) { next(err); }
};

// ── POST /api/security/:id/incident ──────────────────────────────────────────
exports.logIncident = async (req, res, next) => {
  try {
    const { type, description, severity } = req.body;

    const check = await SecurityCheck.findById(req.params.id);
    if (!check) return next(new AppError('Security check not found.', 404));

    check.incidents.push({
      type,
      description,
      severity: severity || 'medium',
      loggedAt: new Date(),
      loggedBy: req.user._id,
    });

    // Auto-flag on high/critical incidents
    if (['high', 'critical'].includes(severity) && check.status === SECURITY_STATUS.PENDING) {
      check.status    = SECURITY_STATUS.FLAGGED;
      check.flagReason = `Security incident: ${type}`;
      check.checkedBy  = req.user._id;
    }

    await check.save();

    await auditLog(
      req, 'SECURITY_INCIDENT', 'Security', check._id,
      `Incident logged for ${check.passengerName}: ${type} (${severity})`
    );

    res.json({ success: true, message: 'Incident logged.', check });
  } catch (err) { next(err); }
};

// ── POST /api/security/:id/override ──────────────────────────────────────────
exports.boardingOverride = async (req, res, next) => {
  try {
    const { reason } = req.body;

    // Only super_admin and airport_admin can override
    if (!['super_admin', 'airport_admin'].includes(req.user.role)) {
      return next(new AppError('Only administrators can override boarding restrictions.', 403));
    }

    const check = await SecurityCheck.findById(req.params.id);
    if (!check) return next(new AppError('Security check not found.', 404));

    if (check.boardingOverride) {
      return next(new AppError('Boarding override already applied.', 400));
    }

    check.boardingOverride       = true;
    check.boardingOverrideBy     = req.user._id;
    check.boardingOverrideReason = reason;
    check.boardingOverrideAt     = new Date();
    await check.save();

    await auditLog(
      req, 'BOARDING_OVERRIDE', 'Security', check._id,
      `Boarding override for ${check.passengerName} by ${req.user.firstName} ${req.user.lastName}: ${reason}`
    );

    res.json({ success: true, message: 'Boarding override applied.', check });
  } catch (err) { next(err); }
};

// ── GET /api/security/passenger/:bookingId/:passengerId ───────────────────────
exports.getPassengerCheck = async (req, res, next) => {
  try {
    const check = await SecurityCheck.findOne({
      booking:            req.params.bookingId,
      bookingPassengerId: req.params.passengerId,
    })
      .populate(SEC_POPULATE)
      .lean();

    if (!check) return next(new AppError('Security check not found for this passenger.', 404));
    res.json({ success: true, check });
  } catch (err) { next(err); }
};
