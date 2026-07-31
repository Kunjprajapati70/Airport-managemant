/**
 * sendEmail.js
 * Nodemailer wrapper. Failures are logged but never thrown —
 * email is a side-effect and must never break the main request flow.
 *
 * For development: use Mailtrap (https://mailtrap.io) — set SMTP_USER/PASS.
 * For production:  use SendGrid, SES, or Postmark SMTP credentials.
 */

const nodemailer = require('nodemailer');

/**
 * @param {object} options
 * @param {string}  options.to      - Recipient email address
 * @param {string}  options.subject - Email subject line
 * @param {string}  [options.html]  - HTML body
 * @param {string}  [options.text]  - Plain-text fallback body
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // Skip silently if SMTP credentials are not configured (dev without Mailtrap)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [Email skipped — no SMTP config] To: ${to} | Subject: ${subject}`);
    }
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from:    `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
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
