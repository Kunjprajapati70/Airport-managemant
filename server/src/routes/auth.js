/**
 * auth.js (routes)
 * All authentication endpoints.
 *
 * Public:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password/:token
 *
 * Protected (requires valid JWT):
 *   GET  /api/auth/me
 *   PUT  /api/auth/profile
 *   PUT  /api/auth/change-password
 */

const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const { protect }  = require('../middleware/auth');
const validate     = require('../middleware/validate');
const upload       = require('../middleware/upload');
const {
  registerRules,
  loginRules,
  changePasswordRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../validators/authValidators');

// ── Public routes ─────────────────────────────────────────────────────────────
router.post('/register',       registerRules,       validate, ctrl.register);
router.post('/login',          loginRules,          validate, ctrl.login);
router.post('/forgot-password',forgotPasswordRules, validate, ctrl.forgotPassword);
router.post('/reset-password/:token', resetPasswordRules, validate, ctrl.resetPassword);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get ('/me',              protect, ctrl.getMe);
router.put ('/profile',         protect, upload.single('avatar'), ctrl.updateProfile);
router.put ('/change-password', protect, changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
