/**
 * bookingController.js
 * Full booking lifecycle management.
 *
 * Endpoints:
 *   GET  /api/bookings/my           - passenger's own bookings
 *   GET  /api/bookings/all          - admin: all bookings
 *   GET  /api/bookings/:id          - single booking detail
 *   POST /api/bookings              - create booking + process payment
 *   POST /api/bookings/:id/cancel   - cancel with refund calculation
 *   POST /api/bookings/:id/reschedule - move to a different flight
 *   GET  /api/bookings/:id/payment  - payment details for a booking
 *   GET  /api/bookings/:id/invoice  - download invoice PDF
 */

const mongoose  = require('mongoose');
const Booking   = require('../models/Booking');
const Flight    = require('../models/Flight');
const AircraftSeat = require('../models/AircraftSeat');
const Payment   = require('../models/Payment');
const Notification = require('../models/Notification');
const AppError  = require('../utils/AppError');
const auditLog  = require('../middleware/auditLogger');
const { emitToUser } = require('../socket');
const sendEmail = require('../utils/sendEmail');
const {
  generatePNR,
  generateInvoiceNumber,
} = require('../utils/generatePNR');
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPES,
  SEAT_STATUS,
  TAX_RATE,
  SERVICE_FEE_PER_PAX,
  LATE_CANCELLATION_FEE_PCT,
} = require('../config/constants');

// ── Shared populate config ────────────────────────────────────────────────────
const BOOKING_POPULATE = [
  {
    path: 'flight',
    populate: [
      { path: 'departureAirport',  select: 'name code city country timezone' },
      { path: 'arrivalAirport',    select: 'name code city country timezone' },
      { path: 'airline',           select: 'name code logo' },
      { path: 'aircraft',          select: 'registrationNumber model' },
      { path: 'departureGate',     select: 'gateNumber' },
      { path: 'departureTerminal', select: 'name code' },
    ],
  },
  { path: 'user', select: 'firstName lastName email phone' },
];

// ── Helper: assign seats atomically ──────────────────────────────────────────
/**
 * Assigns seats for a booking. If seatNumbers are provided, validates them.
 * Otherwise auto-assigns the first available seats in the requested class.
 * Uses findOneAndUpdate with status check to prevent double-booking.
 *
 * @returns {string[]} assigned seat numbers
 */
const assignSeats = async (aircraftId, seatClass, passengerCount, requestedSeats = []) => {
  const assigned = [];

  if (requestedSeats.length === passengerCount) {
    // Validate and lock each requested seat atomically
    for (const sn of requestedSeats) {
      const seat = await AircraftSeat.findOneAndUpdate(
        { aircraft: aircraftId, seatNumber: sn, class: seatClass, status: SEAT_STATUS.AVAILABLE },
        { status: SEAT_STATUS.BOOKED },
        { new: true }
      );
      if (!seat) {
        // Roll back already-assigned seats
        if (assigned.length > 0) {
          await AircraftSeat.updateMany(
            { aircraft: aircraftId, seatNumber: { $in: assigned } },
            { status: SEAT_STATUS.AVAILABLE }
          );
        }
        throw new AppError(`Seat ${sn} is not available or does not exist in ${seatClass} class.`, 409);
      }
      assigned.push(sn);
    }
  } else {
    // Auto-assign: find and lock seats one by one to prevent race conditions
    const candidates = await AircraftSeat.find({
      aircraft: aircraftId,
      class:    seatClass,
      status:   SEAT_STATUS.AVAILABLE,
    })
      .sort({ row: 1, column: 1 })
      .limit(passengerCount * 3) // fetch extra in case of concurrent bookings
      .lean();

    for (const candidate of candidates) {
      if (assigned.length === passengerCount) break;
      const locked = await AircraftSeat.findOneAndUpdate(
        { _id: candidate._id, status: SEAT_STATUS.AVAILABLE },
        { status: SEAT_STATUS.BOOKED },
        { new: true }
      );
      if (locked) assigned.push(locked.seatNumber);
    }

    if (assigned.length < passengerCount) {
      // Roll back
      if (assigned.length > 0) {
        await AircraftSeat.updateMany(
          { aircraft: aircraftId, seatNumber: { $in: assigned } },
          { status: SEAT_STATUS.AVAILABLE }
        );
      }
      throw new AppError(`Not enough available ${seatClass} seats. Only ${assigned.length} seat(s) could be assigned.`, 409);
    }
  }

  return assigned;
};

