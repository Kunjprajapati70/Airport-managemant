/**
 * checkinController.js
 * Handles the full check-in lifecycle.
 *
 * Endpoints:
 *   POST /api/checkin/:bookingId          - check in a passenger (passenger or staff)
 *   GET  /api/checkin/flight/:flightId    - get all check-ins for a flight (staff)
 *   GET  /api/checkin/booking/:bookingId  - get boarding passes for a booking
 *   GET  /api/checkin/status/:bookingId   - check-in eligibility status
 */

const Booking      = require('../models/Booking');
const Flight       = require('../models/Flight');
const BoardingPass = require('../models/BoardingPass');
const Baggage      = require('../models/Baggage');
const SecurityCheck= require('../models/SecurityCheck');
const Notification = require('../models/Notification');
const AppError     = require('../utils/AppError');
const auditLog     = require('../middleware/auditLogger');
const generateQRCode = require('../utils/generateQR');
const { generateBaggageTag } = require('../utils/generatePNR');
const { emitToUser } = require('../socket');
const {
  NOTIFICATION_TYPES,
  BAGGAGE_ALLOWANCE,
  EXCESS_BAGGAGE_RATE,
} = require('../config/constants');

// ── Shared populate ───────────────────────────────────────────────────────────
const FLIGHT_POPULATE = [
  { path: 'departureAirport',  select: 'name code city' },
  { path: 'arrivalAirport',    select: 'name code city' },
  { path: 'departureGate',     select: 'gateNumber' },
  { path: 'departureTerminal', select: 'name code' },
];

// ── Helper: get next boarding sequence number for a flight ────────────────────
const getNextSequenceNumber = async (flightId) => {
  const last = await BoardingPass.findOne({ flight: flightId })
    .sort({ sequenceNumber: -1 })
    .select('sequenceNumber');
  return (last?.sequenceNumber ?? 0) + 1;
};

