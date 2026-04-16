/**
 * baggageValidators.js
 * express-validator rule arrays for baggage routes.
 */

const { body } = require('express-validator');
const { BAGGAGE_STATUS } = require('../config/constants');

// ── Update baggage status ─────────────────────────────────────────────────────
exports.updateStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(Object.values(BAGGAGE_STATUS)).withMessage('Invalid baggage status'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

// ── Report lost baggage ───────────────────────────────────────────────────────
exports.reportLostRules = [
  body('description')
    .notEmpty().withMessage('Description is required')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10–1000 characters'),

  body('lastSeenLocation')
    .optional()
    .trim()
    .isLength({ max: 200 }),
];

// ── File lost baggage complaint ───────────────────────────────────────────────
exports.complaintRules = [
  body('type')
    .notEmpty().withMessage('Complaint type is required')
    .isIn(['lost_baggage', 'damaged_baggage', 'delayed_baggage', 'flight_delay', 'service', 'staff', 'refund', 'other'])
    .withMessage('Invalid complaint type'),

  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 5, max: 200 }).withMessage('Subject must be 5–200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 2000 }).withMessage('Description must be 20–2000 characters'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
];

// ── Mark excess fee paid ──────────────────────────────────────────────────────
exports.markFeePaidRules = [
  body('paymentReference')
    .optional()
    .trim()
    .isLength({ max: 100 }),
];