// ── Helper: generate unique PNR ───────────────────────────────────────────────
const getUniquePNR = async () => {
  let pnr, attempts = 0;
  do {
    pnr = generatePNR();
    attempts++;
    if (attempts > 20) throw new AppError('Could not generate unique PNR. Please try again.', 500);
  } while (await Booking.exists({ pnr }));
  return pnr;
};

// ── Helper: process mock payment ─────────────────────────────────────────────
const processMockPayment = async (payment, booking, user, flight) => {
  // Simulate 97% success rate
  const success = Math.random() > 0.03;

  if (success) {
    payment.status              = PAYMENT_STATUS.PAID;
    payment.paidAt              = new Date();
    payment.transactionId       = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    payment.gatewayTransactionId = `GW-${Date.now()}`;
    payment.gatewayResponse     = 'approved';
    payment.invoiceNumber       = generateInvoiceNumber();
    await payment.save();

    await Booking.findByIdAndUpdate(booking._id, { status: BOOKING_STATUS.CONFIRMED });

    // Notification
    const notif = await Notification.create({
      user:    user._id,
      type:    NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title:   'Booking Confirmed ✈️',
      message: `Your booking ${booking.pnr} for flight ${flight.flightNumber} is confirmed. Total: $${booking.totalAmount.toFixed(2)}`,
      booking: booking._id,
      flight:  flight._id,
    });
    emitToUser(user._id.toString(), 'notification', notif);

    // Confirmation email
    sendEmail({
      to:      user.email,
      subject: `Booking Confirmed — ${booking.pnr}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#2563eb">Booking Confirmed!</h2>
          <p>Dear ${user.firstName},</p>
          <p>Your booking has been confirmed. Here are your details:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#666">PNR</td><td style="padding:8px;font-weight:bold;font-family:monospace">${booking.pnr}</td></tr>
            <tr><td style="padding:8px;color:#666">Flight</td><td style="padding:8px">${flight.flightNumber}</td></tr>
            <tr><td style="padding:8px;color:#666">Route</td><td style="padding:8px">${flight.departureAirport?.code ?? ''} → ${flight.arrivalAirport?.code ?? ''}</td></tr>
            <tr><td style="padding:8px;color:#666">Passengers</td><td style="padding:8px">${booking.passengers.length}</td></tr>
            <tr><td style="padding:8px;color:#666">Total Paid</td><td style="padding:8px;font-weight:bold">$${booking.totalAmount.toFixed(2)}</td></tr>
            <tr><td style="padding:8px;color:#666">Invoice</td><td style="padding:8px;font-family:monospace">${payment.invoiceNumber}</td></tr>
          </table>
          <p>You can check in online 24 hours before departure.</p>
          <p>Safe travels!<br/>The AeroManage Team</p>
        </div>
      `,
    });

    return { success: true, payment };
  } else {
    payment.status        = PAYMENT_STATUS.FAILED;
    payment.failureReason = 'Payment declined by issuing bank. Please try a different payment method.';
    payment.gatewayResponse = 'declined';
    await payment.save();

    // Roll back booking and seats
    await Booking.findByIdAndUpdate(booking._id, { status: BOOKING_STATUS.CANCELLED });
    const seatNumbers = booking.passengers.map((p) => p.seatNumber).filter(Boolean);
    if (seatNumbers.length) {
      await AircraftSeat.updateMany(
        { aircraft: flight.aircraft, seatNumber: { $in: seatNumbers } },
        { status: SEAT_STATUS.AVAILABLE }
      );
      await Flight.findByIdAndUpdate(flight._id, {
        $inc: { bookedSeats: -seatNumbers.length, availableSeats: seatNumbers.length },
      });
    }

    const notif = await Notification.create({
      user:    user._id,
      type:    NOTIFICATION_TYPES.PAYMENT_FAILED,
      title:   'Payment Failed',
      message: `Payment for booking ${booking.pnr} was declined. Please try again.`,
      booking: booking._id,
    });
    emitToUser(user._id.toString(), 'notification', notif);

    return { success: false, payment };
  }
};

// ── GET /api/bookings/my ──────────────────────────────────────────────────────
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate(BOOKING_POPULATE)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      bookings,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/bookings/all (admin) ─────────────────────────────────────────────
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, flight, user: userId, pnr, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)  query.status = status;
    if (flight)  query.flight = flight;
    if (userId)  query.user   = userId;
    if (pnr)     query.pnr    = pnr.toUpperCase();

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate(BOOKING_POPULATE)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      bookings,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(BOOKING_POPULATE)
      .lean();

    if (!booking) return next(new AppError('Booking not found.', 404));

    // Access control: owner or staff
    const staffRoles = ['super_admin', 'airport_admin', 'checkin_staff', 'boarding_staff', 'baggage_staff', 'security_officer', 'airline_manager'];
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    if (!isOwner && !staffRoles.includes(req.user.role)) {
      return next(new AppError('Not authorized to view this booking.', 403));
    }

    res.json({ success: true, booking });
  } catch (err) { next(err); }
};

