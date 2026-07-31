/**
 * sendEmail.js
 * Nodemailer wrapper. Failures are logged but never thrown —
 * email is a side-effect and must never break the main request flow.
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
      secure: Number(process.env.SMTP_PORT) === 465,
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
      text: text || html?.replace(/<[^>]+>/g, ''),
    });

    console.log(`📧 Email sent → ${to} (messageId: ${info.messageId})`);
  } catch (err) {
    console.error(`📧 Email failed → ${to}: ${err.message}`);
  }
};

module.exports = sendEmail;
