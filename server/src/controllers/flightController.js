/**
 * flightController.js
 * Full CRUD + status management for flights.
 *
 * Endpoints:
 *   GET    /api/flights              - paginated list with filters
 *   GET    /api/flights/search       - passenger flight search
 *   GET    /api/flights/live         - live departure board
 *   GET    /api/flights/conflicts    - check for resource conflicts
 *   GET    /api/flights/:id          - single flight detail
 *   POST   /api/flights              - create flight (with conflict checks)
 *   PUT    /api/flights/:id          - update flight details
 *   PATCH  /api/flights/:id/status   - update operational status
 *   PATCH  /api/flights/:id/gate     - reassign departure gate
 *   DELETE /api/flights/:id          - soft delete
 */

const Flight    = require('../models/Flight');
const Aircraft  = require('../models/Aircraft');
const Booking   = require('../models/Booking');
const AppError  = require('../utils/AppError');
const auditLog  = require('../middleware/auditLogger');
const conflictSvc = require('../services/conflictService');
const notifSvc    = require('../services/notificationService');
const { emitFlightUpdate } = require('../socket');
const { FLIGHT_STATUS, AIRCRAFT_STATUS, CHECKIN_WINDOW, BOARDING_CLOSE_MINUTES } = require('../config/constants');
const { addHours, subMinutes } = require('date-fns');

// ── Shared populate config ────────────────────────────────────────────────────
const FLIGHT_POPULATE = [
  { path: 'airline',           select: 'name code logo' },
  { path: 'aircraft',          select: 'registrationNumber model totalSeats economySeats businessSeats firstClassSeats status' },
  { path: 'departureAirport',  select: 'name code city country timezone' },
  { path: 'arrivalAirport',    select: 'name code city country timezone' },
  { path: 'departureTerminal', select: 'name code' },
  { path: 'arrivalTerminal',   select: 'name code' },
  { path: 'departureGate',     select: 'gateNumber type' },
  { path: 'arrivalGate',       select: 'gateNumber type' },
  { path: 'runway',            select: 'runwayId' },
  { path: 'parkingBay',        select: 'bayNumber' },
  { path: 'cancelledBy',       select: 'firstName lastName' },
];

// ── Helper: compute operational time windows ──────────────────────────────────
const computeWindows = (scheduledDeparture) => {
  const dep = new Date(scheduledDeparture);
  return {
    checkInOpenTime:   addHours(dep, -CHECKIN_WINDOW.OPEN_HOURS),
    checkInCloseTime:  addHours(dep, -CHECKIN_WINDOW.CLOSE_HOURS),
    boardingOpenTime:  subMinutes(dep, 60),
    boardingCloseTime: subMinutes(dep, BOARDING_CLOSE_MINUTES),
  };
};

