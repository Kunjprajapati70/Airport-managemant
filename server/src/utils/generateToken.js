/**
 * generateToken.js
 * Signs a JWT containing the user's MongoDB _id.
 * Expiry is read from JWT_EXPIRE env var (default: 7d).
 */

const jwt = require('jsonwebtoken');

/**
 * @param {string} id - MongoDB ObjectId string
 * @returns {string} Signed JWT
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = generateToken;
