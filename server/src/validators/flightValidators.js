/**
 * flightValidators.js
 * express-validator rule arrays for flight routes.
 */

const { body, query } = require('express-validator');
const { FLIGHT_STATUS } = require('../config/constants');

// ── Create flight ─────────────────────────────────────────────────────────────
exports.createFlightRules = [
  body('flightNumber')
    .trim()
    .notEmpty().withMessage('Flight number is required')
    .isLength({ min: 2, max: 10 }).withMessage('Flight number must be 2–10 characters')
    .matches(/^[A-Z0-9]+$/i).withMessage('Flight number must be alphanumeric'),

  body('airline')
    .notEmpty().withMessage('Airline is required')
    .isMongoId().withMessage('Invalid airline ID'),

  body('aircraft')
    .notEmpty().withMessage('Aircraft is required')
    .isMongoId().withMessage('Invalid aircraft ID'),

  body('departureAirport')
    .notEmpty().withMessage('Departure airport is required')
    .isMongoId().withMessage('Invalid departure airport ID'),

  body('arrivalAirport')
    .notEmpty().withMessage('Arrival airport is required')
    .isMongoId().withMessage('Invalid arrival airport ID')
    .custom((val, { req }) => {
      if (val === req.body.departureAirport) {
        throw new Error('Departure and arrival airports cannot be the same');
      }
      return true;
    }),

  body('scheduledDeparture')
    .notEmpty().withMessage('Scheduled departure is required')
    .isISO8601().withMessage('Scheduled departure must be a valid date')
    .custom((val) => {
      if (new Date(val) <= new Date()) {
        throw new Error('Scheduled departure must be in the future');
      }
      return true;
    }),

  body('scheduledArrival')
    .notEmpty().withMessage('Scheduled arrival is required')
    .isISO8601().withMessage('Scheduled arrival must be a valid date')
    .custom((val, { req }) => {
      if (new Date(val) <= new Date(req.body.scheduledDeparture)) {
        throw new Error('Scheduled arrival must be after scheduled departure');
      }
      return true;
    }),

  body('economyPrice')
    .notEmpty().withMessage('Economy price is required')
    .isFloat({ min: 0 }).withMessage('Economy price must be a positive number'),

  body('businessPrice')
    .notEmpty().withMessage('Business price is required')
    .isFloat({ min: 0 }).withMessage('Business price must be a positive number'),

  body('firstClassPrice')
    .notEmpty().withMessage('First class price is required')
    .isFloat({ min: 0 }).withMessage('First class price must be a positive number'),

  // Optional resource assignments
  body('departureGate').optional().isMongoId().withMessage('Invalid gate ID'),
  body('arrivalGate').optional().isMongoId().withMessage('Invalid arrival gate ID'),
  body('departureTerminal').optional().isMongoId().withMessage('Invalid terminal ID'),
  body('arrivalTerminal').optional().isMongoId().withMessage('Invalid arrival terminal ID'),
  body('runway').optional().isMongoId().withMessage('Invalid runway ID'),
  body('parkingBay').optional().isMongoId().withMessage('Invalid parking bay ID'),
];

// ── Update flight (all fields optional) ──────────────────────────────────────
exports.updateFlightRules = [
  body('flightNumber').optional().trim()
    .isLength({ min: 2, max: 10 }).withMessage('Flight number must be 2–10 characters'),

  body('scheduledDeparture').optional()
    .isISO8601().withMessage('Scheduled departure must be a valid date'),

  body('scheduledArrival').optional()
    .isISO8601().withMessage('Scheduled arrival must be a valid date'),

  body('economyPrice').optional()
    .isFloat({ min: 0 }).withMessage('Economy price must be a positive number'),

  body('businessPrice').optional()
    .isFloat({ min: 0 }).withMessage('Business price must be a positive number'),

  body('firstClassPrice').optional()
    .isFloat({ min: 0 }).withMessage('First class price must be a positive number'),
];

// ── Update status ─────────────────────────────────────────────────────────────
exports.updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(Object.values(FLIGHT_STATUS)).withMessage('Invalid flight status'),

  body('delayMinutes')
    .if(body('status').equals('delayed'))
    .notEmpty().withMessage('Delay minutes required when status is delayed')
    .isInt({ min: 1 }).withMessage('Delay minutes must be a positive integer'),

  body('delayReason')
    .if(body('status').equals('delayed'))
    .notEmpty().withMessage('Delay reason is required when status is delayed'),

  body('cancellationReason')
    .if(body('status').equals('cancelled'))
    .notEmpty().withMessage('Cancellation reason is required when cancelling a flight'),
];

// ── Search query params ───────────────────────────────────────────────────────
exports.searchFlightRules = [
  query('from').notEmpty().withMessage('Departure airport (from) is required').isMongoId(),
  query('to').notEmpty().withMessage('Arrival airport (to) is required').isMongoId(),
  query('date').notEmpty().withMessage('Date is required').isISO8601(),
  query('passengers').optional().isInt({ min: 1, max: 9 }),
];