// ── POST /api/bookings ────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      flightId,
      passengers,
      seatClass,
      seatNumbers = [],
      paymentMethod = 'credit_card',
      cardLast4,
      cardBrand,
    } = req.body;

    // ── 1. Validate flight ────────────────────────────────────────────────────
    const flight = await Flight.findById(flightId)
      .populate('aircraft', 'totalSeats economySeats businessSeats firstClassSeats')
      .populate('departureAirport', 'code name')
      .populate('arrivalAirport', 'code name');

    if (!flight) return next(new AppError('Flight not found.', 404));

    if (['cancelled', 'arrived', 'diverted'].includes(flight.status)) {
      return next(new AppError(`Cannot book a flight with status "${flight.status}".`, 400));
    }

    const passengerCount = passengers.length;

    // ── 2. Check seat availability ────────────────────────────────────────────
    if (flight.availableSeats < passengerCount) {
      return next(new AppError(
        `Only ${flight.availableSeats} seat(s) available. You requested ${passengerCount}.`,
        409
      ));
    }

    // ── 3. Assign seats (atomic, prevents double-booking) ─────────────────────
    const assignedSeats = await assignSeats(
      flight.aircraft._id,
      seatClass,
      passengerCount,
      seatNumbers
    );

    // ── 4. Calculate pricing ──────────────────────────────────────────────────
    const priceMap = {
      economy:  flight.economyPrice,
      business: flight.businessPrice,
      first:    flight.firstClassPrice,
    };
    const unitPrice  = priceMap[seatClass];
    const basePrice  = unitPrice * passengerCount;
    const taxes      = Math.round(basePrice * TAX_RATE);
    const fees       = SERVICE_FEE_PER_PAX * passengerCount;
    const totalAmount = basePrice + taxes + fees;

    // ── 5. Build passenger list ───────────────────────────────────────────────
    const bookingPassengers = passengers.map((p, i) => ({
      firstName:      p.firstName.trim(),
      lastName:       p.lastName.trim(),
      passportNumber: p.passportNumber || null,
      dateOfBirth:    p.dateOfBirth    || null,
      nationality:    p.nationality    || null,
      mealPreference: p.mealPreference || 'standard',
      specialAssistance: p.specialAssistance || false,
      seatNumber: assignedSeats[i],
      seatClass,
    }));

    // ── 6. Generate PNR ───────────────────────────────────────────────────────
    const pnr = await getUniquePNR();

    // ── 7. Create booking ─────────────────────────────────────────────────────
    const booking = await Booking.create({
      pnr,
      bookingReference: `BK-${Date.now()}`,
      user:       req.user._id,
      flight:     flightId,
      passengers: bookingPassengers,
      seatClass,
      status:     BOOKING_STATUS.PENDING,
      basePrice,
      taxes,
      fees,
      totalAmount,
      source: 'web',
    });

    // ── 8. Update flight seat counts ──────────────────────────────────────────
    await Flight.findByIdAndUpdate(flightId, {
      $inc: { bookedSeats: passengerCount, availableSeats: -passengerCount },
    });

    // ── 9. Create payment record ──────────────────────────────────────────────
    const payment = await Payment.create({
      booking:       booking._id,
      user:          req.user._id,
      amount:        totalAmount,
      paymentMethod,
      cardLast4:     cardLast4 || null,
      cardBrand:     cardBrand || null,
      status:        PAYMENT_STATUS.PENDING,
    });

    await session.commitTransaction();

    // ── 10. Process payment (outside transaction — side effects) ──────────────
    const paymentResult = await processMockPayment(payment, booking, req.user, flight);

    // Reload booking with full population
    const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE).lean();

    await auditLog(
      req, 'CREATE', 'Booking', booking._id,
      `Booking ${pnr} created for flight ${flight.flightNumber} (${passengerCount} pax)`
    );

    res.status(201).json({
      success:        true,
      message:        paymentResult.success ? 'Booking confirmed successfully.' : 'Booking created but payment failed.',
      booking:        populated,
      payment:        paymentResult.payment,
      paymentSuccess: paymentResult.success,
    });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ── POST /api/bookings/:id/cancel ─────────────────────────────────────────────
