/**
 * bookings.js (routes)
 * All routes require authentication.
 */

const router   = require('express').Router();
const ctrl     = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBookingRules,
  cancelBookingRules,
  rescheduleBookingRules,
} = require('../validators/bookingValidators');
const { ROLES } = require('../config/constants');

const STAFF = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN, ROLES.CHECKIN_STAFF];

router.use(protect);

// Named routes before /:id
router.get('/my',  ctrl.getMyBookings);
router.get('/all', authorize(...STAFF), ctrl.getAllBookings);

// Parameterised routes
router.get('/:id',         ctrl.getById);
router.get('/:id/payment', ctrl.getPayment);

router.post('/',
  authorize(ROLES.PASSENGER, ...STAFF),
  createBookingRules, validate,
  ctrl.create
);

router.post('/:id/cancel',
  cancelBookingRules, validate,
  ctrl.cancel
);

router.post('/:id/reschedule',
  authorize(ROLES.PASSENGER),
  rescheduleBookingRules, validate,
  ctrl.reschedule
);

module.exports = router;
