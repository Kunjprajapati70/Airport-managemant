/**
 * authValidators.js
 * express-validator rule arrays for every auth route.
 * Imported directly into the route file and placed before the validate middleware.
 *
 * Pattern:
 *   router.post('/register', registerRules, validate, ctrl.register);
 */

const { body } = require('express-validator');

// ── Register ──────────────────────────────────────────────────────────────────
exports.registerRules = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone().withMessage('Please provide a valid phone number'),
];

// ── Login ─────────────────────────────────────────────────────────────────────
exports.loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ── Change password ───────────────────────────────────────────────────────────
exports.changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number'),
];

// ── Forgot password ───────────────────────────────────────────────────────────
exports.forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

// ── Reset password ────────────────────────────────────────────────────────────
exports.resetPasswordRules = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
];