// ── POST /api/checkin/:bookingId ──────────────────────────────────────────────
exports.checkIn = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { passengerIndex, baggageItems = [], checkedInBy = 'online' } = req.body;

    // ── 1. Load and validate booking ──────────────────────────────────────────
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'flight', populate: FLIGHT_POPULATE });

    if (!booking) return next(new AppError('Booking not found.', 404));

    // Access control: passenger can only check in their own booking
    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaff = ['super_admin', 'airport_admin', 'checkin_staff'].includes(req.user.role);
    if (!isOwner && !isStaff) return next(new AppError('Not authorized.', 403));

    if (booking.status !== 'confirmed') {
      return next(new AppError(`Cannot check in — booking status is "${booking.status}".`, 400));
    }

    const flight = booking.flight;

    // ── 2. Check-in window validation ─────────────────────────────────────────
    const now = new Date();

    if (!flight.checkInOpenTime || !flight.checkInCloseTime) {
      return next(new AppError('Check-in window not configured for this flight.', 400));
    }

    if (now < new Date(flight.checkInOpenTime)) {
      const opensIn = Math.round((new Date(flight.checkInOpenTime) - now) / 3600000);
      return next(new AppError(
        `Check-in has not opened yet. Opens in approximately ${opensIn} hour(s).`,
        400
      ));
    }

    if (now > new Date(flight.checkInCloseTime)) {
      return next(new AppError(
        'Check-in is closed. Online check-in closes 1 hour before departure.',
        400
      ));
    }

    // ── 3. Validate passenger ─────────────────────────────────────────────────
    const idx = Number(passengerIndex);
    if (isNaN(idx) || idx < 0 || idx >= booking.passengers.length) {
      return next(new AppError('Invalid passenger index.', 400));
    }

    const passenger = booking.passengers[idx];

    if (passenger.checkinStatus === 'checked_in') {
      return next(new AppError(`${passenger.firstName} has already checked in.`, 400));
    }
    if (passenger.checkinStatus === 'boarded') {
      return next(new AppError(`${passenger.firstName} has already boarded.`, 400));
    }
    if (passenger.checkinStatus === 'no_show') {
      return next(new AppError(`${passenger.firstName} is marked as no-show.`, 400));
    }

    // ── 4. Register baggage ───────────────────────────────────────────────────
    const registeredBaggage = [];
    if (baggageItems.length > 0) {
      const allowedWeight = BAGGAGE_ALLOWANCE[passenger.seatClass] ?? 23;
      // Calculate total weight across all items for excess fee
      const totalWeight   = baggageItems.reduce((s, b) => s + (Number(b.weight) || 0), 0);
      const excessWeight  = Math.max(0, totalWeight - allowedWeight);
      const excessFee     = excessWeight * EXCESS_BAGGAGE_RATE;

      for (const item of baggageItems) {
        const bag = await Baggage.create({
          booking:       booking._id,
          flight:        flight._id,
          passenger:     passenger.passenger,
          passengerName: `${passenger.firstName} ${passenger.lastName}`,
          tagNumber:     generateBaggageTag(),
          weight:        Number(item.weight),
          allowedWeight,
          excessWeight:  excessWeight > 0 ? excessWeight : 0,
          excessFee:     excessFee > 0 ? excessFee : 0,
          type:          item.type || 'checked',
          description:   item.description || null,
          color:         item.color || null,
          trackingHistory: [{
            status:    'registered',
            location:  'Check-in Counter',
            timestamp: new Date(),
            notes:     `Checked in by ${req.user.firstName} ${req.user.lastName}`,
          }],
        });
        registeredBaggage.push(bag);
      }
    }

    // ── 5. Create security check record ───────────────────────────────────────
    const existingSecCheck = await SecurityCheck.findOne({
      booking:            booking._id,
      bookingPassengerId: passenger._id,
    });
    if (!existingSecCheck) {
      await SecurityCheck.create({
        booking:            booking._id,
        flight:             flight._id,
        passenger:          passenger.passenger,
        bookingPassengerId: passenger._id,
        passengerName:      `${passenger.firstName} ${passenger.lastName}`,
        status:             'pending',
      });
    }

    // ── 6. Generate QR code ───────────────────────────────────────────────────
    const qrPayload = {
      v:    1,                          // version for future compatibility
      pnr:  booking.pnr,
      fn:   flight.flightNumber,
      pax:  `${passenger.firstName} ${passenger.lastName}`,
      seat: passenger.seatNumber,
      gate: flight.departureGate?.gateNumber || 'TBD',
      bpId: null,                       // filled after boarding pass creation
    };
    const qrCode = await generateQRCode(qrPayload);

    // ── 7. Get boarding sequence number ───────────────────────────────────────
    const sequenceNumber = await getNextSequenceNumber(flight._id);

    // ── 8. Create boarding pass ───────────────────────────────────────────────
    const boardingPass = await BoardingPass.create({
      booking:              booking._id,
      flight:               flight._id,
      passenger:            passenger.passenger,
      bookingPassengerId:   passenger._id,
      passengerName:        `${passenger.firstName} ${passenger.lastName}`,
      pnr:                  booking.pnr,
      seatNumber:           passenger.seatNumber,
      seatClass:            passenger.seatClass,
      gate:                 flight.departureGate?.gateNumber || 'TBD',
      boardingTime:         flight.boardingOpenTime,
      departureTime:        flight.scheduledDeparture,
      flightNumber:         flight.flightNumber,
      departureAirportCode: flight.departureAirport?.code,
      arrivalAirportCode:   flight.arrivalAirport?.code,
      departureAirportName: flight.departureAirport?.name,
      arrivalAirportName:   flight.arrivalAirport?.name,
      qrCode,
      sequenceNumber,
      checkedInBy,
    });

    // Regenerate QR with the boarding pass ID embedded
    const qrPayloadFinal = { ...qrPayload, bpId: boardingPass._id.toString() };
    const qrCodeFinal = await generateQRCode(qrPayloadFinal);
    boardingPass.qrCode = qrCodeFinal;
    await boardingPass.save();

    // ── 9. Update booking passenger status ────────────────────────────────────
    booking.passengers[idx].checkinStatus        = 'checked_in';
    booking.passengers[idx].boardingPassGenerated = true;
    await booking.save();

    // ── 10. Notify passenger ──────────────────────────────────────────────────
    const notif = await Notification.create({
      user:    booking.user,
      type:    NOTIFICATION_TYPES.CHECKIN_OPEN,
      title:   'Check-in Successful ✅',
      message: `${passenger.firstName} is checked in for flight ${flight.flightNumber}. Seat ${passenger.seatNumber} · Gate ${boardingPass.gate}.`,
      booking: booking._id,
      flight:  flight._id,
    });
    emitToUser(booking.user.toString(), 'notification', notif);

    await auditLog(
      req, 'CHECKIN', 'CheckIn', booking._id,
      `Checked in ${passenger.firstName} ${passenger.lastName} for ${flight.flightNumber} (seat ${passenger.seatNumber})`
    );

    res.json({
      success:      true,
      message:      `Check-in successful for ${passenger.firstName} ${passenger.lastName}.`,
      boardingPass,
      baggage:      registeredBaggage,
      sequenceNumber,
    });
  } catch (err) { next(err); }
};

