const router = require('express').Router();
const ctrl = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const admins = [ROLES.SUPER_ADMIN, ROLES.AIRPORT_ADMIN, ROLES.AIRLINE_MANAGER];

router.use(protect);
router.get('/', authorize(...admins), ctrl.getAll);
router.get('/:id', authorize(...admins), ctrl.getById);
router.put('/:id', authorize(...admins), ctrl.update);
router.post('/crew/assign', authorize(...admins), ctrl.assignCrew);
router.get('/crew/flight/:flightId', ctrl.getCrewForFlight);
router.post('/attendance', authorize(...admins), ctrl.markAttendance);

module.exports = router;
