/**
 * boardingController.js
 * Handles gate boarding operations.
 *
 * Endpoints:
 *   POST /api/boarding/scan                  - scan QR / verify boarding pass → mark boarded
 *   GET  /api/boarding/flight/:flightId      - boarding list for a flight
 *   POST /api/boarding/flight/:flightId/close - close boarding, mark no-shows
 *   GET  /api/boarding/pass/:id/pdf          - download boarding pass PDF
 *   GET  /api/boarding/pass/:id/info         - boarding pass detail (for frontend display)
 */

const BoardingPass  = require('../models/BoardingPass');
const Booking       = require('../models/Booking');
const Flight        = require('../models/Flight');
const SecurityCheck = require('../models/SecurityCheck');
const Notification  = require('../models/Notification');
const AppError      = require('../utils/AppError');
const auditLog      = require('../middleware/auditLogger');
const { emitToUser, emitFlightUpdate } = require('../socket');
const { NOTIFICATION_TYPES, FLIGHT_STATUS } = require('../config/constants');
const { generateBoardingPassPDF } = require('../utils/generatePDF');

// ── POST /api/boarding/scan ───────────────────────────────────────────────────
exports.scanAndBoard = async (req, res, next) => {
  try {
    const { qrData, boardingPassId } = req.body;

    if (!qrData && !boardingPassId) {
      return next(new AppError('Provide either qrData or boardingPassId.', 400));
    }

    // ── 1. Find the boarding pass ─────────────────────────────────────────────
    let boardingPass;

    if (boardingPassId) {
      boardingPass = await BoardingPass.findById(boardingPassId)
        .populate('flight')
        .populate('booking');
    } else {
      // Parse QR payload
      let parsed;
      try {
        parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      } catch {
        return next(new AppError('Invalid QR code format.', 400));
      }

      // Find by boarding pass ID embedded in QR (v1 format)
      if (parsed.bpId) {
        boardingPass = await BoardingPass.findById(parsed.bpId)
          .populate('flight')
          .populate('booking');
      } else {
        // Fallback: find by PNR + flight + seat
        boardingPass = await BoardingPass.findOne({
          pnr:          parsed.pnr,
          flightNumber: parsed.fn,
          seatNumber:   parsed.seat,
        })
          .populate('flight')
          .populate('booking');
      }
    }

    if (!boardingPass) {
      return next(new AppError('Boarding pass not found. Please verify the QR code.', 404));
    }

    // ── 2. Validate boarding pass ─────────────────────────────────────────────
    if (!boardingPass.isValid) {
      return next(new AppError('This boarding pass has been invalidated.', 400));
    }

    if (boardingPass.isBoarded) {
      return next(new AppError(
        `${boardingPass.passengerName} has already boarded (at ${boardingPass.boardedAt?.toLocaleTimeString()}).`,
        400
      ));
    }

    const flight = boardingPass.flight;
    const now    = new Date();

    // ── 3. Boarding window check ──────────────────────────────────────────────
    if (flight.boardingOpenTime && now < new Date(flight.boardingOpenTime)) {
      const minsUntil = Math.round((new Date(flight.boardingOpenTime) - now) / 60000);
      return next(new AppError(
        `Boarding has not opened yet. Opens in ${minsUntil} minute(s).`,
        400
      ));
    }

    if (flight.boardingCloseTime && now > new Date(flight.boardingCloseTime)) {
      return next(new AppError('Boarding is closed for this flight.', 400));
    }

    // ── 4. Security clearance check ───────────────────────────────────────────
    const secCheck = await SecurityCheck.findOne({
      booking:            boardingPass.booking._id,
      bookingPassengerId: boardingPass.bookingPassengerId,
    });

    if (secCheck) {
      // Boarding override bypasses all security blocks
      if (!secCheck.boardingOverride) {
        if (secCheck.status === 'rejected') {
          return next(new AppError(
            `${boardingPass.passengerName} has been rejected by security and cannot board. Contact security desk.`,
            403
          ));
        }
        if (secCheck.status === 'flagged') {
          return next(new AppError(
            `${boardingPass.passengerName} is flagged for security review. Please escort to the security desk before boarding.`,
            403
          ));
        }
      }
    }

    // ── 5. Mark boarded ───────────────────────────────────────────────────────
    boardingPass.isBoarded = true;
    boardingPass.boardedAt = new Date();
    await boardingPass.save();

    // ── 6. Update booking passenger status ────────────────────────────────────
    const booking = await Booking.findById(boardingPass.booking._id);
    if (booking) {
      const pIdx = booking.passengers.findIndex(
        (p) => p._id.toString() === boardingPass.bookingPassengerId?.toString()
      );
      if (pIdx !== -1) {
        booking.passengers[pIdx].checkinStatus = 'boarded';
        await booking.save();
      }
    }

    await auditLog(
      req, 'BOARD', 'Boarding', boardingPass._id,
      `Boarded ${boardingPass.passengerName} on ${flight.flightNumber} (seat ${boardingPass.seatNumber})`
    );

    res.json({
      success:     true,
      message:     `${boardingPass.passengerName} boarded successfully.`,
      boardingPass: {
        _id:           boardingPass._id,
        passengerName: boardingPass.passengerName,
        seatNumber:    boardingPass.seatNumber,
        seatClass:     boardingPass.seatClass,
        gate:          boardingPass.gate,
        pnr:           boardingPass.pnr,
        sequenceNumber:boardingPass.sequenceNumber,
        boardedAt:     boardingPass.boardedAt,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/boarding/flight/:flightId ────────────────────────────────────────
exports.getBoardingList = async (req, res, next) => {
  try {
    const { flightId } = req.params;

    const boardingPasses = await BoardingPass.find({ flight: flightId })
      .sort({ sequenceNumber: 1, createdAt: 1 })
      .lean();

    const boarded    = boardingPasses.filter((b) => b.isBoarded).length;
    const notBoarded = boardingPasses.filter((b) => !b.isBoarded && b.isValid).length;
    const invalid    = boardingPasses.filter((b) => !b.isValid).length;

    res.json({
      success: true,
      boardingPasses,
      summary: {
        total:      boardingPasses.length,
        boarded,
        notBoarded,
        invalid,
        percentage: boardingPasses.length > 0
          ? Math.round((boarded / boardingPasses.length) * 100)
          : 0,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/boarding/flight/:flightId/close ─────────────────────────────────
exports.closeBoarding = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.flightId);
    if (!flight) return next(new AppError('Flight not found.', 404));

    // Mark all checked-in (not yet boarded) passengers as no-show
    const bookings = await Booking.find({
      flight: flight._id,
      status: { $in: ['confirmed'] },
    });

    let noShowCount = 0;
    for (const booking of bookings) {
      let changed = false;
      booking.passengers.forEach((p) => {
        if (p.checkinStatus === 'checked_in') {
          p.checkinStatus = 'no_show';
          noShowCount++;
          changed = true;
        }
      });
      if (changed) await booking.save();
    }

    // Invalidate all unused boarding passes
    const invalidated = await BoardingPass.updateMany(
      { flight: flight._id, isBoarded: false, isValid: true },
      { isValid: false }
    );

    // Emit real-time update
    emitFlightUpdate(flight._id.toString(), { boardingClosed: true, noShowCount });

    await auditLog(
      req, 'CLOSE_BOARDING', 'Boarding', flight._id,
      `Boarding closed for ${flight.flightNumber}. No-shows: ${noShowCount}, Invalidated: ${invalidated.modifiedCount}`
    );

    res.json({
      success:    true,
      message:    `Boarding closed for ${flight.flightNumber}. ${noShowCount} no-show(s) recorded.`,
      noShowCount,
      invalidated: invalidated.modifiedCount,
    });
  } catch (err) { next(err); }
};

// ── GET /api/boarding/pass/:id/pdf ────────────────────────────────────────────
exports.downloadBoardingPass = async (req, res, next) => {
  try {
    const boardingPass = await BoardingPass.findById(req.params.id)
      .populate({
        path: 'flight',
        populate: [
          { path: 'departureAirport', select: 'name code city' },
          { path: 'arrivalAirport',   select: 'name code city' },
        ],
      })
      .lean();

    if (!boardingPass) return next(new AppError('Boarding pass not found.', 404));

    // Enrich with airport names if not already stored
    const data = {
      ...boardingPass,
      departureAirportName: boardingPass.departureAirportName || boardingPass.flight?.departureAirport?.name,
      arrivalAirportName:   boardingPass.arrivalAirportName   || boardingPass.flight?.arrivalAirport?.name,
    };

    generateBoardingPassPDF(res, data);
  } catch (err) { next(err); }
};

// ── GET /api/boarding/pass/:id/info ───────────────────────────────────────────
exports.getBoardingPassInfo = async (req, res, next) => {
  try {
    const boardingPass = await BoardingPass.findById(req.params.id)
      .populate({
        path: 'flight',
        populate: [
          { path: 'departureAirport', select: 'name code city' },
          { path: 'arrivalAirport',   select: 'name code city' },
          { path: 'departureGate',    select: 'gateNumber' },
          { path: 'departureTerminal',select: 'name code' },
        ],
      })
      .lean();

    if (!boardingPass) return next(new AppError('Boarding pass not found.', 404));

    res.json({ success: true, boardingPass });
  } catch (err) { next(err); }
};
