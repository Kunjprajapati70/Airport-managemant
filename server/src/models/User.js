/**
 * User.js
 * Core authentication model. Every person in the system — passenger, staff,
 * admin — has exactly one User document. Role determines what they can access.
 *
 * Sensitive fields (password, tokens) use `select: false` so they are never
 * accidentally returned in API responses.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },

    // ── Auth ──────────────────────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid role: {VALUE}',
      },
      default: ROLES.PASSENGER,
    },

    // ── Account state ─────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // ── Password reset (select: false — never exposed) ────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ── Email verification token ───────────────────────────────────────────────
    emailVerificationToken: {
      type: String,
      select: false,
    },

    // ── Staff / Manager associations ──────────────────────────────────────────
    // Populated for airline_manager and airline staff
    airline: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Airline',
      default: null,
    },
    // Populated for airport_admin and airport staff
    airport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Airport',
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// email unique index is already declared inline on the field (unique: true)
// Only add compound / non-unique indexes here to avoid duplicate index warnings
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ── Virtual ───────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Pre-save hook: hash password ──────────────────────────────────────────────
// Mongoose 8 async hooks: return a promise, do NOT call next()
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Instance method: compare plain password against hash ──────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
