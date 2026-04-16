/**
 * checkin.js (routes)
 * All routes require authentication.
 */

const router = require('express').Router();
const ctrl   = require('../controllers/checkinController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const CHECKIN_ROLES = [
  ROLES.PASSENGER, ROLES.CHECKIN_STAFF,
  ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN,
];
const STAFF_ROLES = [
  ROLES.CHECKIN_STAFF, ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN,
];

router.use(protect);

// Named routes before parameterised
router.get('/flight/:flightId',   authorize(...STAFF_ROLES),   ctrl.getFlightCheckins);
router.get('/status/:bookingId',  ctrl.getCheckinStatus);
router.get('/booking/:bookingId', ctrl.getBookingBoardingPasses);

// Check-in action
router.post('/:bookingId', authorize(...CHECKIN_ROLES), ctrl.checkIn);

module.exports = router;