// ── GET /api/flights ──────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const {
      departureAirport, arrivalAirport, status, airline, aircraft,
      date, dateFrom, dateTo,
      search,
      page  = 1,
      limit = 20,
      sort  = 'scheduledDeparture',
    } = req.query;

    const query = { isActive: true };

    if (departureAirport) query.departureAirport = departureAirport;
    if (arrivalAirport)   query.arrivalAirport   = arrivalAirport;
    if (airline)          query.airline          = airline;
    if (aircraft)         query.aircraft         = aircraft;

    // Status — support comma-separated list
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    // Date filters
    if (date) {
      const d = new Date(date);
      query.scheduledDeparture = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    } else if (dateFrom || dateTo) {
      query.scheduledDeparture = {};
      if (dateFrom) query.scheduledDeparture.$gte = new Date(dateFrom);
      if (dateTo)   query.scheduledDeparture.$lte = new Date(dateTo);
    }

    // Flight number search
    if (search) {
      query.flightNumber = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = sort.startsWith('-')
      ? { [sort.slice(1)]: -1 }
      : { [sort]: 1 };

    const [flights, total] = await Promise.all([
      Flight.find(query)
        .populate(FLIGHT_POPULATE)
        .skip(skip)
        .limit(Number(limit))
        .sort(sortObj)
        .lean(),
      Flight.countDocuments(query),
    ]);

    res.json({
      success: true,
      flights,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/flights/search ───────────────────────────────────────────────────
exports.search = async (req, res, next) => {
  try {
    const { from, to, date, seatClass = 'economy', passengers = 1 } = req.query;

    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);

    const flights = await Flight.find({
      departureAirport: from,
      arrivalAirport:   to,
      scheduledDeparture: { $gte: start, $lte: end },
      status:   { $nin: [FLIGHT_STATUS.CANCELLED, FLIGHT_STATUS.DIVERTED, FLIGHT_STATUS.ARRIVED] },
      isActive: true,
    })
      .populate(FLIGHT_POPULATE)
      .sort({ scheduledDeparture: 1 })
      .lean();

    // Filter by available seats for the requested class
    const available = flights.filter((f) => {
      if (f.availableSeats < Number(passengers)) return false;
      // If class-specific filtering is needed in future, add here
      return true;
    });

    res.json({ success: true, flights: available, total: available.length });
  } catch (err) { next(err); }
};

// ── GET /api/flights/live ─────────────────────────────────────────────────────
exports.getLiveStatus = async (req, res, next) => {
  try {
    const flights = await Flight.find({
      status:   { $in: [FLIGHT_STATUS.BOARDING, FLIGHT_STATUS.DEPARTED, FLIGHT_STATUS.IN_FLIGHT, FLIGHT_STATUS.DELAYED, FLIGHT_STATUS.SCHEDULED] },
      isActive: true,
      scheduledDeparture: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // last 2h
    })
      .populate([
        { path: 'airline',          select: 'name code logo' },
        { path: 'departureAirport', select: 'name code city' },
        { path: 'arrivalAirport',   select: 'name code city' },
        { path: 'departureGate',    select: 'gateNumber' },
        { path: 'departureTerminal',select: 'name code' },
      ])
      .sort({ scheduledDeparture: 1 })
      .limit(100)
      .lean();

    res.json({ success: true, flights });
  } catch (err) { next(err); }
};

// ── GET /api/flights/conflicts ────────────────────────────────────────────────
/**
 * Pre-flight conflict check — called by the frontend before submitting the form.
 * Query params: aircraftId, gateId, runwayId, scheduledDeparture, scheduledArrival, excludeFlightId
 */
exports.checkConflicts = async (req, res, next) => {
  try {
    const { aircraftId, gateId, runwayId, scheduledDeparture, scheduledArrival, excludeFlightId } = req.query;

    if (!aircraftId || !scheduledDeparture || !scheduledArrival) {
      return next(new AppError('aircraftId, scheduledDeparture, and scheduledArrival are required.', 400));
    }

    const result = await conflictSvc.runAllConflictChecks({
      aircraftId,
      gateId,
      runwayId,
      scheduledDeparture,
      scheduledArrival,
      excludeFlightId,
    });

    if (result.conflict) {
      await notifSvc.notifyAdminsConflict({
        title: 'Flight Conflict Check Alert',
        message: result.message,
        data: {
          aircraftId,
          gateId,
          runwayId,
          scheduledDeparture,
          scheduledArrival,
          excludeFlightId: excludeFlightId || null,
          source: 'check_conflicts',
        },
      });
    }

    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

// ── GET /api/flights/:id ──────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id).populate(FLIGHT_POPULATE).lean();
    if (!flight) return next(new AppError('Flight not found.', 404));
    res.json({ success: true, flight });
  } catch (err) { next(err); }
};

// ── POST /api/flights ─────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const {
      aircraft: aircraftId,
      departureGate: gateId,
      runway: runwayId,
      scheduledDeparture,
      scheduledArrival,
    } = req.body;

    // Run all conflict checks
    const conflictResult = await conflictSvc.runAllConflictChecks({
      aircraftId,
      gateId,
      runwayId,
      scheduledDeparture,
      scheduledArrival,
    });
    if (conflictResult.conflict) {
      await notifSvc.notifyAdminsConflict({
        title: 'Flight Creation Blocked by Conflict',
        message: conflictResult.message,
        data: {
          flightNumber: req.body.flightNumber,
          aircraftId,
          gateId,
          runwayId,
          scheduledDeparture,
          scheduledArrival,
          source: 'create_flight',
        },
      });
      return next(new AppError(conflictResult.message, 409));
    }

    // Get aircraft seat count
    const ac = conflictResult.aircraft || await Aircraft.findById(aircraftId);

    // Build flight document
    const flightData = {
      ...req.body,
      totalSeats:     ac.totalSeats,
      availableSeats: ac.totalSeats,
      bookedSeats:    0,
      ...computeWindows(scheduledDeparture),
    };

    const flight = await Flight.create(flightData);

    // Mark aircraft as assigned
    await Aircraft.findByIdAndUpdate(aircraftId, { status: AIRCRAFT_STATUS.ASSIGNED });

    // Populate for response
    const populated = await Flight.findById(flight._id).populate(FLIGHT_POPULATE).lean();

    await auditLog(req, 'CREATE', 'Flight', flight._id, `Created flight ${flight.flightNumber}`);

    res.status(201).json({ success: true, message: 'Flight created successfully.', flight: populated });
  } catch (err) { next(err); }
};

