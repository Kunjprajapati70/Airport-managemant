/**
 * Payment.js
 * One payment record per booking. Tracks the full payment lifecycle
 * including mock gateway response, refund processing, and invoice number.
 */

const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

    // ── Transaction ───────────────────────────────────────────────────────────
    transactionId: { type: String, unique: true, sparse: true },
    amount:        { type: Number, required: true, min: 0 },
    currency:      { type: String, default: 'USD' },

    status: {
      type:    String,
      enum:    Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },

    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'],
      default: 'credit_card',
    },

    // ── Card details (last 4 only — never store full card numbers) ────────────
    cardLast4: { type: String, default: null },
    cardBrand: { type: String, default: null },

    // ── Gateway ───────────────────────────────────────────────────────────────
    gatewayResponse:      { type: String, default: null },
    gatewayTransactionId: { type: String, default: null },

    paidAt:        { type: Date, default: null },
    failureReason: { type: String, default: null },

    // ── Refund ────────────────────────────────────────────────────────────────
    refundAmount:        { type: Number, default: 0 },
    refundedAt:          { type: Date,   default: null },
    refundReason:        { type: String, default: null },
    refundTransactionId: { type: String, default: null },

    // ── Invoice ───────────────────────────────────────────────────────────────
    invoiceNumber: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