exports.cancel = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('flight', 'flightNumber scheduledDeparture aircraft status');

    if (!booking) return next(new AppError('Booking not found.', 404));

    // Access control
    const isOwner = booking.user.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'airport_admin', 'checkin_staff'].includes(req.user.role);
    if (!isOwner && !isAdmin) return next(new AppError('Not authorized.', 403));

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return next(new AppError('Booking is already cancelled.', 400));
    }
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return next(new AppError('Cannot cancel a completed booking.', 400));
    }

    // Check if flight already departed
    if (['departed', 'in_flight', 'arrived'].includes(booking.flight.status)) {
      return next(new AppError('Cannot cancel a booking for a flight that has already departed.', 400));
    }

    // ── Cancellation fee calculation ──────────────────────────────────────────
    const hoursUntilDep = (new Date(booking.flight.scheduledDeparture) - new Date()) / 3600000;
    const cancellationFee = hoursUntilDep < 24
      ? Math.round(booking.totalAmount * LATE_CANCELLATION_FEE_PCT)
      : 0;
    const refundAmount = booking.totalAmount - cancellationFee;

    // ── Update booking ────────────────────────────────────────────────────────
    await Booking.findByIdAndUpdate(booking._id, {
      status:             BOOKING_STATUS.CANCELLED,
      cancellationReason: reason || 'Cancelled by passenger',
      cancelledAt:        new Date(),
      cancellationFee,
      refundAmount,
    });

    // ── Free seats ────────────────────────────────────────────────────────────
    const seatNumbers = booking.passengers.map((p) => p.seatNumber).filter(Boolean);
    if (seatNumbers.length) {
      await AircraftSeat.updateMany(
        { aircraft: booking.flight.aircraft, seatNumber: { $in: seatNumbers } },
        { status: SEAT_STATUS.AVAILABLE }
      );
      await Flight.findByIdAndUpdate(booking.flight._id, {
        $inc: { bookedSeats: -seatNumbers.length, availableSeats: seatNumbers.length },
      });
    }

    // ── Process refund ────────────────────────────────────────────────────────
    if (refundAmount > 0) {
      await Payment.findOneAndUpdate(
        { booking: booking._id, status: PAYMENT_STATUS.PAID },
        {
          status:              PAYMENT_STATUS.REFUNDED,
          refundAmount,
          refundedAt:          new Date(),
          refundReason:        reason || 'Booking cancelled',
          refundTransactionId: `REF-${Date.now()}`,
        }
      );
    }

    // ── Notify passenger ──────────────────────────────────────────────────────
    const notif = await Notification.create({
      user:    booking.user,
      type:    NOTIFICATION_TYPES.BOOKING_CANCELLED,
      title:   'Booking Cancelled',
      message: `Booking ${booking.pnr} has been cancelled. ${refundAmount > 0 ? `Refund of $${refundAmount.toFixed(2)} will be processed within 5-7 business days.` : 'No refund applicable.'}`,
      booking: booking._id,
    });
    emitToUser(booking.user.toString(), 'notification', notif);

    if (refundAmount > 0) {
      const refundNotif = await Notification.create({
        user: booking.user,
        type: NOTIFICATION_TYPES.REFUND_PROCESSED,
        title: 'Refund Update',
        message: `Refund of $${refundAmount.toFixed(2)} for booking ${booking.pnr} has been initiated.`,
        booking: booking._id,
        flight: booking.flight._id,
        data: {
          refundAmount,
          cancellationFee,
          status: PAYMENT_STATUS.REFUNDED,
        },
      });
      emitToUser(booking.user.toString(), 'notification', refundNotif);
    }

    await auditLog(req, 'CANCEL', 'Booking', booking._id, `Cancelled booking ${booking.pnr}`);

    res.json({
      success:         true,
      message:         'Booking cancelled successfully.',
      cancellationFee,
      refundAmount,
      pnr:             booking.pnr,
    });
  } catch (err) { next(err); }
};