// ── PUT /api/flights/:id ──────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const existing = await Flight.findById(req.params.id);
    if (!existing) return next(new AppError('Flight not found.', 404));

    if (!existing.isActive) return next(new AppError('Cannot update a deleted flight.', 400));

    const {
      aircraft: newAircraftId,
      departureGate: newGateId,
      runway: newRunwayId,
      scheduledDeparture: newDep,
      scheduledArrival:   newArr,
    } = req.body;

    // Only run conflict checks if relevant fields changed
    const aircraftChanged = newAircraftId && newAircraftId !== existing.aircraft?.toString();
    const gateChanged     = newGateId     && newGateId     !== existing.departureGate?.toString();
    const runwayChanged   = newRunwayId   && newRunwayId   !== existing.runway?.toString();
    const timeChanged     = newDep || newArr;

    if (aircraftChanged || gateChanged || runwayChanged || timeChanged) {
      const conflictResult = await conflictSvc.runAllConflictChecks({
        aircraftId:         newAircraftId   || existing.aircraft.toString(),
        gateId:             newGateId       || existing.departureGate?.toString(),
        runwayId:           newRunwayId     || existing.runway?.toString(),
        scheduledDeparture: newDep          || existing.scheduledDeparture,
        scheduledArrival:   newArr          || existing.scheduledArrival,
        excludeFlightId:    req.params.id,
      });
      if (conflictResult.conflict) {
        await notifSvc.notifyAdminsConflict({
          title: 'Flight Update Blocked by Conflict',
          message: conflictResult.message,
          data: {
            flightId: req.params.id,
            flightNumber: existing.flightNumber,
            aircraftId: newAircraftId || existing.aircraft?.toString(),
            gateId: newGateId || existing.departureGate?.toString(),
            runwayId: newRunwayId || existing.runway?.toString(),
            scheduledDeparture: newDep || existing.scheduledDeparture,
            scheduledArrival: newArr || existing.scheduledArrival,
            source: 'update_flight',
          },
          flightId: existing._id,
        });
        return next(new AppError(conflictResult.message, 409));
      }
    }

    // Recompute windows if departure time changed
    const updates = { ...req.body };
    if (newDep) {
      Object.assign(updates, computeWindows(newDep));
    }

    // If aircraft changed, update seat counts and aircraft statuses
    if (aircraftChanged) {
      const newAc = await Aircraft.findById(newAircraftId);
      updates.totalSeats     = newAc.totalSeats;
      updates.availableSeats = newAc.totalSeats - existing.bookedSeats;
      // Free old aircraft
      await Aircraft.findByIdAndUpdate(existing.aircraft, { status: AIRCRAFT_STATUS.AVAILABLE });
      // Assign new aircraft
      await Aircraft.findByIdAndUpdate(newAircraftId, { status: AIRCRAFT_STATUS.ASSIGNED });
    }

    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate(FLIGHT_POPULATE).lean();

    // Broadcast real-time update
    emitFlightUpdate(flight._id.toString(), { flight });

    await auditLog(req, 'UPDATE', 'Flight', flight._id, `Updated flight ${flight.flightNumber}`, existing, flight);

    res.json({ success: true, message: 'Flight updated successfully.', flight });
  } catch (err) { next(err); }
};

