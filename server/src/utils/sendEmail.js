/**
 * sendEmail.js
 * Nodemailer wrapper. Failures are logged but never thrown —
 * email is a side-effect and must never break the main request flow.
 *
 * For development: use Mailtrap (https://mailtrap.io) — set SMTP_USER/PASS.
 * For production:  use SendGrid, SES, or Postmark SMTP credentials.
 */

const nodemailer = require('nodemailer');

let cachedTransporter = null;

const getFrom = () => {
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const fromName  = process.env.FROM_NAME  || 'AeroManage';
  return fromEmail ? `"${fromName}" <${fromEmail}>` : undefined;
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE; // optional (e.g., gmail)

  if (!user || !pass) return null;

  cachedTransporter = nodemailer.createTransport({
    ...(service ? { service } : {}),
    ...(host ? { host } : {}),
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
};

/**
 * @param {object} options
 * @param {string}  options.to      - Recipient email address
 * @param {string}  options.subject - Email subject line
 * @param {string}  [options.html]  - HTML body
 * @param {string}  [options.text]  - Plain-text fallback body
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // Skip silently if SMTP credentials are not configured (dev without Mailtrap)
  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [Email skipped — no SMTP config] To: ${to} | Subject: ${subject}`);
    }
    return;
  }

  try {
    const info = await transporter.sendMail({
      from:    getFrom(),
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]+>/g, ''), // strip HTML for plain-text fallback
    });

    console.log(`📧 Email sent → ${to} (messageId: ${info.messageId})`);
  } catch (err) {
    // Log but never throw — email failure must not break the API response
    console.error(`📧 Email failed → ${to}: ${err.message}`);
  }
};

module.exports = sendEmail;