// ── GET /api/checkin/flight/:flightId ─────────────────────────────────────────
exports.getFlightCheckins = async (req, res, next) => {
  try {
    const { flightId } = req.params;

    const bookings = await Booking.find({
      flight: flightId,
      status: { $in: ['confirmed', 'completed'] },
    })
      .populate('user', 'firstName lastName email phone')
      .lean();

    // Build summary
    const summary = { total: 0, checkedIn: 0, notCheckedIn: 0, boarded: 0, noShow: 0 };
    bookings.forEach((b) => {
      b.passengers.forEach((p) => {
        summary.total++;
        if      (p.checkinStatus === 'checked_in')     summary.checkedIn++;
        else if (p.checkinStatus === 'boarded')        summary.boarded++;
        else if (p.checkinStatus === 'no_show')        summary.noShow++;
        else                                           summary.notCheckedIn++;
      });
    });

    res.json({ success: true, bookings, summary });
  } catch (err) { next(err); }
};

// ── GET /api/checkin/booking/:bookingId ───────────────────────────────────────
exports.getBookingBoardingPasses = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).select('user');
    if (!booking) return next(new AppError('Booking not found.', 404));

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaff = ['super_admin', 'airport_admin', 'checkin_staff', 'boarding_staff'].includes(req.user.role);
    if (!isOwner && !isStaff) return next(new AppError('Not authorized.', 403));

    const passes = await BoardingPass.find({ booking: req.params.bookingId })
      .populate({ path: 'flight', populate: FLIGHT_POPULATE })
      .lean();

    res.json({ success: true, boardingPasses: passes });
  } catch (err) { next(err); }
};

// ── GET /api/checkin/status/:bookingId ────────────────────────────────────────
exports.getCheckinStatus = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('flight', 'checkInOpenTime checkInCloseTime boardingOpenTime boardingCloseTime scheduledDeparture status flightNumber')
      .lean();

    if (!booking) return next(new AppError('Booking not found.', 404));

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaff = ['super_admin', 'airport_admin', 'checkin_staff'].includes(req.user.role);
    if (!isOwner && !isStaff) return next(new AppError('Not authorized.', 403));

    const now    = new Date();
    const flight = booking.flight;

    const windowOpen  = flight.checkInOpenTime  ? new Date(flight.checkInOpenTime)  : null;
    const windowClose = flight.checkInCloseTime ? new Date(flight.checkInCloseTime) : null;

    const isOpen = windowOpen && windowClose && now >= windowOpen && now <= windowClose;
    const isEarly = windowOpen && now < windowOpen;
    const isLate  = windowClose && now > windowClose;

    res.json({
      success: true,
      status: {
        bookingStatus:  booking.status,
        flightStatus:   flight.status,
        checkInOpen:    isOpen,
        checkInEarly:   isEarly,
        checkInLate:    isLate,
        windowOpensAt:  windowOpen,
        windowClosesAt: windowClose,
        passengers:     booking.passengers.map((p) => ({
          _id:           p._id,
          name:          `${p.firstName} ${p.lastName}`,
          seatNumber:    p.seatNumber,
          checkinStatus: p.checkinStatus,
          boardingPassGenerated: p.boardingPassGenerated,
        })),
      },
    });
  } catch (err) { next(err); }
};
