/**
 * auth.js
 * Two middleware functions used on every protected route:
 *
 *  1. protect()    — verifies the JWT and attaches req.user
 *  2. authorize()  — checks req.user.role against an allowed-roles list
 *
 * Usage in routes:
 *   router.get('/admin/flights', protect, authorize('super_admin', 'airport_admin'), ctrl.getAll);
 */

const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const AppError = require('../utils/AppError');

// ── 1. protect ────────────────────────────────────────────────────────────────
/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success: attaches the full user document to req.user and calls next().
 * On failure: passes an AppError to the error handler (401).
 */
exports.protect = async (req, res, next) => {
  try {
    // 1a. Extract token from header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized. No token provided.', 401));
    }

    // 1b. Verify signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      // Let the centralized error handler format the JWT-specific message
      return next(jwtErr);
    }

    // 1c. Confirm user still exists and is active
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // 1d. Attach user to request — available in all downstream middleware/controllers
    req.user = user;
    next();

  } catch (err) {
    next(err);
  }
};

// ── 2. authorize ──────────────────────────────────────────────────────────────
/**
 * Factory that returns a middleware checking req.user.role.
 * Must be used AFTER protect().
 *
 * @param {...string} roles - Allowed role strings
 *
 * Example:
 *   authorize('super_admin', 'airport_admin')
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role "${req.user.role}" is not permitted to perform this action.`,
          403
        )
      );
    }

    next();
  };
};
