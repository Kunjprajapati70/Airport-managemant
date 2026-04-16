/**
 * maintenanceValidators.js
 * express-validator rule arrays for maintenance routes.
 */

const { body } = require('express-validator');
const { MAINTENANCE_STATUS } = require('../config/constants');

// ── Create maintenance log ────────────────────────────────────────────────────
exports.createLogRules = [
  body('aircraft')
    .notEmpty().withMessage('Aircraft is required')
    .isMongoId().withMessage('Invalid aircraft ID'),

  body('type')
    .notEmpty().withMessage('Maintenance type is required')
    .isIn(['routine', 'repair', 'inspection', 'overhaul', 'emergency'])
    .withMessage('Invalid maintenance type'),

  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),

  body('scheduledDate')
    .notEmpty().withMessage('Scheduled date is required')
    .isISO8601().withMessage('Invalid scheduled date'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'critical']).withMessage('Invalid priority'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 }).withMessage('Estimated hours must be a positive number'),

  body('labourCost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Labour cost must be a positive number'),

  body('parts')
    .optional()
    .isArray().withMessage('Parts must be an array'),

  body('parts.*.name')
    .if(body('parts').exists())
    .trim()
    .notEmpty().withMessage('Part name is required'),

  body('parts.*.quantity')
    .if(body('parts').exists())
    .isInt({ min: 1 }).withMessage('Part quantity must be at least 1'),
];

// ── Update maintenance log ────────────────────────────────────────────────────
exports.updateLogRules = [
  body('status')
    .optional()
    .isIn(Object.values(MAINTENANCE_STATUS)).withMessage('Invalid maintenance status'),

  body('actualHours')
    .optional()
    .isFloat({ min: 0 }).withMessage('Actual hours must be a positive number'),

  body('labourCost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Labour cost must be a positive number'),

  body('nextServiceDue')
    .optional()
    .isISO8601().withMessage('Invalid next service date'),
];

// ── Ground aircraft ───────────────────────────────────────────────────────────
exports.groundAircraftRules = [
  body('reason')
    .trim()
    .notEmpty().withMessage('Grounding reason is required')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10–500 characters'),
];