// ── PATCH /api/flights/:id/status ─────────────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, delayReason, delayMinutes, cancellationReason } = req.body;

    const existing = await Flight.findById(req.params.id);
    if (!existing) return next(new AppError('Flight not found.', 404));

    // Validate status transition
    const invalidTransitions = {
      arrived:   ['scheduled', 'boarding', 'delayed'],
      departed:  ['scheduled', 'boarding', 'delayed'],
      cancelled: ['arrived', 'departed'],
    };
    if (invalidTransitions[existing.status]?.includes(status)) {
      return next(new AppError(`Cannot transition from "${existing.status}" to "${status}".`, 400));
    }

    const updates = { status };

    if (status === FLIGHT_STATUS.DELAYED) {
      updates.delayReason       = delayReason;
      updates.delayMinutes      = Number(delayMinutes);
      updates.estimatedDeparture = new Date(
        existing.scheduledDeparture.getTime() + Number(delayMinutes) * 60000
      );
      updates.estimatedArrival = new Date(
        existing.scheduledArrival.getTime() + Number(delayMinutes) * 60000
      );
    }

    if (status === FLIGHT_STATUS.CANCELLED) {
      updates.cancellationReason = cancellationReason;
      updates.cancelledAt        = new Date();
      updates.cancelledBy        = req.user._id;
      // Free the aircraft
      await Aircraft.findByIdAndUpdate(existing.aircraft, { status: AIRCRAFT_STATUS.AVAILABLE });
    }

    if (status === FLIGHT_STATUS.DEPARTED) {
      updates.actualDeparture = new Date();
    }

    if (status === FLIGHT_STATUS.ARRIVED) {
      updates.actualArrival = new Date();
      // Free the aircraft after arrival
      await Aircraft.findByIdAndUpdate(existing.aircraft, { status: AIRCRAFT_STATUS.AVAILABLE });
    }

    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate(FLIGHT_POPULATE).lean();

    // Notify passengers for significant status changes
    const notifContent = notifSvc.buildStatusNotification(flight, status, {
      delayMinutes,
      delayReason,
      cancellationReason,
    });
    if (notifContent) {
      const count = await notifSvc.notifyFlightPassengers(flight, notifContent.type, notifContent.title, notifContent.message);
      console.log(`📢 Notified ${count} passenger(s) about ${status} on ${flight.flightNumber}`);
    }

    // Broadcast real-time update to flight subscribers
    emitFlightUpdate(flight._id.toString(), { flight });

    await auditLog(
      req, 'STATUS_UPDATE', 'Flight', flight._id,
      `Flight ${flight.flightNumber}: ${existing.status} → ${status}`
    );

    res.json({ success: true, message: `Flight status updated to "${status}".`, flight });
  } catch (err) { next(err); }
};

// ── PATCH /api/flights/:id/gate ───────────────────────────────────────────────
exports.reassignGate = async (req, res, next) => {
  try {
    const { gateId } = req.body;
    if (!gateId) return next(new AppError('gateId is required.', 400));

    const existing = await Flight.findById(req.params.id);
    if (!existing) return next(new AppError('Flight not found.', 404));

    // Check gate conflict
    const gateConflict = await conflictSvc.checkGateConflict(
      gateId,
      existing.scheduledDeparture,
      existing.scheduledArrival,
      req.params.id
    );
    if (gateConflict.conflict) return next(new AppError(gateConflict.message, 409));

    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      { departureGate: gateId },
      { new: true }
    ).populate(FLIGHT_POPULATE).lean();

    // Notify passengers of gate change
    const Gate = require('../models/Gate');
    const gate = await Gate.findById(gateId).select('gateNumber');
    const notifContent = notifSvc.buildStatusNotification(flight, 'gate_change', {
      newGate: gate?.gateNumber,
    });
    if (notifContent) {
      await notifSvc.notifyFlightPassengers(flight, notifContent.type, notifContent.title, notifContent.message);
    }

    emitFlightUpdate(flight._id.toString(), { flight });
    await auditLog(req, 'GATE_CHANGE', 'Flight', flight._id, `Gate changed for ${flight.flightNumber}`);

    res.json({ success: true, message: 'Gate reassigned successfully.', flight });
  } catch (err) { next(err); }
};

// ── DELETE /api/flights/:id ───────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return next(new AppError('Flight not found.', 404));

    // Prevent deleting a flight with confirmed bookings
    const bookingCount = await Booking.countDocuments({
      flight: flight._id,
      status: { $in: ['confirmed', 'pending'] },
    });
    if (bookingCount > 0) {
      return next(new AppError(
        `Cannot delete flight ${flight.flightNumber} — it has ${bookingCount} active booking(s). Cancel the flight instead.`,
        400
      ));
    }

    await Flight.findByIdAndUpdate(req.params.id, { isActive: false });

    // Free the aircraft
    await Aircraft.findByIdAndUpdate(flight.aircraft, { status: AIRCRAFT_STATUS.AVAILABLE });

    await auditLog(req, 'DELETE', 'Flight', flight._id, `Deleted flight ${flight.flightNumber}`);

    res.json({ success: true, message: `Flight ${flight.flightNumber} deleted.` });
  } catch (err) { next(err); }
};

// ── GET /api/flights/:id/bookings ─────────────────────────────────────────────
exports.getFlightBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { flight: req.params.id };
    if (status) query.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('user', 'firstName lastName email phone')
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Booking.countDocuments(query),
    ]);

    res.json({ success: true, bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
};
