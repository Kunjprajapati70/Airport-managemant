/**
 * securityValidators.js
 * express-validator rule arrays for security routes.
 */

const { body } = require('express-validator');
const { SECURITY_STATUS } = require('../config/constants');

// ── Update security check ─────────────────────────────────────────────────────
exports.updateCheckRules = [
  body('status')
    .optional()
    .isIn(Object.values(SECURITY_STATUS)).withMessage('Invalid security status'),

  body('flagReason')
    .if(body('status').isIn(['flagged', 'rejected']))
    .notEmpty().withMessage('Flag/rejection reason is required when flagging or rejecting'),

  body('documentVerified')
    .optional()
    .isBoolean().withMessage('documentVerified must be boolean'),

  body('baggageCleared')
    .optional()
    .isBoolean().withMessage('baggageCleared must be boolean'),

  body('isWatchlisted')
    .optional()
    .isBoolean().withMessage('isWatchlisted must be boolean'),

  body('watchlistReason')
    .if(body('isWatchlisted').equals('true'))
    .notEmpty().withMessage('Watchlist reason is required when marking as watchlisted'),
];

// ── Log restricted item ───────────────────────────────────────────────────────
exports.restrictedItemRules = [
  body('item')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 200 }).withMessage('Item name too long'),

  body('action')
    .optional()
    .isIn(['confiscated', 'returned', 'allowed', 'escalated'])
    .withMessage('Invalid action'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

// ── Log incident ──────────────────────────────────────────────────────────────
exports.incidentRules = [
  body('type')
    .notEmpty().withMessage('Incident type is required')
    .isIn(['document_issue', 'baggage_issue', 'behaviour', 'watchlist_match', 'other'])
    .withMessage('Invalid incident type'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10–1000 characters'),

  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
];

// ── Boarding override ─────────────────────────────────────────────────────────
exports.overrideRules = [
  body('reason')
    .trim()
    .notEmpty().withMessage('Override reason is required')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10–500 characters'),
];
