/**
 * notificationService.js
 * Central notification factory — creates DB records and emits Socket.IO events.
 *
 * All notification creation goes through this service so the logic is
 * consistent and testable. Controllers call these helpers instead of
 * creating Notification documents directly.
 */

const Notification = require('../models/Notification');
const Booking      = require('../models/Booking');
const User         = require('../models/User');
const { NOTIFICATION_TYPES, BOOKING_STATUS, ROLES } = require('../config/constants');
const { emitToUser, broadcast } = require('../socket');
const sendEmail = require('../utils/sendEmail');

// ── Core helper: create + emit ────────────────────────────────────────────────

/**
 * Create a notification document and emit it via Socket.IO.
 * @returns {object} created notification
 */
const createAndEmit = async ({ userId, type, title, message, priority = 'normal', flightId, bookingId, data }) => {
  const notif = await Notification.create({
    user:     userId,
    type,
    title,
    message,
    priority,
    data:     data || null,
    flight:   flightId  || null,
    booking:  bookingId || null,
  });
  emitToUser(userId.toString(), 'notification', notif);
  return notif;
};

// ── Booking notifications ─────────────────────────────────────────────────────

exports.notifyBookingConfirmed = async (booking, flight, user) => {
  return createAndEmit({
    userId:    user._id,
    type:      NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title:     'Booking Confirmed ✈️',
    message:   `Your booking ${booking.pnr} for flight ${flight.flightNumber} is confirmed. Total: $${booking.totalAmount?.toFixed(2)}.`,
    priority:  'high',
    flightId:  flight._id,
    bookingId: booking._id,
  });
};

exports.notifyBookingCancelled = async (booking, refundAmount, cancellationFee) => {
  const refundMsg = refundAmount > 0
    ? ` Refund of $${refundAmount.toFixed(2)} will be processed within 5–7 business days.`
    : ' No refund applicable.';
  return createAndEmit({
    userId:    booking.user,
    type:      NOTIFICATION_TYPES.BOOKING_CANCELLED,
    title:     'Booking Cancelled',
    message:   `Booking ${booking.pnr} has been cancelled.${refundMsg}`,
    priority:  'high',
    bookingId: booking._id,
  });
};

exports.notifyPaymentSuccess = async (booking, payment) => {
  return createAndEmit({
    userId:    booking.user,
    type:      NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title:     'Payment Successful 💳',
    message:   `Payment of $${payment.amount?.toFixed(2)} for booking ${booking.pnr} was successful. Invoice: ${payment.invoiceNumber}.`,
    priority:  'normal',
    bookingId: booking._id,
    data:      { invoiceNumber: payment.invoiceNumber, transactionId: payment.transactionId },
  });
};

exports.notifyPaymentFailed = async (booking, reason) => {
  return createAndEmit({
    userId:    booking.user,
    type:      NOTIFICATION_TYPES.PAYMENT_FAILED,
    title:     'Payment Failed ⚠️',
    message:   `Payment for booking ${booking.pnr} was declined. ${reason || 'Please try again with a different payment method.'}`,
    priority:  'high',
    bookingId: booking._id,
  });
};

exports.notifyRefundProcessed = async (booking, refundAmount) => {
  return createAndEmit({
    userId:    booking.user,
    type:      NOTIFICATION_TYPES.REFUND_PROCESSED,
    title:     'Refund Processed 💰',
    message:   `A refund of $${refundAmount.toFixed(2)} for booking ${booking.pnr} has been processed. Allow 5–7 business days.`,
    priority:  'normal',
    bookingId: booking._id,
  });
};

// ── Flight notifications ──────────────────────────────────────────────────────

/**
 * Notify all confirmed passengers on a flight.
 * @returns {number} number of passengers notified
 */
