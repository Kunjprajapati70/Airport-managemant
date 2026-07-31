/**
 * boarding.js (routes)
 */

const router = require('express').Router();
const ctrl   = require('../controllers/boardingController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const BOARDING_ROLES = [
  ROLES.BOARDING_STAFF, ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN,
];

router.use(protect);

// Named routes before /:id
router.post('/scan',                    authorize(...BOARDING_ROLES), ctrl.scanAndBoard);
router.get('/flight/:flightId',         authorize(...BOARDING_ROLES, ROLES.CHECKIN_STAFF), ctrl.getBoardingList);
router.post('/flight/:flightId/close',  authorize(...BOARDING_ROLES), ctrl.closeBoarding);
router.get('/pass/:id/info',            ctrl.getBoardingPassInfo);
router.get('/pass/:id/pdf',             ctrl.downloadBoardingPass);

module.exports = router;
