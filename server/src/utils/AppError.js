/**
 * AppError.js
 * Custom operational error class.
 *
 * Usage:
 *   throw new AppError('Flight not found', 404);
 *   throw new AppError('Seat already booked', 409);
 *
 * The centralized errorHandler checks `err.isOperational` to decide
 * whether to send the message to the client or return a generic 500.
 */

class AppError extends Error {
  /**
   * @param {string} message  - Human-readable error message sent to client
   * @param {number} statusCode - HTTP status code (4xx for client, 5xx for server)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // distinguishes from unexpected programming errors

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