// ── POST /api/bookings/:id/reschedule ─────────────────────────────────────────
exports.reschedule = async (req, res, next) => {
  try {
    const { newFlightId } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('flight', 'flightNumber scheduledDeparture aircraft status economyPrice businessPrice firstClassPrice');

    if (!booking) return next(new AppError('Booking not found.', 404));

    const isOwner = booking.user.toString() === req.user._id.toString();
    if (!isOwner) return next(new AppError('Not authorized.', 403));

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      return next(new AppError('Only confirmed bookings can be rescheduled.', 400));
    }

    if (newFlightId === booking.flight._id.toString()) {
      return next(new AppError('New flight must be different from the current flight.', 400));
    }

    // Validate new flight
    const newFlight = await Flight.findById(newFlightId)
      .populate('aircraft', 'totalSeats');

    if (!newFlight) return next(new AppError('New flight not found.', 404));
    if (['cancelled', 'arrived', 'diverted'].includes(newFlight.status)) {
      return next(new AppError(`Cannot reschedule to a flight with status "${newFlight.status}".`, 400));
    }

    const passengerCount = booking.passengers.length;
    if (newFlight.availableSeats < passengerCount) {
      return next(new AppError(`New flight only has ${newFlight.availableSeats} seat(s) available.`, 409));
    }

    // ── Assign seats on new flight ────────────────────────────────────────────
    const newSeats = await assignSeats(newFlight.aircraft._id, booking.seatClass, passengerCount);

    // ── Free seats on old flight ──────────────────────────────────────────────
    const oldSeats = booking.passengers.map((p) => p.seatNumber).filter(Boolean);
    if (oldSeats.length) {
      await AircraftSeat.updateMany(
        { aircraft: booking.flight.aircraft, seatNumber: { $in: oldSeats } },
        { status: SEAT_STATUS.AVAILABLE }
      );
      await Flight.findByIdAndUpdate(booking.flight._id, {
        $inc: { bookedSeats: -oldSeats.length, availableSeats: oldSeats.length },
      });
    }

    // ── Update flight seat counts ─────────────────────────────────────────────
    await Flight.findByIdAndUpdate(newFlightId, {
      $inc: { bookedSeats: passengerCount, availableSeats: -passengerCount },
    });

    // ── Recalculate price difference ──────────────────────────────────────────
    const priceMap = { economy: newFlight.economyPrice, business: newFlight.businessPrice, first: newFlight.firstClassPrice };
    const newBasePrice  = priceMap[booking.seatClass] * passengerCount;
    const newTaxes      = Math.round(newBasePrice * TAX_RATE);
    const newFees       = SERVICE_FEE_PER_PAX * passengerCount;
    const newTotal      = newBasePrice + newTaxes + newFees;
    const rescheduleFee = 50 * passengerCount; // flat reschedule fee
    const priceDiff     = newTotal - booking.totalAmount;

    // ── Update booking ────────────────────────────────────────────────────────
    const updatedPassengers = booking.passengers.map((p, i) => ({
      ...p.toObject(),
      seatNumber:   newSeats[i],
      checkinStatus: 'not_checked_in',
      boardingPassGenerated: false,
      securityCleared: false,
    }));

    const updatedBooking = await Booking.findByIdAndUpdate(
      booking._id,
      {
        flight:         newFlightId,
        passengers:     updatedPassengers,
        originalFlight: booking.flight._id,
        rescheduledAt:  new Date(),
        rescheduleFee,
        basePrice:      newBasePrice,
        taxes:          newTaxes,
        fees:           newFees,
        totalAmount:    newTotal,
      },
      { new: true }
    ).populate(BOOKING_POPULATE).lean();

    // Notify
    const notif = await Notification.create({
      user:    booking.user,
      type:    NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title:   'Booking Rescheduled',
      message: `Your booking ${booking.pnr} has been rescheduled to flight ${newFlight.flightNumber}.`,
      booking: booking._id,
      flight:  newFlightId,
    });
    emitToUser(booking.user.toString(), 'notification', notif);

    await auditLog(req, 'RESCHEDULE', 'Booking', booking._id,
      `Rescheduled ${booking.pnr} from ${booking.flight.flightNumber} to ${newFlight.flightNumber}`
    );

    res.json({
      success:        true,
      message:        `Booking rescheduled to flight ${newFlight.flightNumber}.`,
      booking:        updatedBooking,
      rescheduleFee,
      priceDifference: priceDiff,
    });
  } catch (err) { next(err); }
};

// ── GET /api/bookings/:id/payment ─────────────────────────────────────────────
exports.getPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).select('user pnr');
    if (!booking) return next(new AppError('Booking not found.', 404));

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaff = ['super_admin', 'airport_admin'].includes(req.user.role);
    if (!isOwner && !isStaff) return next(new AppError('Not authorized.', 403));

    const payment = await Payment.findOne({ booking: req.params.id }).lean();
    if (!payment) return next(new AppError('Payment record not found.', 404));

    res.json({ success: true, payment });
  } catch (err) { next(err); }
};
