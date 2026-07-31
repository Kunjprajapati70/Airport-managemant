/**
 * notifications.js (routes)
 * All routes require authentication.
 * Named routes must come before /:id to avoid shadowing.
 */

const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(protect);

// ── Named routes (before /:id) ────────────────────────────────────────────────
router.get('/',              ctrl.getMyNotifications);
router.patch('/read-all',    ctrl.markAllRead);
router.delete('/',           ctrl.clearAll);
router.post('/test',         ctrl.sendTest);
router.post('/broadcast',    authorize(ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN), ctrl.broadcastNotification);

// ── Parameterised routes ──────────────────────────────────────────────────────
router.patch('/:id/read',    ctrl.markRead);
router.delete('/:id',        ctrl.deleteNotification);

module.exports = router;
