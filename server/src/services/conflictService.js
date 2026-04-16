/**
 * conflictService.js
 * Centralized conflict detection for flight resource assignments.
 * All checks return { conflict: boolean, message: string, conflictingFlight?: object }
 *
 * Rules enforced:
 *  1. Aircraft cannot be assigned to two overlapping flights
 *  2. A gate cannot be used by two flights whose windows overlap
 *  3. A runway cannot be used by two flights within RUNWAY_SLOT_BUFFER_MINUTES
 *  4. Aircraft under maintenance or grounded cannot be assigned
 */

const Flight   = require('../models/Flight');
const Aircraft = require('../models/Aircraft');
const { FLIGHT_STATUS, AIRCRAFT_STATUS, RUNWAY_SLOT_BUFFER_MINUTES } = require('../config/constants');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a time-overlap query for a flight window [depTime, arrTime] */
const overlapQuery = (depTime, arrTime) => ({
  $or: [
    // Other flight departs during this flight's window
    { scheduledDeparture: { $gte: new Date(depTime), $lt: new Date(arrTime) } },
    // Other flight arrives during this flight's window
    { scheduledArrival:   { $gt: new Date(depTime), $lte: new Date(arrTime) } },
    // Other flight completely contains this flight's window
    {
      scheduledDeparture: { $lte: new Date(depTime) },
      scheduledArrival:   { $gte: new Date(arrTime) },
    },
  ],
});

/** Base query: active, non-cancelled, non-arrived flights */
const activeFlightFilter = {
  isActive: true,
  status: { $nin: [FLIGHT_STATUS.CANCELLED, FLIGHT_STATUS.ARRIVED, FLIGHT_STATUS.DIVERTED] },
};

// ── 1. Aircraft availability ──────────────────────────────────────────────────

/**
 * Check if the aircraft is in a state that allows assignment.
 * @param {string} aircraftId
 * @returns {{ ok: boolean, message?: string }}
 */
exports.checkAircraftStatus = async (aircraftId) => {
  const ac = await Aircraft.findById(aircraftId);
  if (!ac) return { ok: false, message: 'Aircraft not found.' };

  if (ac.status === AIRCRAFT_STATUS.MAINTENANCE) {
    return { ok: false, message: `Aircraft ${ac.registrationNumber} is currently under maintenance and cannot be assigned.` };
  }
  if (ac.status === AIRCRAFT_STATUS.GROUNDED) {
    return { ok: false, message: `Aircraft ${ac.registrationNumber} is grounded and cannot be assigned.` };
  }
  if (ac.status === AIRCRAFT_STATUS.RETIRED) {
    return { ok: false, message: `Aircraft ${ac.registrationNumber} has been retired.` };
  }
  if (!ac.isActive) {
    return { ok: false, message: `Aircraft ${ac.registrationNumber} is not active.` };
  }
  return { ok: true, aircraft: ac };
};

// ── 2. Aircraft schedule conflict ─────────────────────────────────────────────

/**
 * Check if the aircraft is already assigned to another flight that overlaps
 * with the proposed [scheduledDeparture, scheduledArrival] window.
 *
 * @param {string} aircraftId
 * @param {Date|string} scheduledDeparture
 * @param {Date|string} scheduledArrival
 * @param {string} [excludeFlightId]  - flight being edited (exclude from check)
 */
exports.checkAircraftConflict = async (aircraftId, scheduledDeparture, scheduledArrival, excludeFlightId = null) => {
  const query = {
    aircraft: aircraftId,
    ...activeFlightFilter,
    ...overlapQuery(scheduledDeparture, scheduledArrival),
  };
  if (excludeFlightId) query._id = { $ne: excludeFlightId };

  const conflict = await Flight.findOne(query).select('flightNumber scheduledDeparture scheduledArrival');
  if (conflict) {
    return {
      conflict: true,
      message:  `Aircraft is already assigned to flight ${conflict.flightNumber} during this time window.`,
      conflictingFlight: conflict,
    };
  }
  return { conflict: false };
};

// ── 3. Gate conflict ──────────────────────────────────────────────────────────

