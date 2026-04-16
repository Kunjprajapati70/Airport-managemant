/**
 * apiResponse.js
 * Consistent JSON response shape for every API endpoint.
 *
 * Success shape:  { success: true,  message, ...data }
 * Error shape:    { success: false, message, errors? }
 *
 * Controllers should use these helpers instead of calling res.json() directly
 * so the response contract stays uniform across the entire API.
 */

/**
 * Send a successful response.
 * @param {object} res         - Express response object
 * @param {object} [data={}]   - Additional fields merged into the response body
 * @param {string} [message]   - Human-readable success message
 * @param {number} [statusCode=200]
 */
const successResponse = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, ...data });
};

/**
 * Send an error response.
 * @param {object} res          - Express response object
 * @param {string} [message]    - Human-readable error message
 * @param {number} [statusCode=400]
 * @param {Array}  [errors]     - Optional validation error array
 */
const errorResponse = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };
