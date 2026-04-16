const router = require('express').Router();
const ctrl = require('../controllers/passengerController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(protect);
router.get('/me', ctrl.getMyProfile);
router.put('/me', ctrl.updateMyProfile);
router.get('/me/history', ctrl.getTravelHistory);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN, ROLES.CHECKIN_STAFF), ctrl.getAllPassengers);

module.exports = router;
