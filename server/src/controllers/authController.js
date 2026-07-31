/**
 * authController.js
 * Handles all authentication flows:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me
 *   PUT  /api/auth/profile
 *   PUT  /api/auth/change-password
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password/:token
 */

const crypto      = require('crypto');
const User        = require('../models/User');
const Passenger   = require('../models/Passenger');
const generateToken = require('../utils/generateToken');
const sendEmail   = require('../utils/sendEmail');
const AppError    = require('../utils/AppError');
const { ROLES }   = require('../config/constants');

// ── Helper: build the safe user payload returned in responses ─────────────────
const userPayload = (user) => ({
  _id:       user._id,
  firstName: user.firstName,
  lastName:  user.lastName,
  email:     user.email,
  role:      user.role,
  phone:     user.phone,
  avatar:    user.avatar,
  isActive:  user.isActive,
  airline:   user.airline,
  airport:   user.airport,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check for existing account
    const existing = await User.findOne({ email });
    if (existing) {
      return next(new AppError('An account with this email already exists.', 409));
    }

    // Create user (password hashed by pre-save hook in User model)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone:  phone || null,
      role:   ROLES.PASSENGER,
    });

    // Auto-create an empty passenger profile linked to this user
    await Passenger.create({ user: user._id });

    // Issue JWT
    const token = generateToken(user._id);

    // Welcome email — fire-and-forget
    sendEmail({
      to:      email,
      subject: 'Welcome to AeroManage ✈️',
      html: `
        <h2>Welcome aboard, ${firstName}!</h2>
        <p>Your AeroManage account has been created successfully.</p>
        <p>You can now search flights, make bookings, and manage your travel.</p>
        <br/>
        <p>Safe travels,<br/>The AeroManage Team</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to AeroManage!',
      token,
      user: userPayload(user),
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user WITH password (select: false by default)
    const user = await User.findOne({ email }).select('+password');

    // Use a single generic message to prevent user enumeration
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // Update last login timestamp (skip full validation)
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userPayload(user),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    // req.user is already attached by protect() middleware
    const user = await User.findById(req.user._id)
      .populate('airline', 'name code logo')
      .populate('airport', 'name code city country');

    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const updates = {};
    if (firstName) updates.firstName = firstName.trim();
    if (lastName)  updates.lastName  = lastName.trim();
    if (phone)     updates.phone     = phone.trim();

    // If a file was uploaded via multer, store the path
    if (req.file) {
      updates.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Profile updated successfully.', user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch with password field
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect.', 400));
    }

    if (currentPassword === newPassword) {
      return next(new AppError('New password must be different from the current password.', 400));
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return 200 to prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate raw token (sent in email) and hashed token (stored in DB)
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    await sendEmail({
      to:      email,
      subject: 'AeroManage — Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset for your AeroManage account.</p>
        <p>Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
        <br/>
        <a href="${resetURL}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <br/><br/>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password/:token ──────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the raw token from the URL to compare with the stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() }, // not expired
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return next(new AppError('Password reset link is invalid or has expired.', 400));
    }

    // Set new password and clear reset fields
    user.password             = password; // hashed by pre-save hook
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};
