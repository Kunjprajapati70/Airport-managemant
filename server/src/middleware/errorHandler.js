/**
 * errorHandler.js
 * Express centralized error-handling middleware (4-argument signature).
 * Must be registered LAST in app.js after all routes.
 *
 * Handles:
 *  - AppError (operational errors thrown intentionally)
 *  - Mongoose CastError (bad ObjectId)
 *  - Mongoose duplicate key (code 11000)
 *  - Mongoose ValidationError
 *  - JWT errors
 *  - Unexpected errors (returns generic 500 in production)
 */

const AppError = require('../utils/AppError');

// ── Mongoose-specific error transformers ──────────────────────────────────────

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: "${err.value}". Please provide a valid ID.`, 400);

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(`Duplicate value "${value}" for field "${field}". Please use a different value.`, 409);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}`, 400);
};

// ── JWT error transformers ────────────────────────────────────────────────────

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

// ── Response senders ─────────────────────────────────────────────────────────

const sendDevError = (err, res) => {
  // In development: send full error details including stack trace
  res.status(err.statusCode).json({
    success:     false,
    status:      err.status,
    message:     err.message,
    stack:       err.stack,
    error:       err,
  });
};

const sendProdError = (err, res) => {
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    // Programming or unknown error: don't leak details
    console.error('💥 UNEXPECTED ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
};

// ── Main error handler ────────────────────────────────────────────────────────

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendDevError(err, res);
  } else {
    // Transform known Mongoose / JWT errors into AppErrors
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;

    if (err.name === 'CastError')       error = handleCastError(err);
    if (err.code === 11000)             error = handleDuplicateKey(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError')  error = handleJWTError();
    if (err.name === 'TokenExpiredError')  error = handleJWTExpiredError();

    sendProdError(error, res);
  }
};

module.exports = errorHandler;
