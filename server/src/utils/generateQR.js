/**
 * generateQR.js
 * Generates a QR code as a base64 PNG data URL.
 * The QR payload contains the minimum data needed to verify a boarding pass at the gate.
 */

const QRCode = require('qrcode');

/**
 * @param {object} data - Object to encode in the QR code
 * @returns {Promise<string|null>} base64 data URL or null on error
 */
const generateQRCode = async (data) => {
  try {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const dataURL = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type:    'image/png',
      quality: 0.95,
      margin:  1,
      width:   300,
      color: {
        dark:  '#000000',
        light: '#ffffff',
      },
    });
    return dataURL;
  } catch (err) {
    console.error('QR generation error:', err.message);
    return null;
  }
};

module.exports = generateQRCode;
