const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const admins = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN];

router.use(protect, authorize(...admins));
router.get('/analytics', ctrl.getAnalyticsOverview);
router.get('/dashboard', ctrl.getDashboardStats);
router.get('/revenue',   ctrl.getRevenueChart);
router.get('/flights',   ctrl.getFlightStats);
router.get('/audit',     ctrl.getAuditLogs);

module.exports = router;