exports.notifyFlightPassengers = async (flight, type, title, message, priority = 'high') => {
  try {
    const bookings = await Booking.find({
      flight: flight._id,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] },
    }).select('user pnr _id');

    for (const booking of bookings) {
      await createAndEmit({
        userId:    booking.user,
        type,
        title,
        message,
        priority,
        flightId:  flight._id,
        bookingId: booking._id,
      });
    }
    return bookings.length;
  } catch (err) {
    console.error('notifyFlightPassengers error:', err.message);
    return 0;
  }
};

exports.notifyFlightDelayed = async (flight, delayMinutes, delayReason) => {
  const title   = `Flight ${flight.flightNumber} Delayed ⏰`;
  const message = `Your flight ${flight.flightNumber} has been delayed by ${delayMinutes} minute${delayMinutes !== 1 ? 's' : ''}.${delayReason ? ` Reason: ${delayReason}` : ''}`;
  return exports.notifyFlightPassengers(flight, NOTIFICATION_TYPES.FLIGHT_DELAYED, title, message, 'high');
};

exports.notifyFlightCancelled = async (flight, cancellationReason) => {
  const title   = `Flight ${flight.flightNumber} Cancelled 🚫`;
  const message = `Your flight ${flight.flightNumber} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ' Please contact your airline for rebooking options.'}`;
  return exports.notifyFlightPassengers(flight, NOTIFICATION_TYPES.FLIGHT_CANCELLED, title, message, 'urgent');
};

exports.notifyGateChange = async (flight, newGate) => {
  const title   = `Gate Change — ${flight.flightNumber} 🚪`;
  const message = `The departure gate for flight ${flight.flightNumber} has changed to Gate ${newGate}. Please proceed to the new gate immediately.`;
  return exports.notifyFlightPassengers(flight, NOTIFICATION_TYPES.GATE_CHANGE, title, message, 'urgent');
};

exports.notifyBoardingOpen = async (flight) => {
  const title   = `Boarding Now Open — ${flight.flightNumber} ✈️`;
  const message = `Boarding is now open for flight ${flight.flightNumber}. Please proceed to your gate with your boarding pass.`;
  return exports.notifyFlightPassengers(flight, NOTIFICATION_TYPES.BOARDING_OPEN, title, message, 'high');
};

// ── Check-in / Baggage notifications ─────────────────────────────────────────

exports.notifyCheckinSuccess = async (userId, passengerName, flightNumber, seatNumber, gate, bookingId, flightId) => {
  return createAndEmit({
    userId,
    type:      NOTIFICATION_TYPES.CHECKIN_OPEN,
    title:     'Check-in Successful ✅',
    message:   `${passengerName} is checked in for flight ${flightNumber}. Seat ${seatNumber} · Gate ${gate || 'TBD'}.`,
    priority:  'normal',
    flightId,
    bookingId,
  });
};

exports.notifyBaggageUpdate = async (userId, tagNumber, status, notes, bookingId) => {
  const statusLabels = {
    arrived: 'has arrived at baggage claim',
    claimed: 'has been claimed',
    missing: 'cannot be located — our team is investigating',
    lost:    'has been reported as lost',
  };
  const label = statusLabels[status] ?? `status updated to ${status}`;
  return createAndEmit({
    userId,
    type:      NOTIFICATION_TYPES.BAGGAGE_CLAIM,
    title:     status === 'missing' || status === 'lost' ? '⚠️ Baggage Alert' : '🧳 Baggage Update',
    message:   `Your baggage (${tagNumber}) ${label}.${notes ? ` ${notes}` : ''}`,
    priority:  ['missing', 'lost'].includes(status) ? 'high' : 'normal',
    bookingId,
  });
};

// ── Security notifications ────────────────────────────────────────────────────

exports.notifySecurityCleared = async (userId, passengerName, bookingId, flightId) => {
  return createAndEmit({
    userId,
    type:      NOTIFICATION_TYPES.SECURITY_ALERT,
    title:     'Security Cleared ✅',
    message:   `${passengerName}, your security check is complete. You are cleared to board.`,
    priority:  'normal',
    flightId,
    bookingId,
  });
};

