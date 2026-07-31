/**
 * bookingValidators.js
 * express-validator rule arrays for booking routes.
 */

const { body } = require('express-validator');
const { SEAT_CLASS } = require('../config/constants');

// ── Create booking ────────────────────────────────────────────────────────────
exports.createBookingRules = [
  body('flightId')
    .notEmpty().withMessage('Flight ID is required')
    .isMongoId().withMessage('Invalid flight ID'),

  body('seatClass')
    .notEmpty().withMessage('Seat class is required')
    .isIn(Object.values(SEAT_CLASS)).withMessage('Invalid seat class'),

  body('passengers')
    .isArray({ min: 1, max: 9 }).withMessage('At least 1 passenger required (max 9)'),

  body('passengers.*.firstName')
    .trim().notEmpty().withMessage('Passenger first name is required'),

  body('passengers.*.lastName')
    .trim().notEmpty().withMessage('Passenger last name is required'),

  body('passengers.*.dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date of birth'),

  body('seatNumbers')
    .optional()
    .isArray().withMessage('seatNumbers must be an array'),

  body('paymentMethod')
    .optional()
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'])
    .withMessage('Invalid payment method'),

  body('cardLast4')
    .optional()
    .isLength({ min: 4, max: 4 }).withMessage('Card last 4 must be exactly 4 digits')
    .isNumeric().withMessage('Card last 4 must be numeric'),
];

// ── Cancel booking ────────────────────────────────────────────────────────────
exports.cancelBookingRules = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
];

// ── Reschedule booking ────────────────────────────────────────────────────────
exports.rescheduleBookingRules = [
  body('newFlightId')
    .notEmpty().withMessage('New flight ID is required')
    .isMongoId().withMessage('Invalid flight ID'),
];