/**
 * Check if the departure gate is already occupied by another flight
 * whose window overlaps with [scheduledDeparture, scheduledArrival].
 * A 30-minute buffer is added on each side for turnaround time.
 *
 * @param {string} gateId
 * @param {Date|string} scheduledDeparture
 * @param {Date|string} scheduledArrival
 * @param {string} [excludeFlightId]
 */
exports.checkGateConflict = async (gateId, scheduledDeparture, scheduledArrival, excludeFlightId = null) => {
  if (!gateId) return { conflict: false };

  // Add 30-min buffer for gate turnaround
  const bufferMs  = 30 * 60 * 1000;
  const windowDep = new Date(new Date(scheduledDeparture).getTime() - bufferMs);
  const windowArr = new Date(new Date(scheduledArrival).getTime()   + bufferMs);

  const query = {
    departureGate: gateId,
    ...activeFlightFilter,
    ...overlapQuery(windowDep, windowArr),
  };
  if (excludeFlightId) query._id = { $ne: excludeFlightId };

  const conflict = await Flight.findOne(query).select('flightNumber scheduledDeparture scheduledArrival');
  if (conflict) {
    return {
      conflict: true,
      message:  `Gate conflict with flight ${conflict.flightNumber}. Gates require a 30-minute turnaround buffer.`,
      conflictingFlight: conflict,
    };
  }
  return { conflict: false };
};

// ── 4. Runway conflict ────────────────────────────────────────────────────────

/**
 * Check if the runway is already allocated to another flight within
 * RUNWAY_SLOT_BUFFER_MINUTES of the proposed departure time.
 *
 * @param {string} runwayId
 * @param {Date|string} scheduledDeparture
 * @param {string} [excludeFlightId]
 */
exports.checkRunwayConflict = async (runwayId, scheduledDeparture, excludeFlightId = null) => {
  if (!runwayId) return { conflict: false };

  const bufferMs = RUNWAY_SLOT_BUFFER_MINUTES * 60 * 1000;
  const depTime  = new Date(scheduledDeparture);

  const query = {
    runway: runwayId,
    ...activeFlightFilter,
    scheduledDeparture: {
      $gte: new Date(depTime.getTime() - bufferMs),
      $lte: new Date(depTime.getTime() + bufferMs),
    },
  };
  if (excludeFlightId) query._id = { $ne: excludeFlightId };

  const conflict = await Flight.findOne(query).select('flightNumber scheduledDeparture');
  if (conflict) {
    return {
      conflict: true,
      message:  `Runway conflict with flight ${conflict.flightNumber}. Runways require a ${RUNWAY_SLOT_BUFFER_MINUTES}-minute slot buffer.`,
      conflictingFlight: conflict,
    };
  }
  return { conflict: false };
};

// ── 5. Run all checks at once ─────────────────────────────────────────────────

/**
 * Run all conflict checks for a flight create/update operation.
 * Returns the first conflict found, or { conflict: false } if all clear.
 *
 * @param {object} params
 * @param {string}  params.aircraftId
 * @param {string}  [params.gateId]
 * @param {string}  [params.runwayId]
 * @param {Date}    params.scheduledDeparture
 * @param {Date}    params.scheduledArrival
 * @param {string}  [params.excludeFlightId]  - for updates
 */
exports.runAllConflictChecks = async ({
  aircraftId,
  gateId,
  runwayId,
  scheduledDeparture,
  scheduledArrival,
  excludeFlightId,
}) => {
  // 1. Aircraft status
  const statusCheck = await exports.checkAircraftStatus(aircraftId);
  if (!statusCheck.ok) return { conflict: true, message: statusCheck.message };

  // 2. Aircraft schedule overlap
  const acConflict = await exports.checkAircraftConflict(
    aircraftId, scheduledDeparture, scheduledArrival, excludeFlightId
  );
  if (acConflict.conflict) return acConflict;

  // 3. Gate overlap
  if (gateId) {
    const gateConflict = await exports.checkGateConflict(
      gateId, scheduledDeparture, scheduledArrival, excludeFlightId
    );
    if (gateConflict.conflict) return gateConflict;
  }

  // 4. Runway slot
  if (runwayId) {
    const runwayConflict = await exports.checkRunwayConflict(
      runwayId, scheduledDeparture, excludeFlightId
    );
    if (runwayConflict.conflict) return runwayConflict;
  }

  return { conflict: false };
};