exports.notifySecurityFlagged = async (userId, passengerName, bookingId, flightId) => {
  return createAndEmit({
    userId,
    type:      NOTIFICATION_TYPES.SECURITY_ALERT,
    title:     '⚠️ Security Review Required',
    message:   `${passengerName}, your boarding has been temporarily held for additional security review. Please proceed to the security desk immediately.`,
    priority:  'urgent',
    flightId,
    bookingId,
  });
};

exports.notifySecurityRejected = async (userId, passengerName, bookingId, flightId) => {
  return createAndEmit({
    userId,
    type:      NOTIFICATION_TYPES.SECURITY_ALERT,
    title:     '🚫 Boarding Denied',
    message:   `${passengerName}, you have been denied boarding for this flight. Please contact airport security for assistance.`,
    priority:  'urgent',
    flightId,
    bookingId,
  });
};

// ── Admin / conflict notifications ────────────────────────────────────────────

/**
 * Notify all admin users about an operational conflict or system alert.
 */
exports.notifyAdmins = async ({ type = NOTIFICATION_TYPES.CONFLICT_ALERT, title, message, priority = 'high', flightId, data }) => {
  try {
    const admins = await User.find({
      isActive: true,
      role:     { $in: [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN] },
    }).select('_id');

    for (const admin of admins) {
      await createAndEmit({
        userId:   admin._id,
        type,
        title,
        message,
        priority,
        flightId: flightId || null,
        data:     data || null,
      });
    }
    return admins.length;
  } catch (err) {
    console.error('notifyAdmins error:', err.message);
    return 0;
  }
};

exports.notifyAdminsConflict = async ({ title = 'Operational Conflict Alert 🚨', message, data, flightId }) => {
  return exports.notifyAdmins({
    type:     NOTIFICATION_TYPES.CONFLICT_ALERT,
    title,
    message,
    priority: 'urgent',
    flightId,
    data,
  });
};

exports.notifyMaintenanceDue = async (aircraft) => {
  return exports.notifyAdmins({
    type:     NOTIFICATION_TYPES.MAINTENANCE_DUE,
    title:    `🔧 Maintenance Due — ${aircraft.registrationNumber}`,
    message:  `Aircraft ${aircraft.registrationNumber} (${aircraft.model}) is due for maintenance. Next service: ${aircraft.nextMaintenanceDue ? new Date(aircraft.nextMaintenanceDue).toLocaleDateString() : 'overdue'}.`,
    priority: 'high',
    data:     { aircraftId: aircraft._id, registrationNumber: aircraft.registrationNumber },
  });
};

// ── Build status notification (used by flight controller) ─────────────────────

exports.buildStatusNotification = (flight, newStatus, { delayMinutes, delayReason, cancellationReason, newGate } = {}) => {
  const fn = flight.flightNumber;
  switch (newStatus) {
    case 'delayed':
      return {
        type:    NOTIFICATION_TYPES.FLIGHT_DELAYED,
        title:   `Flight ${fn} Delayed ⏰`,
        message: `Your flight ${fn} has been delayed by ${delayMinutes} minute${delayMinutes !== 1 ? 's' : ''}.${delayReason ? ` Reason: ${delayReason}` : ''}`.trim(),
      };
    case 'cancelled':
      return {
        type:    NOTIFICATION_TYPES.FLIGHT_CANCELLED,
        title:   `Flight ${fn} Cancelled 🚫`,
        message: `Your flight ${fn} has been cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ' Please contact your airline for rebooking options.'}`.trim(),
      };
    case 'boarding':
      return {
        type:    NOTIFICATION_TYPES.BOARDING_OPEN,
        title:   `Boarding Now Open — ${fn} ✈️`,
        message: `Boarding is now open for flight ${fn}. Please proceed to your gate.`,
      };
    case 'gate_change':
      return {
        type:    NOTIFICATION_TYPES.GATE_CHANGE,
        title:   `Gate Change — ${fn} 🚪`,
        message: `The departure gate for flight ${fn} has changed to Gate ${newGate}. Please proceed to the new gate immediately.`,
      };
    default:
      return null;
  }
};
