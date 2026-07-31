/**
 * generatePNR.js
 * Utility functions for generating unique identifiers used across the system.
 */

/**
 * Generate a 6-character alphanumeric PNR (Passenger Name Record).
 * Example: "A3K9XZ"
 * @returns {string}
 */
const generatePNR = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
};

/**
 * Generate a baggage tag number.
 * Format: BT + last 6 digits of timestamp + 3-digit random
 * Example: "BT7291834052"
 * @returns {string}
 */
const generateBaggageTag = () => {
  const ts   = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BT${ts}${rand}`;
};

/**
 * Generate an invoice number.
 * Format: INV-YYYYMM-NNNNN
 * Example: "INV-202406-04821"
 * @returns {string}
 */
const generateInvoiceNumber = () => {
  const d     = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const rand  = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${year}${month}-${rand}`;
};

/**
 * Generate a staff employee ID.
 * Format: EMP-NNNNN
 * Example: "EMP-04821"
 * @returns {string}
 */
const generateEmployeeId = () => {
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `EMP-${rand}`;
};

module.exports = {
  generatePNR,
  generateBaggageTag,
  generateInvoiceNumber,
  generateEmployeeId,
};
